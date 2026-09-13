/* ------------------------------------------------------------------ *
 * 《凡尘问道》存档状态机（Zustand + persist）
 *
 * 乙方交付：分工说明.md「边界 2」的全部动作。
 * 约定：
 *  · UI 只读 state.save、只调 action，不直接改存档；
 *  · 所有引擎（battle / story / realm / idle / breakthrough / loot）都是纯函数，
 *    由本文件负责把它们的返回结果写进存档；
 *  · persist 只持久化 save 字段，战斗实例等运行时对象不落盘。
 * ------------------------------------------------------------------ */

import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

import { MAPS, MONSTER_BY_ID, TREASURE_BY_ID, TECHNIQUE_BY_ID, NPC_BY_ID, getStage, globalToMap } from '../config'
import { rollEquipment } from '../config/equipment'
import { flatStage, nextStage } from '../config/realms'
import {
  LiveBattle,
  findStableStage,
  playerCombatant,
  rollDrops,
  stageReward,
  sweep,
  type EnemyStats,
  type SweepBlocked,
  type SweepResult,
} from '../engine/battle'
import {
  applyBreakthrough,
  breakthroughEnemy,
  canBreakthrough as checkBreakthrough,
  simulateBreakthrough,
  type BreakthroughCheck,
  type BreakthroughOutcome,
} from '../engine/breakthrough'
import { settleIdle, type IdleResult } from '../engine/idle'
import {
  STORAGE_MAX,
  STORAGE_STEP,
  addToInventory,
  applyPity,
  autoEquipBest,
  expandCost,
  materializeDrops,
  salvageValue,
} from '../engine/loot'
import { enterRealm, moveTo, nodeOf, realmById, resolveNode, settleRealm } from '../engine/realm'
import {
  availableStoryNodes,
  choiceEnabled,
  nodeById,
  resolveChoice,
  resolveEffects,
  resolveNodeReward,
  rollEncounter as rollEncounterEngine,
  type EffectBundle,
} from '../engine/story'
import { PILL_BY_ID } from '../config/pills'
import { makeRng, uid } from '../utils'
import {
  QUALITY_ORDER,
  type Drop,
  type EquipInstance,
  type EquipSlotId,
  type GameSave,
  type KarmaKey,
  type LogEntry,
  type MonsterDef,
  type Quality,
  type RealmNode,
  type RealmRun,
  type SimResult,
  type StoryLine,
  type StoryNode,
} from '../types'
import { SAVE_VERSION, STORAGE_KEY, createNewSave, migrateSave } from './defaults'

/* ------------------------------ 常量与工具 ------------------------------ */

export const MAX_STAGE = MAPS.reduce((n, m) => n + m.stages.length, 0)
export const ACTIVE_LOADOUT_FLAG = 'loadout_active'

const clone = <T,>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T)

let pendingPlay = 0

function pushLog(s: GameSave, text: string, kind: LogEntry['kind'] = 'system'): void {
  s.log.push({ id: uid('log'), time: Date.now(), text, kind })
  if (s.log.length > 200) s.log.splice(0, s.log.length - 200)
}

function cultivationMaxOf(s: GameSave): number {
  return flatStage(s.profile.stageId).stage.cultivationMax
}

/** 修为入账并按当前阶段上限封顶（满了就提示突破，不溢出） */
function addCultivation(s: GameSave, amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) return
  const max = cultivationMaxOf(s)
  if (s.profile.cultivation >= max) return
  s.profile.cultivation = Math.min(max, s.profile.cultivation + Math.round(amount))
}

function ensureNpc(s: GameSave, id: string): GameSave['npcs'][string] {
  if (!s.npcs[id]) {
    s.npcs[id] = {
      relation: NPC_BY_ID[id]?.initialRelation ?? 0,
      state: 'initial',
      alive: true,
      lastSeen: 0,
    }
  }
  return s.npcs[id]
}

function markSeen(s: GameSave, nodeId: string): void {
  if (!s.story.seenNodes.includes(nodeId)) s.story.seenNodes.push(nodeId)
  s.story.pending = s.story.pending.filter((id) => id !== nodeId)
}

