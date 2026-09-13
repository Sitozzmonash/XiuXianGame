/* ------------------------------------------------------------------ *
 * 战斗引擎（纯逻辑，不依赖 React / store）
 * 支持两种模式：
 *  1. simulate() —— 离线快速模拟（扫荡、平衡测试、稳定刷怪点判定）
 *  2. LiveBattle —— 逐帧驱动，产出 BattleEvent 供表现层消费
 * ------------------------------------------------------------------ */

import {
  TREASURE_BY_ID,
  TECHNIQUE_BY_ID,
  PET_BY_ID,
  getStage,
  monsterStats,
  flatStage,
} from '../config'
import {
  ZERO_STATS,
  type BattleEvent,
  type Drop,
  type GameSave,
  type Quality,
  type LiveBattleState,
  type MonsterDef,
  type SimOptions,
  type SimResult,
  type Stats,
  type TreasureDef,
} from '../types'
import { makeRng, mergeStats, scaleStats, type Rng } from '../utils'

/* ------------------------------ 玩家属性 ------------------------------ */

const BASE_HP = 620
const BASE_ATK = 78
const BASE_DEF = 34
const BASE_ASPD = 1.05
const BASE_CRIT = 0.05
const BASE_CRIT_DMG = 1.5
const BASE_HIT = 0.92
const BASE_EVA = 0.03

/** 境界阶段的线性成长系数 */
function stageScale(stageId: string): number {
  return 1 + flatStage(stageId).index * 0.22
}

export interface CombatantStats {
  stats: Stats
  maxHp: number
  skills: TreasureDef[]
  passives: TreasureDef[]
  petSkill: { scale: number; cooldown: number; cast: string; damageType: string } | null
  treasureLevels: Record<string, { level: number; tier: number }>
}

export function playerCombatant(save: GameSave): CombatantStats {
  const realm = flatStage(save.profile.stageId).realm
  const scale = stageScale(save.profile.stageId)
  const rMul = realm.multiplier

  const base: Stats = {
    ...ZERO_STATS,
    hp: BASE_HP * scale * rMul,
    atk: BASE_ATK * scale * Math.sqrt(rMul),
    def: BASE_DEF * scale * Math.sqrt(rMul),
    aspd: BASE_ASPD,
    crit: BASE_CRIT,
    critDmg: BASE_CRIT_DMG,
    hit: BASE_HIT,
    eva: BASE_EVA,
  }

  const parts: Partial<Stats>[] = [base]

  for (const eq of Object.values(save.combat.equipment)) {
    if (!eq) continue
    parts.push(scaleStats(eq.stats, 1 + eq.enhance * 0.08))
    for (const af of eq.affixes) parts.push(af.stats)
  }

  const techIds = [save.combat.mainTechnique, ...save.combat.supportTechniques].filter(
    Boolean,
  ) as string[]
  for (const id of techIds) {
    const prog = save.combat.techniques.find((t) => t.defId === id)
    const def = TECHNIQUE_BY_ID[id]
    if (!prog || !def) continue
    parts.push(scaleStats(def.perLevel, prog.level))
  }

  if (save.combat.pet) {
    const pet = PET_BY_ID[save.combat.pet]
    if (pet) parts.push(pet.passive)
  }

  parts.push(spiritRootBonus(save))

  const stats = mergeStats(...parts)

  const treasureLevels: Record<string, { level: number; tier: number }> = {}
  for (const t of save.combat.ownedTreasures) {
    treasureLevels[t.defId] = { level: t.level, tier: t.tier }
  }

  const skills = save.combat.activeTreasures
    .filter(Boolean)
    .map((id) => TREASURE_BY_ID[id as string])
    .filter(Boolean) as TreasureDef[]

  const passives = save.combat.passiveTreasures
    .filter(Boolean)
    .map((id) => TREASURE_BY_ID[id as string])
    .filter(Boolean) as TreasureDef[]

  const petDef = save.combat.pet ? PET_BY_ID[save.combat.pet] : null

  return {
    stats,
    maxHp: stats.hp,
    skills,
    passives,
    petSkill: petDef
      ? {
          scale: petDef.skill.scale,
          cooldown: petDef.skill.cooldown,
          cast: petDef.skill.cast,
          damageType: petDef.skill.damageType,
        }
      : null,
    treasureLevels,
  }
}

