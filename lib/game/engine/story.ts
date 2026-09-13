/* ------------------------------------------------------------------ *
 * 剧情系统引擎
 * 纯函数：只读取 GameSave 快照并返回结果，不修改存档、不依赖 store。
 * 状态写入由调用方（store / 页面）负责。
 * ------------------------------------------------------------------ */

import {
  EQUIP_SLOTS,
  type Condition,
  type Effect,
  type EquipSlotId,
  type GameSave,
  type KarmaKey,
  type Quality,
  type StoryChoice,
  type StoryLine,
  type StoryNode,
} from '../types'
import { STORY_NODES, ENCOUNTERS, STORY_NODE_BY_ID, npcName } from '../config/story'
import { stageIndexOf } from '../config/realms'

/* ------------------------------------------------------------------ *
 * 效果结算结果：需要应用的变更描述
 * ------------------------------------------------------------------ */

export interface EffectBundle {
  flags: Record<string, boolean | number | string>
  karma: Partial<Record<KarmaKey, number>>
  npcRelation: Record<string, number>
  npcState: Record<string, string>
  relationsLog: string[]
  stone: number
  cultivation: number
  /** 材料 */
  items: { id: string; count: number }[]
  /** 丹药 */
  pills: { id: string; count: number }[]
  equipmentRolls: { count: number; quality?: Quality; slot?: EquipSlotId }[]
  treasureIds: string[]
  techniqueIds: string[]
  petIds: string[]
  unlocked: string[]
  logs: string[]
}

export function emptyBundle(): EffectBundle {
  return {
    flags: {},
    karma: {},
    npcRelation: {},
    npcState: {},
    relationsLog: [],
    stone: 0,
    cultivation: 0,
    items: [],
    pills: [],
    equipmentRolls: [],
    treasureIds: [],
    techniqueIds: [],
    petIds: [],
    unlocked: [],
    logs: [],
  }
}

/* ------------------------------------------------------------------ *
 * 条件求值
 * ------------------------------------------------------------------ */

const PILL_PREFIX = 'pill_'

function num(v: Condition['value']): number {
  return typeof v === 'number' ? v : Number(v ?? 0) || 0
}

function flagOf(save: GameSave, key: string | undefined): boolean | number | string | undefined {
  return key ? save.story.flags[key] : undefined
}

/** 持有数量：灵石 / 材料 / 丹药 */
export function ownedCount(save: GameSave, key: string): number {
  if (key === 'stone' || key === 'ling_shi') return save.resources.stone
  if (key === 'immortalJade') return save.resources.immortalJade
  if (key.startsWith(PILL_PREFIX)) return save.inventory.pills[key] ?? 0
  return save.inventory.materials[key] ?? save.inventory.pills[key] ?? 0
}

export function evalCondition(c: Condition, save: GameSave): boolean {
  switch (c.type) {
    case 'stage_gte':
      return save.progress.stage >= num(c.value)
    case 'stage_eq':
      return save.progress.stage === num(c.value)
    case 'flag': {
      const v = flagOf(save, c.key)
      if (c.value === undefined) return Boolean(v)
      if (typeof c.value === 'boolean') return Boolean(v) === c.value
      return v === c.value
    }
    case 'not_flag': {
      const v = flagOf(save, c.key)
      if (c.value === undefined) return !v
      if (typeof c.value === 'boolean') return Boolean(v) !== c.value
      return v !== c.value
    }
    case 'relation_gte':
      return (save.npcs[c.key ?? '']?.relation ?? 0) >= num(c.value)
    case 'realm_gte': {
      const need = String(c.value ?? '')
      if (!need) return true
      return stageIndexOf(save.profile.stageId) >= stageIndexOf(need)
    }
    case 'item':
      return ownedCount(save, String(c.key ?? '')) >= num(c.value)
    case 'karma_gte':
      return (save.karma[c.key as KarmaKey] ?? 0) >= num(c.value)
    case 'level_gte':
      return save.profile.level >= num(c.value)
    default:
      return true
  }
}