/** 把 EffectBundle 写进存档（剧情 / 秘境 / 突破共用的唯一入口） */
function applyBundle(s: GameSave, b: EffectBundle, rng: ReturnType<typeof makeRng>): void {
  Object.assign(s.story.flags, b.flags)

  for (const [k, v] of Object.entries(b.karma)) {
    if (typeof v !== 'number') continue
    const key = k as KarmaKey
    s.karma[key] = (s.karma[key] ?? 0) + v
  }

  for (const [id, v] of Object.entries(b.npcRelation)) {
    const npc = ensureNpc(s, id)
    npc.relation += v
    npc.lastSeen = Date.now()
  }

  for (const [id, state] of Object.entries(b.npcState)) {
    const npc = ensureNpc(s, id)
    npc.state = state
    if (state === 'dead' || state === 'dead_by_player') npc.alive = false
  }

  const materials: Record<string, number> = {}
  const pills: Record<string, number> = {}
  for (const it of b.items) {
    const target = it.id.startsWith('pill_') ? pills : materials
    target[it.id] = (target[it.id] ?? 0) + it.count
  }
  for (const p of b.pills) pills[p.id] = (pills[p.id] ?? 0) + p.count

  const rolls: EquipInstance[] = []
  for (const roll of b.equipmentRolls) {
    for (let i = 0; i < roll.count; i++) {
      rolls.push(
        rollEquipment({
          stage: s.progress.stage,
          quality: roll.quality,
          slot: roll.slot,
          rng: () => rng.next(),
        }),
      )
    }
  }

  const added = addToInventory(
    s,
    { equipment: rolls, materials, pills },
    { autoSalvageBelow: s.inventory.autoSalvageBelow },
  )
  s.inventory.items = added.items
  s.resources.stone += added.stone
  for (const [id, n] of Object.entries(added.materials)) {
    s.inventory.materials[id] = (s.inventory.materials[id] ?? 0) + n
  }
  for (const [id, n] of Object.entries(added.pills)) {
    s.inventory.pills[id] = (s.inventory.pills[id] ?? 0) + n
  }

  for (const defId of b.treasureIds) {
    if (!TREASURE_BY_ID[defId]) continue
    if (s.combat.ownedTreasures.some((t) => t.defId === defId)) continue
    s.combat.ownedTreasures.push({ uid: uid('tr'), defId, level: 1, tier: 0, equipped: false })
    autoSlotTreasure(s, defId)
  }
  s.stats.treasuresOwned = s.combat.ownedTreasures.length

  for (const defId of b.techniqueIds) {
    if (!TECHNIQUE_BY_ID[defId]) continue
    if (!s.combat.techniques.some((t) => t.defId === defId)) {
      s.combat.techniques.push({ defId, level: 1 })
    }
    const def = TECHNIQUE_BY_ID[defId]
    if (def.role === 'main' && !s.combat.mainTechnique) s.combat.mainTechnique = defId
  }

  for (const petId of b.petIds) {
    const owned = (s.combat.ownedPets ??= [])
    if (!owned.includes(petId)) owned.push(petId)
    if (!s.combat.pet) s.combat.pet = petId
  }

  for (const key of b.unlocked) {
    s.story.flags[key] = true
    s.story.flags[`unlock_${key}`] = true
  }

  if (b.stone) s.resources.stone += b.stone
  if (b.cultivation) addCultivation(s, b.cultivation)

  for (const line of b.relationsLog) pushLog(s, line, 'story')
  for (const line of b.logs) pushLog(s, line, 'story')
}

/** 新法宝自动上阵：优先空主动槽，其次空被动槽 */
function autoSlotTreasure(s: GameSave, defId: string): void {
  const def = TREASURE_BY_ID[defId]
  if (!def) return
  const slots = def.kind === 'active' ? s.combat.activeTreasures : s.combat.passiveTreasures
  if (slots.includes(defId)) return
  const idx = slots.findIndex((v) => !v)
  if (idx < 0) return
  slots[idx] = defId
  const inst = s.combat.ownedTreasures.find((t) => t.defId === defId)
  if (inst) inst.equipped = true
}

/** 当前关卡及关卡区间内、尚未播放的剧情节点 id（主线挂载 + 奇遇池条件） */
function pendingStoryIds(s: GameSave): string[] {
  const out: string[] = []
  const { stage } = getStage(s.progress.stage)
  if (stage.storyId) out.push(stage.storyId)
  for (const n of availableStoryNodes(s)) out.push(n.id)
  const seen = new Set(s.story.seenNodes)
  return [...new Set(out)].filter((id) => !seen.has(id))
}

/** 秘境战斗的敌人：以当前进度为基准 + 节点怪物倍率（不动关卡表） */
function composedEnemy(s: GameSave, monsterId: string | undefined, mul: number): EnemyStats {
  const anchor = Math.max(1, s.progress.maxStage || s.progress.stage)
  const { map, stage } = getStage(anchor)
  const n = Math.max(0, stage.index - 1)
  const def: MonsterDef = monsterId
    ? (MONSTER_BY_ID[monsterId] ?? fallbackMonster(monsterId))
    : fallbackMonster('realm_foe')
  const hp = Math.max(1, Math.round(map.base.hp * map.growth.hp ** n * (def.hpMul ?? 1.1) * mul))
  const atk = Math.max(
    1,
    Math.round(map.base.atk * map.growth.atk ** n * (def.atkMul ?? 1.1) * (1 + (mul - 1) * 0.35)),
  )
  const dfn = Math.max(0, Math.round(map.base.def * map.growth.def ** n * (def.defMul ?? 1.1)))
  return {
    def,
    name: def.name,
    hp,
    maxHp: hp,
    atk,
    dfn,
    aspd: def.aspd ?? 1,
    crit: def.kind === 'boss' ? 0.12 : 0.08,
    critDmg: 1.6,
    element: def.element,
  }
}

function fallbackMonster(id: string): MonsterDef {
  return {
    id,
    name: '守关妖兽',
    kind: 'normal',
    icon: 'beast',
    element: 'physical',
    hpMul: 1,
    atkMul: 1,
    defMul: 1,
    aspd: 1,
  }
}

function applyBreakthroughOutcome(s: GameSave, outcome: BreakthroughOutcome): void {
  if (outcome.success) {
    for (const m of outcome.consumedMaterials) {
      s.inventory.materials[m.id] = Math.max(0, (s.inventory.materials[m.id] ?? 0) - m.count)
    }
    s.profile.stageId = outcome.toStageId
    s.profile.realmId = flatStage(outcome.toStageId).realm.id
    s.profile.cultivation = 0
    s.profile.weakUntil = undefined
    for (const key of outcome.unlocked) {
      s.story.flags[key] = true
      s.story.flags[`unlock_${key}`] = true
    }
    pushLog(s, outcome.message, 'story')
    const realmName = flatStage(outcome.toStageId).realm.name
    if (flatStage(outcome.toStageId).stage.label === `${realmName}初期`) {
      pushLog(s, `你已踏入${realmName}。`, 'system')
    }
  } else {
    s.profile.weakUntil = outcome.weakUntil ?? Date.now() + 5 * 60 * 1000
    pushLog(s, outcome.message, 'battle')
  }
}

function settleSpoilsOnly(run: RealmRun): EffectBundle {
  const effects = [] as Parameters<typeof resolveEffects>[0]
  if (run.spoils.stone > 0) effects.push({ type: 'give_stone', value: run.spoils.stone })
  if (run.spoils.cultivation > 0) effects.push({ type: 'give_cultivation', value: run.spoils.cultivation })
  for (const id of run.spoils.items) effects.push({ type: 'give_item', key: id, count: 1 })
  const empty = createNewSave()
  return resolveEffects(effects, empty)
}