function spiritRootBonus(save: GameSave): Partial<Stats> {
  const out: Partial<Stats> = {}
  const map: Record<string, keyof Stats> = {
    metal: 'metalDmg',
    wood: 'woodDmg',
    water: 'waterDmg',
    fire: 'fireDmg',
    earth: 'earthDmg',
  }
  for (const [el, w] of Object.entries(save.profile.spiritRoot.elements)) {
    const key = map[el]
    if (key && typeof w === 'number') out[key] = (out[key] ?? 0) + w * 0.04
  }
  return out
}

function treasureScale(def: TreasureDef, levels: CombatantStats['treasureLevels']): number {
  const inst = levels[def.id]
  if (!inst) return def.scale
  return def.scale * (1 + inst.level * 0.035) * (1 + inst.tier * 0.12)
}

/* ------------------------------ 敌人 ------------------------------ */

export interface EnemyStats {
  def: MonsterDef
  name: string
  hp: number
  maxHp: number
  atk: number
  dfn: number
  aspd: number
  crit: number
  critDmg: number
  element: string
}

export function enemyFor(globalStage: number): EnemyStats {
  const { stage, monster } = getStage(globalStage)
  const s = monsterStats(globalStage)
  const m: MonsterDef = monster ?? {
    id: 'fallback',
    name: stage.name,
    kind: 'normal',
    icon: 'spirit',
    element: 'physical',
    hpMul: 1,
    atkMul: 1,
    defMul: 1,
    aspd: 1,
  }
  return {
    def: m,
    name: m.name,
    hp: s.hp,
    maxHp: s.hp,
    atk: s.atk,
    dfn: s.def,
    aspd: s.aspd,
    crit: s.crit,
    critDmg: s.critDmg,
    element: m.element,
  }
}

/* ------------------------------ 伤害公式 ------------------------------ */

export function damage(
  atk: number,
  scale: number,
  defense: number,
  defenseConstant: number,
  crit: number,
  critDmg: number,
  rng: Rng,
  extra: { pen?: number; dmgBonus?: number } = {},
): { value: number; crit: boolean } {
  const effDef = defense * (1 - (extra.pen ?? 0))
  const reduction = effDef / (effDef + defenseConstant)
  let value = atk * scale * (1 - reduction)
  const isCrit = rng.chance(crit)
  if (isCrit) value *= critDmg
  value *= 1 + (extra.dmgBonus ?? 0)
  return { value: Math.max(1, Math.round(value)), crit: isCrit }
}

function bossBonus(s: Stats, kind: MonsterDef['kind']): number {
  if (kind === 'boss') return s.bossDmg
  if (kind === 'elite') return s.eliteDmg
  return 0
}

function elementBonus(s: Stats, type: string): number {
  switch (type) {
    case 'metal':
      return s.metalDmg
    case 'wood':
      return s.woodDmg
    case 'water':
      return s.waterDmg
    case 'fire':
      return s.fireDmg
    case 'earth':
      return s.earthDmg
    default:
      return 0
  }
}

function castToFx(cast: string, type: string): BattleEvent['fx'] {
  if (cast === 'projectile') return 'sword'
  if (cast === 'aoe') return 'burst'
  if (cast === 'dot') return 'soul'
  if (cast === 'summon') return 'soul'
  switch (type) {
    case 'fire':
      return 'fire'
    case 'water':
      return 'water'
    case 'wood':
      return 'wood'
    case 'earth':
      return 'earth'
    case 'metal':
      return 'thunder'
    case 'soul':
      return 'soul'
    default:
      return 'slash'
  }
}

/** 失败原因分析：只提示问题方向，不给唯一答案（PRD 47 章） */
function analyzeFailure(
  p: CombatantStats,
  e: EnemyStats,
  playerDamage: number,
  duration: number,
): string {
  if (duration < 8) return '生存严重不足 —— 敌方爆发太高，考虑提升生命或减伤'
  if (e.dfn > p.stats.atk * 1.6) return '破甲不足 —— 敌方防御过高，考虑穿透或破甲词条'
  if (e.def.bossMechanics?.includes('shield') && playerDamage / duration < e.maxHp / 60)
    return '爆发不足 —— Boss 护盾回充快于你的输出'
  if (e.def.bossMechanics?.includes('resist')) return '受到元素克制 —— 换一种伤害属性试试'
  if (e.def.bossMechanics?.includes('control')) return '控制抗性不足 —— 被控期间损失大量输出'
  if (p.stats.dmgReduction < 0.1) return '减伤不足 —— 考虑堆叠护甲与减伤'
  return '输出与生存都不足 —— 建议强化装备或调整 Build'
}