export function evalAll(conds: Condition[] | undefined, save: GameSave): boolean {
  if (!conds || conds.length === 0) return true
  return conds.every((c) => evalCondition(c, save))
}

/** 把未满足的条件转成给玩家看的短句 */
export function conditionReason(c: Condition): string {
  switch (c.type) {
    case 'item': {
      const key = String(c.key ?? '')
      const label = key === 'stone' || key === 'ling_shi' ? '灵石' : key.startsWith(PILL_PREFIX) ? '丹药' : '材料'
      return `需${label} ${num(c.value)}`
    }
    case 'relation_gte':
      return `需${npcName(String(c.key ?? ''))}关系 ${num(c.value)}`
    case 'karma_gte':
      return `需因果达到 ${num(c.value)}`
    case 'realm_gte':
      return `需境界 ${String(c.value ?? '')}`
    case 'level_gte':
      return `需等级 ${num(c.value)}`
    case 'stage_gte':
      return `需关卡 ${num(c.value)}`
    case 'stage_eq':
      return `需处于第 ${num(c.value)} 关`
    case 'flag':
      return '条件未满足'
    default:
      return '条件未满足'
  }
}

export function choiceEnabled(
  choice: StoryChoice,
  save: GameSave,
): { enabled: boolean; reason?: string } {
  const reqs = choice.requirements
  if (!reqs || reqs.length === 0) return { enabled: true }
  const failed = reqs.find((r) => !evalCondition(r, save))
  return failed ? { enabled: false, reason: conditionReason(failed) } : { enabled: true }
}

export function choicesFor(
  node: StoryNode,
  save: GameSave,
): { choice: StoryChoice; enabled: boolean; reason?: string }[] {
  return (node.choices ?? []).map((choice) => ({ choice, ...choiceEnabled(choice, save) }))
}

/* ------------------------------------------------------------------ *
 * 触发查询
 * ------------------------------------------------------------------ */

function inStageRange(node: StoryNode, mapStage: number): boolean {
  if (!node.stageRange) return false
  return mapStage >= node.stageRange[0] && mapStage <= node.stageRange[1]
}

/** 一次性节点是否已用掉（含已入队未播放的） */
function consumed(node: StoryNode, save: GameSave): boolean {
  if (!node.once) return false
  return (
    save.story.seenNodes.includes(node.id) ||
    save.story.pending.includes(node.id) ||
    save.story.encounterHistory.includes(node.id)
  )
}

/**
 * 当前关卡可触发的主线节点。
 * stageRange 使用地图内关卡序号（save.progress.mapStage），与地图配置一致。
 */
export function availableStoryNodes(save: GameSave): StoryNode[] {
  const mapStage = save.progress.mapStage
  return STORY_NODES.filter(
    (n) =>
      n.trigger === 'stage' &&
      inStageRange(n, mapStage) &&
      !consumed(n, save) &&
      evalAll(n.conditions, save),
  ).sort((a, b) => (a.stageRange?.[0] ?? 0) - (b.stageRange?.[0] ?? 0))
}

/** 当前关卡可触发的奇遇候选（不含冷却判断） */
export function encounterPool(save: GameSave): StoryNode[] {
  const mapStage = save.progress.mapStage
  return ENCOUNTERS.filter(
    (n) =>
      n.trigger === 'stage' &&
      inStageRange(n, mapStage) &&
      !consumed(n, save) &&
      evalAll(n.conditions, save),
  )
}

/**
 * 从奇遇池按权重抽一个。encounterCooldown > 0 时不触发。
 * rng 可注入以便测试与可重放，缺省用 Math.random。
 */
export function rollEncounter(
  save: GameSave,
  rng: () => number = Math.random,
): StoryNode | null {
  if (save.story.encounterCooldown > 0) return null
  const pool = encounterPool(save)
  if (pool.length === 0) return null

  let total = 0
  for (const n of pool) total += Math.max(0, n.weight ?? 1)
  if (total <= 0) return pool[0]

  let roll = rng() * total
  for (const n of pool) {
    roll -= Math.max(0, n.weight ?? 1)
    if (roll <= 0) return n
  }
  return pool[pool.length - 1]
}