/* ------------------------------ 类型 ------------------------------ */

export type BattleKind = 'stage' | 'breakthrough' | 'realm'

export interface FinishResult {
  win: boolean
  stage: number
  advancedTo: number | null
  reward: { stone: number; cultivation: number }
  drops: Drop[]
  salvageStone: number
  newItems: EquipInstance[]
  storyPending: string[]
  bagFull: boolean
  failReason?: string
  breakthrough?: BreakthroughOutcome
  realm?: RealmMoveView | null
}

export interface RealmMoveView {
  run: RealmRun
  node: RealmNode
  needBattle: boolean
  finished: boolean
  reward?: EffectBundle
  completed?: EffectBundle
}

export interface BreakthroughResolution {
  check: BreakthroughCheck
  outcome: BreakthroughOutcome
  sim: SimResult | null
}

export interface GameStore {
  save: GameSave
  battle: LiveBattle | null
  battleKind: BattleKind
  battleStage: number
  battleNodeId: string | null
  lastIdle: IdleResult | null
  lastSweep: SweepResult | null
  failReason: string | null

  /* 元操作 */
  reset: () => void
  exportSave: () => string
  importSave: (json: string) => boolean
  addLog: (text: string, kind?: LogEntry['kind']) => void
  tick: (seconds: number) => void
  flushPlayTime: () => void

  /* 战斗与推关 */
  startBattle: (stage?: number) => LiveBattle
  finishBattle: (win: boolean, opts?: { failReason?: string }) => FinishResult
  retreatToStable: () => { stage: number; failReason: string | null }
  sweepStage: (stage?: number, times?: number) => SweepResult | SweepBlocked
  setStage: (stage: number) => boolean
  syncStory: () => string[]

  /* 挂机 */
  claimIdle: (now?: number) => IdleResult

  /* 装备与背包 */
  equip: (uid: string) => boolean
  unequip: (slot: EquipSlotId) => boolean
  salvage: (uid: string) => number
  salvageBatch: (below: Quality) => number
  lockItem: (uid: string, locked: boolean) => boolean
  autoEquip: () => string[]
  enhanceEquip: (uid: string) => boolean
  expandCapacity: () => number
  setAutoSalvage: (q: Quality | 'off') => void
  usePill: (id: string, count?: number) => boolean

  /* 法宝 / 功法 / 灵兽 */
  equipTreasure: (slotIndex: number, defId: string) => boolean
  unequipTreasure: (slotIndex: number) => boolean
  upgradeTreasure: (defId: string) => boolean
  setMainTechnique: (id: string) => boolean
  setSupportTechnique: (index: number, id: string | null) => boolean
  setPet: (id: string | null) => boolean

  /* 突破 */
  canBreakthrough: () => BreakthroughCheck
  doBreakthrough: () => BreakthroughResolution

  /* 剧情与奇遇 */
  submitChoice: (nodeId: string, choiceId: string) => { reply: StoryLine[]; bundle: EffectBundle } | null
  resolveStoryNode: (nodeId: string) => EffectBundle | null
  rollEncounter: () => StoryNode | null
  tickEncounter: (seconds: number) => void
  pushStory: (id: string) => void

  /* 秘境 */
  enterRealm: (id: string) => { run: RealmRun; node: RealmNode } | null
  moveToNode: (nodeId: string) => RealmMoveView | null
  startRealmBattle: (nodeId: string) => LiveBattle | null
  resolveRealmBattle: (nodeId: string, win: boolean) => RealmMoveView | null
  leaveRealm: () => EffectBundle | null

  /* Build 方案 */
  saveLoadoutB: () => void
  switchLoadout: () => boolean

  /* 设置 */
  setAuto: (v: boolean) => void
  setSpeed: (n: number) => void
  setSfx: (v: boolean) => void
  setQuality: (q: GameSave['settings']['quality']) => void
}

/* ------------------------------ store ------------------------------ */

const memoryStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

type LoadoutPart = Pick<
  GameSave['combat'],
  | 'equipment'
  | 'activeTreasures'
  | 'passiveTreasures'
  | 'techniques'
  | 'mainTechnique'
  | 'supportTechniques'
  | 'pet'
>

function snapshotLoadout(c: GameSave['combat']): LoadoutPart {
  return {
    equipment: clone(c.equipment),
    activeTreasures: [...c.activeTreasures],
    passiveTreasures: [...c.passiveTreasures],
    techniques: clone(c.techniques),
    mainTechnique: c.mainTechnique,
    supportTechniques: [...c.supportTechniques],
    pet: c.pet,
  }
}