function hashStage(stage: number): number {
  let h = 2166136261
  const s = String(stage)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/* ------------------------------ 掉落 ------------------------------ */

/**
 * 关卡的掉落结算。Boss 关必出装备；每 10 关小 Boss 概率出法宝碎片。
 * bossFirstKill 时额外给突破 / 剧情物品（由调用方决定是否首杀）。
 */
export function rollDrops(
  globalStage: number,
  rng: Rng,
  bonus: { dropRate?: number; rareDropRate?: number } = {},
): Drop[] {
  const { stage, monster } = getStage(globalStage)
  const kind = monster?.kind ?? (stage.kind === 'elite' ? 'elite' : 'normal')
  const drops: Drop[] = []
  const dropRate = 1 + (bonus.dropRate ?? 0)

  const equipCount =
    kind === 'boss' ? 2 + (rng.chance(0.4 * dropRate) ? 1 : 0) : kind === 'elite' ? 1 : rng.chance(0.34 * dropRate) ? 1 : 0
  for (let i = 0; i < equipCount; i++) {
    const q = rollDropQuality(globalStage, kind, rng, bonus.rareDropRate ?? 0)
    drops.push({
      kind: 'equipment',
      quality: q,
      count: 1,
      label: '装备',
    })
  }

  const matCount = kind === 'boss' ? rng.int(2, 4) : kind === 'elite' ? rng.int(1, 3) : rng.chance(0.4) ? 1 : 0
  if (matCount > 0) {
    drops.push({ kind: 'material', count: matCount, label: '炼器材料' })
  }

  if (kind === 'boss' && rng.chance(0.55)) {
    drops.push({ kind: 'treasure', count: 1, label: '法宝碎片' })
  }
  if (kind === 'boss' && rng.chance(0.35)) {
    drops.push({ kind: 'pill', count: rng.int(1, 2), label: '丹药' })
  }
  return drops
}

function rollDropQuality(globalStage: number, kind: string, rng: Rng, rareBonus: number): Quality {
  const tier = globalStage / 200
  const boss = kind === 'boss'
  const elite = kind === 'elite'
  const weights: [Quality, number][] = [
    ['white', 34 - tier * 20],
    ['green', 30],
    ['blue', 20 + tier * 12 + rareBonus * 40],
    ['purple', 8 + tier * 14 + rareBonus * 60 + (elite ? 6 : 0) + (boss ? 10 : 0)],
    ['orange', 2 + tier * 8 + rareBonus * 30 + (boss ? 8 : 0)],
    ['red', 0.3 + tier * 2.5 + rareBonus * 10 + (boss ? 2 : 0)],
    ['rainbow', 0.02 + tier * 0.4 + rareBonus * 2 + (boss ? 0.3 : 0)],
  ]
  let total = 0
  for (const [, w] of weights) total += Math.max(0, w)
  let roll = rng.next() * total
  for (const [q, w] of weights) {
    roll -= Math.max(0, w)
    if (roll <= 0) return q
  }
  return 'white'
}

/* ------------------------------ 离线模拟 ------------------------------ */

interface Actor {
  hp: number
  maxHp: number
  shield: number
}

/**
 * 固定步长（0.05s）逐帧模拟。与 LiveBattle 共用同一套公式与机制分支，
 * 保证「模拟结果 ≈ 实际战斗结果」，可用于扫荡与稳定刷怪点判定。
 */
export function simulate(save: GameSave, globalStage: number, opts: SimOptions = {}): SimResult {
  const maxSeconds = opts.maxSeconds ?? 120
  const dt = 0.05
  const rng = makeRng(opts.seed ?? hashStage(globalStage))
  const p = playerCombatant(save)
  const e = enemyFor(globalStage)
  const dc = flatStage(save.profile.stageId).realm.defenseConstant

  const bossShield = e.def.bossMechanics?.includes('shield') ?? false
  const bossEnrage = e.def.bossMechanics?.includes('enrage') ?? false
  const bossThorn = e.def.bossMechanics?.includes('thorn') ?? false
  const bossLifesteal = e.def.bossMechanics?.includes('lifesteal') ?? false
  const bossEvade = e.def.bossMechanics?.includes('evade') ?? false
  const resist = (e.def.bossMechanics?.includes('resist') ?? false) ? 0.85 : 1

  const player: Actor = { hp: p.maxHp, maxHp: p.maxHp, shield: 0 }
  const foe: Actor = { hp: e.maxHp, maxHp: e.maxHp, shield: 0 }
  let playerDamage = 0
  let enemyDamage = 0

  let pAtkTimer = 1 / Math.max(0.2, p.stats.aspd)
  let eAtkTimer = 1.2
  const pCds = p.skills.map((s) => s.initialCd ?? s.cooldown * 0.5)
  let petTimer = p.petSkill ? p.petSkill.cooldown * 0.6 : Infinity
  const eSkillTimers = (e.def.skills ?? []).map((s) => s.cooldown * 0.7)
  let enrageAt = 26
  let shieldTimer = 8
  let burstTimer = e.def.bossMechanics?.includes('burst') ? 11 : Infinity
  const dotEnabled = e.def.bossMechanics?.includes('dot') ?? false

  const hitEnemy = (raw: number) => {
    const dmg = raw
    if (foe.shield > 0) {
      const absorbed = Math.min(foe.shield, dmg)
      foe.shield -= absorbed
      foe.hp -= dmg - absorbed
    } else {
      foe.hp -= dmg
    }
    playerDamage += dmg
    if (p.stats.lifesteal > 0) player.hp = Math.min(player.maxHp, player.hp + dmg * p.stats.lifesteal)
    if (bossThorn) hurtPlayer(dmg * 0.12)
    if (bossLifesteal) foe.hp = Math.min(foe.maxHp, foe.hp + dmg * 0.08)
  }
  const hurtPlayer = (raw: number) => {
    let dmg = Math.max(1, Math.round(raw * (1 - Math.min(0.75, p.stats.dmgReduction))))
    if (player.shield > 0) {
      const absorbed = Math.min(player.shield, dmg)
      player.shield -= absorbed
      dmg -= absorbed
    }
    player.hp -= dmg
    enemyDamage += dmg
  }

  let t = 0
  while (t < maxSeconds) {
    t += dt

    pAtkTimer -= dt
    if (pAtkTimer <= 0) {
      pAtkTimer = 1 / Math.max(0.2, p.stats.aspd)
      if (!(bossEvade && rng.chance(0.18))) {
        const r = damage(p.stats.atk, 1, e.dfn, dc, p.stats.crit, p.stats.critDmg, rng, {
          pen: p.stats.pen,
          dmgBonus: bossBonus(p.stats, e.def.kind),
        })
        hitEnemy(Math.round(r.value * resist))
      }
    }

    for (let i = 0; i < p.skills.length; i++) {
      pCds[i] -= dt
      if (pCds[i] > 0) continue
      const sk = p.skills[i]
      pCds[i] = sk.cooldown * (1 - Math.min(0.5, p.stats.cdr))
      const mul = treasureScale(sk, p.treasureLevels)
      if (sk.cast === 'shield') {
        player.shield += p.maxHp * (0.1 + mul * 0.04)
        continue
      }
      if (sk.cast === 'heal') {
        player.hp = Math.min(p.maxHp, player.hp + p.maxHp * (0.06 + mul * 0.02))
        continue
      }
      if (sk.cast === 'buff' || sk.cast === 'aura') continue
      const targetCount = sk.targets && sk.targets > 1 ? sk.targets : 1
      for (let h = 0; h < targetCount; h++) {
        const r = damage(p.stats.atk, mul, e.dfn, dc, p.stats.crit, p.stats.critDmg, rng, {
          pen: p.stats.pen,
          dmgBonus:
            bossBonus(p.stats, e.def.kind) + elementBonus(p.stats, sk.damageType),
        })
        hitEnemy(Math.round(r.value * resist))
      }
    }

    if (p.petSkill) {
      petTimer -= dt
      if (petTimer <= 0) {
        petTimer = p.petSkill.cooldown * (1 - Math.min(0.4, p.stats.cdr))
        const mul = p.petSkill.scale * (1 + p.stats.petDmg)
        if (p.petSkill.cast === 'heal') {
          player.hp = Math.min(p.maxHp, player.hp + p.maxHp * (0.05 + mul * 0.02))
        } else if (p.petSkill.cast === 'shield') {
          player.shield += p.maxHp * 0.08
        } else if (p.petSkill.cast === 'buff') {
          player.hp = Math.min(p.maxHp, player.hp + p.maxHp * 0.03)
        } else {
          const r = damage(p.stats.atk, mul, e.dfn, dc, p.stats.crit, p.stats.critDmg, rng, {
            dmgBonus: p.stats.petDmg,
          })
          hitEnemy(r.value)
        }
      }
    }

    if (p.stats.hpRegen > 0 && t % 1 < dt) {
      player.hp = Math.min(player.maxHp, player.hp + p.stats.hpRegen)
    }
    for (const pas of p.passives) {
      if (pas.cast === 'heal' && t % 5 < dt) player.hp = Math.min(player.maxHp, player.hp + p.maxHp * 0.02)
    }

    eAtkTimer -= dt
    if (eAtkTimer <= 0) {
      eAtkTimer = 1 / Math.max(0.2, e.aspd)
      const mul = bossEnrage && t > enrageAt ? 1.5 : 1
      const r = damage(e.atk * mul, 1, p.stats.def, dc, e.crit, e.critDmg, rng)
      hurtPlayer(r.value)
      if (p.stats.thorn > 0) foe.hp -= r.value * p.stats.thorn
    }

    for (let i = 0; i < (e.def.skills ?? []).length; i++) {
      eSkillTimers[i] -= dt
      if (eSkillTimers[i] > 0) continue
      const sk = e.def.skills![i]
      eSkillTimers[i] = sk.cooldown
      if (sk.cast === 'shield') {
        foe.shield += e.maxHp * 0.12
        continue
      }
      if (sk.cast === 'summon') continue
      const r = damage(e.atk, sk.scale, p.stats.def, dc, e.crit * 0.8, e.critDmg, rng)
      hurtPlayer(r.value)
    }

    if (bossShield && t > shieldTimer) {
      shieldTimer = t + 14
      if (foe.shield <= 0) foe.shield = e.maxHp * 0.1
    }
    if (burstTimer !== Infinity && t > burstTimer) {
      burstTimer = t + 13
      hurtPlayer(e.atk * 2.4)
    }
    if (dotEnabled && t % 2 < dt) hurtPlayer(e.atk * 0.35)

    if (foe.hp <= 0) {
      return {
        win: true,
        duration: t,
        playerDps: playerDamage / Math.max(1, t),
        playerDamage: Math.round(playerDamage),
        enemyDamage: Math.round(enemyDamage),
        enemy: { name: e.name, hp: 0, maxHp: e.maxHp, dps: 0, damageDealt: 0 },
        playerHpLeft: Math.max(0, player.hp),
      }
    }
    if (player.hp <= 0) {
      return {
        win: false,
        duration: t,
        playerDps: playerDamage / Math.max(1, t),
        playerDamage: Math.round(playerDamage),
        enemyDamage: Math.round(enemyDamage),
        enemy: {
          name: e.name,
          hp: Math.max(0, foe.hp),
          maxHp: e.maxHp,
          dps: enemyDamage / Math.max(1, t),
          damageDealt: Math.round(enemyDamage),
        },
        playerHpLeft: 0,
        failReason: analyzeFailure(p, e, playerDamage, t),
      }
    }
    if (t === maxSeconds) break
  }

  return {
    win: false,
    duration: maxSeconds,
    playerDps: playerDamage / maxSeconds,
    playerDamage: Math.round(playerDamage),
    enemyDamage: Math.round(enemyDamage),
    enemy: { name: e.name, hp: Math.max(0, foe.hp), maxHp: e.maxHp, dps: 0, damageDealt: 0 },
    playerHpLeft: Math.max(0, player.hp),
    failReason: '战斗超时 —— 输出不足，未能击破敌方',
  }
}

/** 稳定刷怪点判定：取最近已通关关卡，10 次模拟胜率 ≥ 95%（PRD 12 章） */
export function findStableStage(save: GameSave, fromStage: number): number {
  let best = Math.max(1, Math.min(save.progress.maxStage, fromStage))
  for (let s = best; s >= Math.max(1, best - 30); s--) {
    const { monster } = getStage(s)
    if (monster?.kind === 'boss') continue
    let wins = 0
    for (let i = 0; i < 10; i++) {
      if (simulate(save, s, { seed: 1000 + i * 7919 + s, maxSeconds: 45 }).win) wins++
    }
    if (wins >= 10) return s
  }
  return best
}

/* ------------------------------ 实时战斗 ------------------------------ */

export interface LiveBattleOptions {
  save: GameSave
  globalStage: number
  seed?: number
}

/**
 * 逐帧驱动战斗，产出事件流。调用方每帧 tick(dt) 后把新事件交给渲染层。
 * 与 simulate() 使用同一套公式与机制分支。
 */
export class LiveBattle {
  readonly enemy: EnemyStats
  readonly state: LiveBattleState
  private p: CombatantStats
  private rng: Rng
  private dc: number
  private pAtkTimer: number
  private eAtkTimer: number
  private petTimer: number
  private eSkillTimers: number[]
  private shieldTimer: number
  private burstTimer: number
  private enrageAt: number
  private enraged = false
  private playerDamage = 0
  private enemyDamage = 0
  private paused = false

  constructor(opts: LiveBattleOptions) {
    const { save, globalStage } = opts
    this.p = playerCombatant(save)
    this.enemy = enemyFor(globalStage)
    this.rng = makeRng((opts.seed ?? hashStage(globalStage)) ^ 0x9e3779b9)
    this.dc = flatStage(save.profile.stageId).realm.defenseConstant

    this.state = {
      time: 0,
      playerHp: this.p.maxHp,
      playerMaxHp: this.p.maxHp,
      playerShield: 0,
      enemyHp: this.enemy.maxHp,
      enemyMaxHp: this.enemy.maxHp,
      enemyShield: 0,
      petHp: this.p.petSkill ? this.p.maxHp * 0.6 : 0,
      petMaxHp: this.p.petSkill ? this.p.maxHp * 0.6 : 0,
      skillCds: this.p.skills.map((s) => s.initialCd ?? s.cooldown * 0.5),
      done: false,
      win: false,
      dps: 0,
      events: [],
    }

    this.pAtkTimer = 1 / Math.max(0.2, this.p.stats.aspd)
    this.eAtkTimer = 1.2
    this.petTimer = this.p.petSkill ? this.p.petSkill.cooldown * 0.6 : Infinity
    this.eSkillTimers = (this.enemy.def.skills ?? []).map((s) => s.cooldown * 0.7)
    this.shieldTimer = 8
    this.burstTimer = this.enemy.def.bossMechanics?.includes('burst') ? 11 : Infinity
    this.enrageAt = 26

    this.emit('cast', 'enemy', 'player', undefined, undefined, false, this.enemy.name, this.enemy.def.icon, 'burst')
  }

  get combatant(): CombatantStats {
    return this.p
  }

  pause(v: boolean) {
    this.paused = v
  }

  private emit(
    type: BattleEvent['type'],
    from: BattleEvent['from'],
    to: BattleEvent['to'] | undefined,
    value: number | undefined,
    damageType: BattleEvent['damageType'],
    crit: boolean,
    label?: string,
    icon?: string,
    fx?: BattleEvent['fx'],
  ) {
    this.state.events.push({
      t: this.state.time,
      type,
      from,
      to,
      value,
      damageType,
      crit,
      label,
      icon,
      fx,
    })
  }

  private hitEnemy(raw: number, crit: boolean, type: BattleEvent['damageType'], fx: BattleEvent['fx']) {
    const st = this.state
    const e = this.enemy
    if (e.def.bossMechanics?.includes('thorn')) this.hurtPlayer(raw * 0.12, 'physical')
    let dmg = raw
    if (st.enemyShield > 0) {
      const absorbed = Math.min(st.enemyShield, dmg)
      st.enemyShield -= absorbed
      dmg -= absorbed
    }
    st.enemyHp -= dmg
    this.playerDamage += raw
    if (this.p.stats.lifesteal > 0) st.playerHp = Math.min(st.playerMaxHp, st.playerHp + raw * this.p.stats.lifesteal)
    if (e.def.bossMechanics?.includes('lifesteal')) st.enemyHp = Math.min(e.maxHp, st.enemyHp + raw * 0.08)
    this.emit(crit ? 'crit' : 'hit', 'player', 'enemy', Math.round(dmg), type, crit, undefined, undefined, fx)
  }

  private hurtPlayer(raw: number, type: BattleEvent['damageType']) {
    const st = this.state
    let dmg = Math.max(1, Math.round(raw * (1 - Math.min(0.75, this.p.stats.dmgReduction))))
    if (st.playerShield > 0) {
      const absorbed = Math.min(st.playerShield, dmg)
      st.playerShield -= absorbed
      dmg -= absorbed
    }
    st.playerHp -= dmg
    this.enemyDamage += dmg
    this.emit('hit', 'enemy', 'player', dmg, type, false)
  }

  /** 返回本次 tick 新增的事件 */
  tick(dt: number): BattleEvent[] {
    const st = this.state
    if (st.done || this.paused) return []
    const start = st.events.length
    st.time += dt

    const p = this.p
    const e = this.enemy
    const mech = e.def.bossMechanics ?? []
    const bossShield = mech.includes('shield')
    const bossEnrage = mech.includes('enrage')
    const bossEvade = mech.includes('evade')
    const resist = mech.includes('resist') ? 0.85 : 1

    this.pAtkTimer -= dt
    if (this.pAtkTimer <= 0) {
      this.pAtkTimer = 1 / Math.max(0.2, p.stats.aspd)
      if (bossEvade && this.rng.chance(0.18)) {
        this.emit('hit', 'enemy', 'player', 0, undefined, false, '闪避')
      } else {
        const r = damage(p.stats.atk, 1, e.dfn, this.dc, p.stats.crit, p.stats.critDmg, this.rng, {
          pen: p.stats.pen,
          dmgBonus: bossBonus(p.stats, e.def.kind),
        })
        this.hitEnemy(Math.round(r.value * resist), r.crit, 'physical', 'slash')
      }
    }

    for (let i = 0; i < p.skills.length; i++) {
      st.skillCds[i] -= dt
      if (st.skillCds[i] > 0) continue
      const sk = p.skills[i]
      st.skillCds[i] = sk.cooldown * (1 - Math.min(0.5, p.stats.cdr))
      const mul = treasureScale(sk, p.treasureLevels)
      const fx = castToFx(sk.cast, sk.damageType)
      this.emit('cast', 'player', 'enemy', undefined, sk.damageType, false, sk.name, sk.icon, fx)
      if (sk.cast === 'shield') {
        const amount = p.maxHp * (0.1 + mul * 0.04)
        st.playerShield += amount
        this.emit('shield', 'player', 'player', Math.round(amount), undefined, false, sk.name)
        continue
      }
      if (sk.cast === 'heal') {
        const heal = p.maxHp * (0.06 + mul * 0.02)
        st.playerHp = Math.min(p.maxHp, st.playerHp + heal)
        this.emit('heal', 'player', 'player', Math.round(heal), undefined, false, sk.name)
        continue
      }
      if (sk.cast === 'buff' || sk.cast === 'aura') continue
      const targetCount = sk.targets && sk.targets > 1 ? sk.targets : 1
      for (let h = 0; h < targetCount; h++) {
        const r = damage(p.stats.atk, mul, e.dfn, this.dc, p.stats.crit, p.stats.critDmg, this.rng, {
          pen: p.stats.pen,
          dmgBonus: bossBonus(p.stats, e.def.kind) + elementBonus(p.stats, sk.damageType),
        })
        this.hitEnemy(Math.round(r.value * resist), r.crit, sk.damageType, fx)
      }
    }

    if (p.petSkill) {
      this.petTimer -= dt
      if (this.petTimer <= 0) {
        this.petTimer = p.petSkill.cooldown * (1 - Math.min(0.4, p.stats.cdr))
        const mul = p.petSkill.scale * (1 + p.stats.petDmg)
        if (p.petSkill.cast === 'heal') {
          const heal = p.maxHp * (0.05 + mul * 0.02)
          st.playerHp = Math.min(p.maxHp, st.playerHp + heal)
          this.emit('heal', 'pet', 'player', Math.round(heal), undefined, false, '灵兽治愈')
        } else if (p.petSkill.cast === 'shield') {
          st.playerShield += p.maxHp * 0.08
          this.emit('shield', 'pet', 'player', Math.round(p.maxHp * 0.08), undefined, false, '灵兽护盾')
        } else {
          this.emit('cast', 'pet', 'enemy', undefined, 'physical', false, '灵兽出击', undefined, 'slash')
          const r = damage(p.stats.atk, mul, e.dfn, this.dc, p.stats.crit, p.stats.critDmg, this.rng, {
            dmgBonus: p.stats.petDmg,
          })
          this.hitEnemy(r.value, r.crit, 'physical', 'slash')
        }
      }
    }

    if (p.passives.length && st.time % 5 < dt) {
      for (const pas of p.passives) {
        if (pas.cast === 'heal') {
          const heal = p.maxHp * 0.02
          st.playerHp = Math.min(p.maxHp, st.playerHp + heal)
          this.emit('heal', 'player', 'player', Math.round(heal), undefined, false, pas.name)
        }
      }
    }

    this.eAtkTimer -= dt
    if (this.eAtkTimer <= 0) {
      this.eAtkTimer = 1 / Math.max(0.2, e.aspd)
      const mul = bossEnrage && this.enraged ? 1.5 : 1
      const r = damage(e.atk * mul, 1, p.stats.def, this.dc, e.crit, e.critDmg, this.rng)
      this.hurtPlayer(r.value, e.def.element as BattleEvent['damageType'])
    }

    for (let i = 0; i < (e.def.skills ?? []).length; i++) {
      this.eSkillTimers[i] -= dt
      if (this.eSkillTimers[i] > 0) continue
      const sk = e.def.skills![i]
      this.eSkillTimers[i] = sk.cooldown
      if (sk.cast === 'shield') {
        const amount = e.maxHp * 0.12
        st.enemyShield += amount
        this.emit('shield', 'enemy', 'enemy', Math.round(amount), undefined, false, sk.name)
        continue
      }
      if (sk.cast === 'summon') {
        this.emit('summon', 'enemy', 'all', undefined, undefined, false, sk.name, undefined, 'soul')
        continue
      }
      this.emit('cast', 'enemy', 'player', undefined, sk.damageType, false, sk.name, undefined, castToFx(sk.cast, sk.damageType))
      const r = damage(e.atk, sk.scale, p.stats.def, this.dc, e.crit * 0.8, e.critDmg, this.rng)
      this.hurtPlayer(r.value, sk.damageType)
    }

    if (bossShield && st.time > this.shieldTimer) {
      this.shieldTimer = st.time + 14
      if (st.enemyShield <= 0) {
        st.enemyShield = e.maxHp * 0.1
        this.emit('shield', 'enemy', 'enemy', Math.round(e.maxHp * 0.1), undefined, false, '妖气护体')
      }
    }
    if (this.burstTimer !== Infinity && st.time > this.burstTimer) {
      this.burstTimer = st.time + 13
      this.emit('cast', 'enemy', 'player', undefined, e.element as BattleEvent['damageType'], false, '爆发', undefined, 'burst')
      this.hurtPlayer(e.atk * 2.4, e.element as BattleEvent['damageType'])
    }
    if (bossEnrage && !this.enraged && st.time > this.enrageAt) {
      this.enraged = true
      this.emit('enrage', 'enemy', 'all', undefined, undefined, false, '狂暴')
    }
    if (mech.includes('dot') && st.time % 2 < dt) this.hurtPlayer(e.atk * 0.35, e.element as BattleEvent['damageType'])
    if (mech.includes('phase') && st.enemyHp < e.maxHp * 0.4 && !st.events.some((x) => x.type === 'phase')) {
      this.emit('phase', 'enemy', 'all', undefined, undefined, false, '形态变化')
    }
    if (mech.includes('summon') && st.time % 12 < dt && st.time > 5) {
      this.emit('summon', 'enemy', 'all', undefined, undefined, false, '召唤妖物', undefined, 'soul')
    }

    st.dps = this.playerDamage / Math.max(0.5, st.time)

    if (st.enemyHp <= 0) {
      st.enemyHp = 0
      st.done = true
      st.win = true
      this.emit('kill', 'player', 'enemy', undefined, undefined, false, e.name, e.def.icon, 'burst')
      this.emit('victory', 'player', 'all', undefined, undefined, false, '胜')
    } else if (st.playerHp <= 0) {
      st.playerHp = 0
      st.done = true
      st.win = false
      this.emit('death', 'enemy', 'player', undefined, undefined, false, '战败')
    }

    return st.events.slice(start)
  }

  /** 失败原因分析（Boss 战失败时给玩家方向提示） */
  failReason(): string | undefined {
    if (this.state.win || !this.state.done) return undefined
    return analyzeFailure(this.p, this.enemy, this.playerDamage, this.state.time)
  }
}