export function nodeById(id: string): StoryNode | undefined {
  return STORY_NODE_BY_ID[id]
}

/* ------------------------------------------------------------------ *
 * 效果结算
 * ------------------------------------------------------------------ */

function addItem(bundle: EffectBundle, id: string, count: number): void {
  if (id.startsWith(PILL_PREFIX)) {
    const hit = bundle.pills.find((p) => p.id === id)
    if (hit) hit.count += count
    else bundle.pills.push({ id, count })
    return
  }
  const hit = bundle.items.find((i) => i.id === id)
  if (hit) hit.count += count
  else bundle.items.push({ id, count })
}

function slotKeyAt(): Set<string> {
  return new Set<string>(EQUIP_SLOTS)
}

const SLOTS = slotKeyAt()

/**
 * 把 Effect[] 折成一个变更包。不写存档，负数立即可见（例如 give_stone 为负即消耗）。
 * 约定：give_item 的 key 以 `pill_` 开头时归入丹药，否则归入材料；
 *       give_equipment 的 key 视为目标部位 id。
 */
export function resolveEffects(effects: Effect[], save: GameSave): EffectBundle {
  const bundle = emptyBundle()

  for (const e of effects) {
    const key = e.key ?? ''
    switch (e.type) {
      case 'flag_set':
        if (key) bundle.flags[key] = e.value ?? true
        break

      case 'karma_add': {
        if (!key) break
        const k = key as KarmaKey
        bundle.karma[k] = (bundle.karma[k] ?? 0) + num(e.value)
        break
      }

      case 'relation_add': {
        if (!key) break
        const delta = num(e.value)
        bundle.npcRelation[key] = (bundle.npcRelation[key] ?? 0) + delta
        const next = (save.npcs[key]?.relation ?? 0) + bundle.npcRelation[key]
        bundle.relationsLog.push(
          `${npcName(key)} ${delta >= 0 ? '+' : ''}${delta}（关系 ${next}）`,
        )
        break
      }

      case 'npc_state':
        if (key) bundle.npcState[key] = String(e.value ?? '')
        break

      case 'give_item':
        if (key) addItem(bundle, key, Math.max(0, e.count ?? 1))
        break

      case 'consume_item':
        if (key) addItem(bundle, key, -Math.max(0, e.count ?? 1))
        break

      case 'give_equipment':
        bundle.equipmentRolls.push({
          count: Math.max(1, e.count ?? 1),
          quality: e.quality,
          slot: SLOTS.has(key) ? (key as EquipSlotId) : undefined,
        })
        break

      case 'give_treasure':
        if (key) bundle.treasureIds.push(key)
        break

      case 'give_technique':
        if (key) bundle.techniqueIds.push(key)
        break

      case 'give_pet':
        if (key) bundle.petIds.push(key)
        break

      case 'give_stone':
        bundle.stone += num(e.value)
        break

      case 'give_cultivation':
        bundle.cultivation += num(e.value)
        break

      case 'unlock':
        if (key) bundle.unlocked.push(key)
        break

      case 'log':
        if (e.value !== undefined) bundle.logs.push(String(e.value))
        break

      default:
        break
    }
  }

  return bundle
}

/** 结算节点的固定奖励 */
export function resolveNodeReward(node: StoryNode, save: GameSave): EffectBundle {
  return resolveEffects(node.reward ?? [], save)
}

/** 结算某个选择（含追加台词的收集），供调用方一次性写入 */
export function resolveChoice(
  choice: StoryChoice,
  save: GameSave,
): { bundle: EffectBundle; reply: StoryLine[] } {
  return { bundle: resolveEffects(choice.effects, save), reply: choice.reply ?? [] }
}

/** 选择是否会产生实际影响（用于排查假选择） */
export function hasImpact(choice: StoryChoice): boolean {
  return choice.effects.some((e) => e.type !== 'log')
}