function applyLoadout(c: GameSave['combat'], part: LoadoutPart): void {
  c.equipment = part.equipment
  c.activeTreasures = part.activeTreasures
  c.passiveTreasures = part.passiveTreasures
  c.techniques = part.techniques
  c.mainTechnique = part.mainTechnique
  c.supportTechniques = part.supportTechniques
  c.pet = part.pet
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      const mutate = (fn: (s: GameSave) => void): void => {
        const next = clone(get().save)
        fn(next)
        next.updatedAt = Date.now()
        set({ save: next })
      }

      return {
        save: createNewSave(),
        battle: null,
        battleKind: 'stage',
        battleStage: 1,
        battleNodeId: null,
        lastIdle: null,
        lastSweep: null,
        failReason: null,

        /* ------------------------------ 元操作 ------------------------------ */

        reset: () => set({ save: createNewSave(), battle: null, lastIdle: null, failReason: null }),

        exportSave: () => JSON.stringify(get().save),

        importSave: (json) => {
          try {
            const raw = JSON.parse(json) as { save?: unknown }
            const candidate = (raw && typeof raw === 'object' && 'save' in raw ? raw.save : raw) as GameSave
            if (!candidate || typeof candidate !== 'object' || !candidate.profile?.stageId) return false
            set({ save: migrateSave(candidate), battle: null })
            return true
          } catch {
            return false
          }
        },

        addLog: (text, kind = 'system') => mutate((s) => pushLog(s, text, kind)),

        tick: (seconds) => {
          if (!Number.isFinite(seconds) || seconds <= 0) return
          pendingPlay += seconds
          if (pendingPlay >= 15) get().flushPlayTime()
        },

        flushPlayTime: () => {
          const add = Math.round(pendingPlay)
          if (add <= 0) return
          pendingPlay = 0
          mutate((s) => {
            s.stats.playTime += add
          })
        },

        /* ------------------------------ 战斗与推关 ------------------------------ */

        startBattle: (stage) => {
          const s = get().save
          const target = stage ?? s.progress.stage
          const lb = new LiveBattle({ save: s, globalStage: target, seed: (Date.now() ^ target * 7919) >>> 0 })
          set({ battle: lb, battleKind: 'stage', battleStage: target, battleNodeId: null, failReason: null })
          return lb
        },

        finishBattle: (win, opts = {}) => {
          const state = get()
          const stage = state.battleStage || state.save.progress.stage
          const kind = state.battleKind
          const nodeId = state.battleNodeId
          const result: FinishResult = {
            win,
            stage,
            advancedTo: null,
            reward: { stone: 0, cultivation: 0 },
            drops: [],
            salvageStone: 0,
            newItems: [],
            storyPending: [],
            bagFull: false,
            failReason: opts.failReason,
          }

          if (kind === 'realm' && nodeId) {
            const view = get().resolveRealmBattle(nodeId, win)
            set({ battle: null, battleKind: 'stage', battleNodeId: null })
            return { ...result, realm: view }
          }

          const s = clone(state.save)
          const rng = makeRng((Date.now() ^ (stage * 2654435761)) >>> 0)

          if (kind === 'breakthrough') {
            const outcome = applyBreakthrough(s, win)
            applyBreakthroughOutcome(s, outcome)
            set({ save: s, battle: null, battleKind: 'stage' })
            return { ...result, advancedTo: null, breakthrough: outcome }
          }

          const p = playerCombatant(s)

          if (win) {
            const { stage: st, monster } = getStage(stage)
            const kindOf = monster?.kind ?? (st.kind === 'elite' ? 'elite' : 'normal')
            const { stone, cultivation } = stageReward(stage)
            const stoneGain = Math.round(stone * (1 + (p.stats.stoneGain ?? 0)))
            const cultGain = Math.round(cultivation)

            const drops = applyPity(s, rollDrops(stage, rng, { dropRate: p.stats.dropRate, rareDropRate: p.stats.rareDropRate }))
            const lb = materializeDrops(s, drops, rng)
            result.newItems = lb.equipment
            result.drops = drops
            const added = addToInventory(s, lb, { autoSalvageBelow: s.inventory.autoSalvageBelow })
            s.inventory.items = added.items
            s.inventory.materials = added.materials
            s.inventory.pills = added.pills
            s.resources.stone += added.stone + stoneGain
            addCultivation(s, cultGain)
            result.reward = { stone: stoneGain + added.stone, cultivation: cultGain }
            result.salvageStone = added.stone
            result.bagFull = added.full

            s.stats.kills += 1
            if (kindOf === 'elite') s.stats.elites += 1
            if (kindOf === 'boss') s.stats.bosses += 1

            s.progress.maxStage = Math.max(s.progress.maxStage, stage)
            s.progress.mapProgress[s.progress.mapId] = Math.max(
              s.progress.mapProgress[s.progress.mapId] ?? 1,
              s.progress.mapStage,
            )
            if (kindOf === 'boss') {
              s.progress.stableStage = findStableStage(s, stage)
            } else {
              s.progress.stableStage = Math.max(s.progress.stableStage, Math.min(stage, s.progress.maxStage))
            }

            const nextGlobal = stage + 1
            if (nextGlobal <= MAX_STAGE) {
              const { mapId, mapStage } = globalToMap(nextGlobal)
              s.progress.stage = nextGlobal
              s.progress.mapId = mapId
              s.progress.mapStage = mapStage
              result.advancedTo = nextGlobal
            } else {
              pushLog(s, '你已走到当前版本的最后一关。', 'system')
            }

            s.story.pending = s.story.pending.filter((id) => !s.story.seenNodes.includes(id))
            for (const id of pendingStoryIds(s)) {
              if (!s.story.pending.includes(id)) s.story.pending.push(id)
            }
            result.storyPending = [...s.story.pending]

            pushLog(
              s,
              kindOf === 'boss'
                ? `斩落「${monster?.name ?? st.name}」，通往下一段路。`
                : `踏破 ${st.name}`,
              'battle',
            )
          } else {
            s.stats.deaths += 1
            s.progress.stableStage = Math.max(1, Math.min(s.progress.stableStage || 1, s.progress.maxStage || 1))
            pushLog(s, `第 ${stage} 关失利${opts.failReason ? `：${opts.failReason}` : ''}`, 'battle')
          }

          set({ save: s, battle: null, battleKind: 'stage', battleNodeId: null, failReason: win ? null : opts.failReason ?? null })
          return result
        },

        retreatToStable: () => {
          const state = get()
          const s = clone(state.save)
          const target = Math.max(1, Math.min(s.progress.stableStage || 1, Math.max(1, s.progress.maxStage)))
          const { mapId, mapStage } = globalToMap(target)
          s.progress.stage = target
          s.progress.mapId = mapId
          s.progress.mapStage = mapStage
          s.progress.stableStage = target
          pushLog(s, `退回稳定刷怪点：第 ${target} 关休整。`, 'system')
          set({ save: s, battle: null })
          return { stage: target, failReason: state.failReason }
        },

        sweepStage: (stage, times = 1) => {
          const s = clone(get().save)
          const target = stage ?? s.progress.stableStage ?? s.progress.stage
          const res = sweep(s, target, times)
          if (!res.ok) return res
          const rng = makeRng((Date.now() ^ (target * 40503)) >>> 0)
          const drops = applyPity(s, res.drops)
          const lb = materializeDrops(s, drops, rng)
          const added = addToInventory(s, lb, { autoSalvageBelow: s.inventory.autoSalvageBelow })
          s.inventory.items = added.items
          s.inventory.materials = added.materials
          s.inventory.pills = added.pills
          s.resources.stone += added.stone + res.stone
          addCultivation(s, res.cultivation)
          s.stats.kills += res.wins
          pushLog(s, `扫荡第 ${target} 关 ×${res.times}：胜 ${res.wins} 场。`, 'reward')
          const settled: SweepResult = {
            ...res,
            stone: res.stone + added.stone,
            drops,
          }
          set({ save: s, lastSweep: settled })
          return settled
        },

        setStage: (stage) => {
          const s = get().save
          const target = Math.floor(stage)
          if (!Number.isFinite(target)) return false
          if (target < 1 || target > Math.max(1, s.progress.maxStage + 1) || target > MAX_STAGE) return false
          mutate((draft) => {
            const { mapId, mapStage } = globalToMap(target)
            draft.progress.stage = target
            draft.progress.mapId = mapId
            draft.progress.mapStage = mapStage
          })
          return true
        },

        syncStory: () => {
          const ids = pendingStoryIds(get().save)
          if (ids.length > 0) {
            mutate((s) => {
              for (const id of ids) if (!s.story.pending.includes(id)) s.story.pending.push(id)
            })
          }
          return ids
        },

        /* ------------------------------ 挂机 ------------------------------ */

        claimIdle: (now = Date.now()) => {
          const s = clone(get().save)
          const rng = makeRng((now ^ 0x5f3759df) >>> 0)
          const res = settleIdle(s, now, rng)
          const lb = materializeDrops(s, res.drops, rng)
          const added = addToInventory(s, lb, { autoSalvageBelow: s.inventory.autoSalvageBelow })
          s.inventory.items = added.items
          s.resources.stone += added.stone + res.stone
          for (const [id, n] of Object.entries(added.materials)) {
            s.inventory.materials[id] = (s.inventory.materials[id] ?? 0) + n
          }
          for (const [id, n] of Object.entries(added.pills)) {
            s.inventory.pills[id] = (s.inventory.pills[id] ?? 0) + n
          }
          for (const [id, n] of Object.entries(res.materials)) {
            s.inventory.materials[id] = (s.inventory.materials[id] ?? 0) + n
          }
          for (const [id, n] of Object.entries(res.pills)) {
            s.inventory.pills[id] = (s.inventory.pills[id] ?? 0) + n
          }
          addCultivation(s, res.cultivation)
          s.idle.lastClaim = now
          if (res.hint) pushLog(s, res.hint, 'story')
          pushLog(s, `领取挂机收益：修为 +${res.cultivation}，灵石 +${res.stone}。`, 'reward')
          set({ save: s, lastIdle: res })
          return res
        },

        /* ------------------------------ 装备与背包 ------------------------------ */

        equip: (id) => {
          const s0 = get().save
          const item = s0.inventory.items.find((i) => i.uid === id)
          if (!item) return false
          mutate((s) => {
            const idx = s.inventory.items.findIndex((i) => i.uid === id)
            if (idx < 0) return
            const next = s.inventory.items[idx]
            const prev = s.combat.equipment[next.slot]
            s.inventory.items.splice(idx, 1)
            if (prev) s.inventory.items.push(prev)
            s.combat.equipment[next.slot] = next
          })
          return true
        },

        unequip: (slot) => {
          const s0 = get().save
          if (!s0.combat.equipment[slot]) return false
          if (s0.inventory.items.length >= s0.inventory.capacity) return false
          mutate((s) => {
            const cur = s.combat.equipment[slot]
            if (!cur) return
            delete s.combat.equipment[slot]
            s.inventory.items.push(cur)
          })
          return true
        },

        salvage: (id) => {
          const s0 = get().save
          const item = s0.inventory.items.find((i) => i.uid === id)
          if (!item || item.locked) return 0
          const gain = salvageValue(item)
          mutate((s) => {
            s.inventory.items = s.inventory.items.filter((i) => i.uid !== id)
            s.resources.stone += gain
          })
          return gain
        },

        salvageBatch: (below) => {
          const s0 = get().save
          const limit = QUALITY_ORDER.indexOf(below)
          if (limit <= 0) return 0
          const targets = s0.inventory.items.filter(
            (i) => !i.locked && QUALITY_ORDER.indexOf(i.quality) < limit,
          )
          if (targets.length === 0) return 0
          const gain = targets.reduce((sum, i) => sum + salvageValue(i), 0)
          const uids = new Set(targets.map((i) => i.uid))
          mutate((s) => {
            s.inventory.items = s.inventory.items.filter((i) => !uids.has(i.uid))
            s.resources.stone += gain
            pushLog(s, `分解 ${targets.length} 件装备，得灵石 ${gain}。`, 'reward')
          })
          return gain
        },

        lockItem: (id, locked) => {
          const s0 = get().save
          const exists =
            s0.inventory.items.some((i) => i.uid === id) ||
            Object.values(s0.combat.equipment).some((e) => e?.uid === id)
          if (!exists) return false
          mutate((s) => {
            const inv = s.inventory.items.find((i) => i.uid === id)
            if (inv) inv.locked = locked
            for (const e of Object.values(s.combat.equipment)) {
              if (e && e.uid === id) e.locked = locked
            }
          })
          return true
        },

        autoEquip: () => {
          const s = get().save
          const { equipment, replaced, changed } = autoEquipBest(s)
          if (changed.length === 0) return []
          mutate((draft) => {
            const equippedUids = new Set(
              Object.values(equipment)
                .filter(Boolean)
                .map((e) => (e as EquipInstance).uid),
            )
            const replacedUids = new Set(replaced.map((e) => e.uid))
            draft.inventory.items = draft.inventory.items.filter(
              (i) => !equippedUids.has(i.uid) && !replacedUids.has(i.uid),
            )
            for (const item of replaced) {
              if (!equippedUids.has(item.uid)) draft.inventory.items.push(item)
            }
            draft.combat.equipment = equipment
            pushLog(draft, `一键穿戴：${changed.join('、')}`, 'reward')
          })
          return changed
        },

        enhanceEquip: (id) => {
          const s0 = get().save
          const item =
            s0.inventory.items.find((i) => i.uid === id) ??
            Object.values(s0.combat.equipment).find((e) => e?.uid === id)
          if (!item || item.enhance >= 15) return false
          const cost = Math.round(24 * (item.enhance + 1) ** 1.55 + item.level * 3)
          if (s0.resources.stone < cost) return false
          mutate((s) => {
            const inv = s.inventory.items.find((i) => i.uid === id)
            if (inv) {
              inv.enhance += 1
              s.resources.stone -= cost
              return
            }
            for (const e of Object.values(s.combat.equipment)) {
              if (e && e.uid === id) {
                e.enhance += 1
                s.resources.stone -= cost
              }
            }
          })
          return true
        },

        expandCapacity: () => {
          const s0 = get().save
          const cost = expandCost(s0)
          if (cost <= 0 || s0.resources.stone < cost) return 0
          mutate((s) => {
            s.resources.stone -= cost
            s.inventory.capacity = Math.min(STORAGE_MAX, s.inventory.capacity + STORAGE_STEP)
            pushLog(s, `背包扩容至 ${s.inventory.capacity}。`, 'system')
          })
          return cost
        },

        setAutoSalvage: (q) => mutate((s) => {
          s.inventory.autoSalvageBelow = q
        }),

        usePill: (id, count = 1) => {
          const s0 = get().save
          const have = s0.inventory.pills[id] ?? 0
          const def = PILL_BY_ID[id]
          if (!def || have < count || count <= 0) return false
          if (def.category !== 'cultivation' || !def.effect.cultivation) {
            // 战斗丹在战斗中自动结算，永久丹后续版本开放（见交付说明）
            return false
          }
          mutate((s) => {
            s.inventory.pills[id] = Math.max(0, (s.inventory.pills[id] ?? 0) - count)
            addCultivation(s, def.effect.cultivation! * count)
            pushLog(s, `服下 ${def.name} ×${count}。`, 'reward')
          })
          return true
        },

        /* ------------------------------ 法宝 / 功法 / 灵兽 ------------------------------ */

        equipTreasure: (slotIndex, defId) => {
          const s0 = get().save
          const inst = s0.combat.ownedTreasures.find((t) => t.defId === defId)
          const def = TREASURE_BY_ID[defId]
          if (!inst || !def) return false
          const slots = def.kind === 'active' ? s0.combat.activeTreasures : s0.combat.passiveTreasures
          if (slotIndex < 0 || slotIndex >= slots.length) return false
          mutate((s) => {
            for (const arr of [s.combat.activeTreasures, s.combat.passiveTreasures]) {
              const at = arr.indexOf(defId)
              if (at >= 0) arr[at] = null
            }
            const target = def.kind === 'active' ? s.combat.activeTreasures : s.combat.passiveTreasures
            target[slotIndex] = defId
            for (const t of s.combat.ownedTreasures) t.equipped = false
            const equipped = new Set(
              [...s.combat.activeTreasures, ...s.combat.passiveTreasures].filter(Boolean) as string[],
            )
            for (const t of s.combat.ownedTreasures) t.equipped = equipped.has(t.defId)
          })
          return true
        },

        unequipTreasure: (slotIndex) => {
          const s0 = get().save
          const inActive = s0.combat.activeTreasures[slotIndex] != null
          const inPassive = s0.combat.passiveTreasures[slotIndex] != null
          if (!inActive && !inPassive) return false
          mutate((s) => {
            if (inActive) s.combat.activeTreasures[slotIndex] = null
            if (inPassive) s.combat.passiveTreasures[slotIndex] = null
            const equipped = new Set(
              [...s.combat.activeTreasures, ...s.combat.passiveTreasures].filter(Boolean) as string[],
            )
            for (const t of s.combat.ownedTreasures) t.equipped = equipped.has(t.defId)
          })
          return true
        },

        upgradeTreasure: (defId) => {
          const s0 = get().save
          const inst = s0.combat.ownedTreasures.find((t) => t.defId === defId)
          if (!inst || inst.level >= 30) return false
          const cost = Math.round(120 * (inst.level + 1) ** 1.4)
          if (s0.resources.stone < cost) return false
          mutate((s) => {
            const t = s.combat.ownedTreasures.find((x) => x.defId === defId)
            if (!t) return
            t.level += 1
            if (t.level % 10 === 0) t.tier += 1
            s.resources.stone -= cost
          })
          return true
        },

        setMainTechnique: (id) => {
          const s0 = get().save
          const def = TECHNIQUE_BY_ID[id]
          if (!def || def.role !== 'main') return false
          if (!s0.combat.techniques.some((t) => t.defId === id)) return false
          mutate((s) => {
            s.combat.mainTechnique = id
            s.combat.supportTechniques = s.combat.supportTechniques.map((x) => (x === id ? null : x))
          })
          return true
        },

        setSupportTechnique: (index, id) => {
          const s0 = get().save
          if (index < 0 || index >= s0.combat.supportTechniques.length) return false
          if (id !== null) {
            const def = TECHNIQUE_BY_ID[id]
            if (!def || def.role !== 'support') return false
            if (!s0.combat.techniques.some((t) => t.defId === id)) return false
            if (s0.combat.mainTechnique === id) return false
          }
          mutate((s) => {
            s.combat.supportTechniques[index] = id
            s.combat.supportTechniques = s.combat.supportTechniques.map((x, i) =>
              x !== null && x === id && i !== index ? null : x,
            )
          })
          return true
        },

        setPet: (id) => {
          const s0 = get().save
          if (id !== null) {
            const owned = s0.combat.ownedPets ?? []
            if (!owned.includes(id)) return false
          }
          mutate((s) => {
            s.combat.pet = id
          })
          return true
        },

        /* ------------------------------ 突破 ------------------------------ */

        canBreakthrough: () => checkBreakthrough(get().save),

        doBreakthrough: () => {
          const s = clone(get().save)
          const check = checkBreakthrough(s)
          if (!check.can) {
            return {
              check,
              sim: null,
              outcome: {
                success: false,
                fromStageId: s.profile.stageId,
                toStageId: s.profile.stageId,
                fromLabel: check.stageLabel,
                toLabel: check.stageLabel,
                realmId: s.profile.realmId,
                consumedMaterials: [],
                unlocked: [],
                weakUntil: null,
                message: `${check.reason ?? '条件不足'}，突破失败。`,
              },
            }
          }
          const sim = simulateBreakthrough(s, makeRng((Date.now() ^ 0x2545f491) >>> 0))
          const outcome = applyBreakthrough(s, sim.win)
          applyBreakthroughOutcome(s, outcome)
          set({ save: s, battle: null })
          return { check, sim, outcome }
        },

        /* ------------------------------ 剧情与奇遇 ------------------------------ */

        submitChoice: (nodeId, choiceId) => {
          const s = clone(get().save)
          const node = nodeById(nodeId)
          const choice = node?.choices?.find((c) => c.id === choiceId)
          if (!node || !choice || !choiceEnabled(choice, s)) return null
          const { bundle, reply } = resolveChoice(choice, s)
          const rng = makeRng((Date.now() ^ nodeId.length * 7919) >>> 0)
          applyBundle(s, bundle, rng)
          if (node.once !== false) markSeen(s, node.id)
          else s.story.pending = s.story.pending.filter((id) => id !== node.id)
          if (node.type === 'encounter') {
            s.stats.encountersDone += 1
            if (!s.story.encounterHistory.includes(node.id)) s.story.encounterHistory.push(node.id)
          }
          s.story.flags[`chose_${node.id}`] = choiceId
          pushLog(s, `【${node.title}】你的选择：${choice.text}`, 'story')
          set({ save: s })
          return { reply, bundle }
        },

        resolveStoryNode: (nodeId) => {
          const s = clone(get().save)
          const node = nodeById(nodeId)
          if (!node) return null
          const rng = makeRng((Date.now() ^ nodeId.length * 40503) >>> 0)
          const bundle = resolveNodeReward(node, s)
          applyBundle(s, bundle, rng)
          if (node.type === 'encounter') {
            s.stats.encountersDone += 1
            if (!s.story.encounterHistory.includes(node.id)) s.story.encounterHistory.push(node.id)
          }
          markSeen(s, node.id)
          pushLog(s, `【${node.title}】`, 'story')
          set({ save: s })
          return bundle
        },

        rollEncounter: () => {
          const s = clone(get().save)
          if (s.story.pending.length >= 2) return null
          const rng = makeRng((Date.now() ^ 0x9e3779b9) >>> 0)
          const node = rollEncounterEngine(s, () => rng.next())
          if (!node) return null
          if (!s.story.pending.includes(node.id)) s.story.pending.push(node.id)
          s.story.encounterCooldown = rng.int(300, 900)
          set({ save: s })
          return node
        },

        tickEncounter: (seconds) => {
          if (!Number.isFinite(seconds) || seconds <= 0) return
          if ((get().save.story.encounterCooldown ?? 0) <= 0) return
          mutate((s) => {
            s.story.encounterCooldown = Math.max(0, s.story.encounterCooldown - seconds)
          })
        },

        pushStory: (id) => {
          if (!nodeById(id)) return
          mutate((s) => {
            if (!s.story.pending.includes(id) && !s.story.seenNodes.includes(id)) s.story.pending.push(id)
          })
        },

        /* ------------------------------ 秘境 ------------------------------ */

        enterRealm: (id) => {
          const res = enterRealm(id)
          if (!res) return null
          mutate((s) => {
            s.realmRun = res.run
            pushLog(s, `踏入秘境：${realmById(id)?.name ?? id}。`, 'story')
          })
          return res
        },

        moveToNode: (nodeId) => {
          const s0 = get().save
          const run = s0.realmRun
          if (!run || !run.active) return null
          const realm = realmById(run.realmId)
          if (!realm) return null
          const moved = moveTo(realm, run, nodeId)
          if (!moved) return null
          const needBattle = ['battle', 'elite', 'boss'].includes(moved.node.kind)
          const s = clone(s0)
          if (needBattle) {
            s.realmRun = moved.run
            set({ save: s })
            return { run: moved.run, node: moved.node, needBattle, finished: moved.finished }
          }
          const rng = makeRng((Date.now() ^ nodeId.length * 2654435761) >>> 0)
          const resolved = resolveNode(realm, moved.run, nodeId, s)
          applyBundle(s, resolved.bundle ?? resolveEffects([], s), rng)
          s.realmRun = resolved.run
          const view: RealmMoveView = {
            run: resolved.run,
            node: resolved.node,
            needBattle: false,
            finished: resolved.finished,
            reward: resolved.bundle,
          }
          if (resolved.finished) view.completed = completeRealm(s)
          set({ save: s })
          return view
        },

        startRealmBattle: (nodeId) => {
          const s = get().save
          const run = s.realmRun
          if (!run) return null
          const realm = realmById(run.realmId)
          const node = realm ? nodeOf(realm, nodeId) : undefined
          if (!realm || !node) return null
          const mul = node.kind === 'boss' ? 2.4 : node.kind === 'elite' ? 1.5 : 1.0
          const enemy = composedEnemy(s, node.monsterId, mul)
          const lb = new LiveBattle({
            save: s,
            globalStage: Math.max(1, s.progress.maxStage || s.progress.stage),
            seed: (Date.now() ^ nodeId.length * 7919) >>> 0,
            enemyOverride: enemy,
          })
          set({ battle: lb, battleKind: 'realm', battleNodeId: nodeId, battleStage: s.progress.stage })
          return lb
        },

        resolveRealmBattle: (nodeId, win) => {
          const s = clone(get().save)
          const run = s.realmRun
          if (!run) return null
          const realm = realmById(run.realmId)
          const node = realm ? nodeOf(realm, nodeId) : undefined
          if (!realm || !node) return null
          if (!win) {
            pushLog(s, `秘境中「${node.name}」失利，你退守原地。`, 'battle')
            set({ save: s, battle: null, battleKind: 'stage', battleNodeId: null })
            return { run, node, needBattle: false, finished: false }
          }
          const rng = makeRng((Date.now() ^ nodeId.length * 40503) >>> 0)
          const resolved = resolveNode(realm, run, nodeId, s)
          applyBundle(s, resolved.bundle ?? resolveEffects([], s), rng)
          s.realmRun = resolved.run
          const view: RealmMoveView = {
            run: resolved.run,
            node: resolved.node,
            needBattle: false,
            finished: resolved.finished,
            reward: resolved.bundle,
          }
          if (resolved.finished) view.completed = completeRealm(s)
          set({ save: s, battle: null, battleKind: 'stage', battleNodeId: null })
          return view
        },

        leaveRealm: () => {
          const s = clone(get().save)
          const run = s.realmRun
          if (!run) return null
          const rng = makeRng((Date.now() ^ 0x1b873593) >>> 0)
          const bundle = settleSpoilsOnly(run)
          applyBundle(s, bundle, rng)
          s.realmRun = null
          pushLog(s, '你带着此行所得离开了秘境。', 'story')
          set({ save: s })
          return bundle
        },

        /* ------------------------------ Build 方案 ------------------------------ */

        saveLoadoutB: () => {
          mutate((s) => {
            s.combat.loadoutB = { ...clone(s.combat), loadoutB: null, ...snapshotLoadout(s.combat) }
            s.story.flags[ACTIVE_LOADOUT_FLAG] = 'B'
            pushLog(s, '当前方案已存为方案 B。', 'system')
          })
        },

        switchLoadout: () => {
          const s0 = get().save
          if (!s0.combat.loadoutB) return false
          mutate((s) => {
            const current = snapshotLoadout(s.combat)
            const other = snapshotLoadout(s.combat.loadoutB as GameSave['combat'])
            applyLoadout(s.combat, other)
            s.combat.loadoutB = { ...clone(s.combat), ...applyLoadoutClone(current) }
            const active = s.story.flags[ACTIVE_LOADOUT_FLAG] === 'B' ? 'A' : 'B'
            s.story.flags[ACTIVE_LOADOUT_FLAG] = active
            pushLog(s, `已切换到方案 ${active}。`, 'system')
          })
          return true
        },

        /* ------------------------------ 设置 ------------------------------ */

        setAuto: (v) => mutate((s) => { s.settings.auto = v }),
        setSpeed: (n) => mutate((s) => { s.settings.speed = Math.min(3, Math.max(1, Math.round(n))) }),
        setSfx: (v) => mutate((s) => { s.settings.sfx = v }),
        setQuality: (q) => mutate((s) => { s.settings.quality = q }),
      }
    },
    {
      name: STORAGE_KEY,
      version: SAVE_VERSION,
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' && window.localStorage ? window.localStorage : memoryStorage,
      ),
      partialize: (state) => ({ save: state.save }) as unknown as GameStore,
      merge: (persisted, current) => {
        const p = persisted as Partial<GameStore> | undefined
        return {
          ...current,
          save: p?.save ? migrateSave(p.save) : current.save,
        }
      },
    },
  ),
)

/* ------------------------------ 秘境完成（模块级，避免自引用） ------------------------------ */

function completeRealm(s: GameSave): EffectBundle {
  const run = s.realmRun
  if (!run) return resolveEffects([], s)
  const realm = realmById(run.realmId)
  if (!realm) return resolveEffects([], s)
  const bundle = settleRealm(realm, run, s)
  const rng = makeRng((Date.now() ^ 0x27d4eb2f) >>> 0)
  applyBundle(s, bundle, rng)
  if (!s.progress.clearedRealms.includes(realm.id)) s.progress.clearedRealms.push(realm.id)
  s.realmRun = null
  pushLog(s, `秘境「${realm.name}」通关。`, 'story')
  return bundle
}

function applyLoadoutClone(part: LoadoutPart): GameSave['combat'] {
  const base = clone(createNewSave().combat)
  applyLoadout(base, part)
  base.loadoutB = null
  return base
}

/* ------------------------------ 选择器（快捷读取） ------------------------------ */

export const selectSave = (s: GameStore) => s.save
export const selectPendingStory = (s: GameStore) => s.save.story.pending
export const selectInBattle = (s: GameStore) => s.battle !== null
