/* ------------------------------------------------------------------ *
 * 突破引擎（PRD 5 / 47 章）
 * 纯函数：canBreakthrough / breakthroughEnemy / simulateBreakthrough 只读存档；
 * applyBreakthrough 只返回变更描述（不修改 save），由 store 写入。
 *
 * 失败保护（PRD 5 / 47，采用最宽容策略）：
 *   · 不掉境界、不掉装备；
 *   · 修为不清零（保留，玩家可以继续攒）；
 *   · 突破材料不消耗；
 *   · 唯一代价是 weakUntil = now + 5 分钟的短期虚弱（不构成永久惩罚）。
 * 突破战不进关卡表：以 monsterStats(save.progress.maxStage) 为基准 × Boss 倍率 × 1.15 台阶，
 * 直接构造 EnemyStats 交给 LiveBattle（enemyOverride），与 simulate 共用同一套伤害 / 机制公式。
 * ------------------------------------------------------------------ */

import type { GameSave, MonsterDef, RealmId, SimResult } from '../types'
import { flatStage, nextStage } from '../config/realms'
import { MONSTER_BY_ID, monsterStats } from '../config/maps'
import { MATERIAL_BY_ID } from '../config/materials'
import { LiveBattle, playerCombatant, type EnemyStats } from './battle'
import { formatNumber, type Rng } from '../utils'

/** 突破战在基准怪物之上的额外台阶 */
const BREAKTHROUGH_STEP = 1.15
/** 失败虚弱时长（ms） */
const WEAK_MS = 5 * 60 * 1000
/** 无战斗也要走的最大模拟秒数（与 simulate 默认一致） */
const SIM_MAX_SECONDS = 120
const SIM_DT = 0.05

/* ------------------------------ 突破 Boss 定义 ------------------------------ */

/**
 * 内置兜底 Boss：关卡表（maps.ts）里定义了同名 id 时优先用关卡表，
 * 否则用这里的机制组合，保证任何境界都有可打的突破战。
 */
const HEART_DEMON: MonsterDef = {
  id: 'boss_heart_demon',
  name: '心魔',
  kind: 'boss',
  icon: 'demon',
  element: 'soul',
  hpMul: 3.2,
  atkMul: 1.35,
  defMul: 1.2,
  aspd: 1.0,
  bossMechanics: ['summon', 'enrage', 'dot'],
  skills: [
    { name: '心魔低语', cast: 'dot', scale: 1.1, cooldown: 10, damageType: 'soul' },
    { name: '魔念缠身', cast: 'aoe', scale: 1.3, cooldown: 15, damageType: 'soul' },
  ],
  desc: '突破关隘时自识海中浮起的执念之影。',
}

const TRIBULATION_SHADOW: MonsterDef = {
  id: 'boss_tribulation_shadow',
  name: '天劫虚影',
  kind: 'boss',
  icon: 'thunder',
  element: 'metal',
  hpMul: 3.6,
  atkMul: 1.5,
  defMul: 1.25,
  aspd: 1.05,
  bossMechanics: ['burst', 'shield', 'enrage'],
  skills: [
    { name: '劫雷', cast: 'projectile', scale: 1.5, cooldown: 9, damageType: 'metal' },
    { name: '天雷护体', cast: 'shield', scale: 0, cooldown: 16, damageType: 'metal' },
  ],
  desc: '飞升前的最后一道天威，照见修士一生因果。',
}

const BOSS_NAME_HINT: Record<string, string> = {
  boss_heart_demon: '心魔',
  boss_foundation_heart: '筑基心魔',
  boss_tribulation_shadow: '天劫虚影',
}

/** 取突破 Boss 定义：关卡表优先，缺失时用内置兜底（含未知 id） */
function bossDefOf(bossId: string): MonsterDef {
  const known = MONSTER_BY_ID[bossId]
  if (known) return known
  if (bossId === 'boss_tribulation_shadow') return TRIBULATION_SHADOW
  if (bossId === 'boss_heart_demon') return HEART_DEMON
  return { ...HEART_DEMON, id: bossId, name: BOSS_NAME_HINT[bossId] ?? '突破心魔' }
}

/* ------------------------------ 条件检查 ------------------------------ */

export interface BreakthroughCheck {
  can: boolean
  /** 第一个不满足条件的可读原因 */
  reason?: string
  /** 飞升圆满，无更高境界 */
  atFinalStage: boolean
  stageId: string
  stageLabel: string
  cultivation: number
  cultivationMax: number
  cultivationOk: boolean
  materials: { id: string; name: string; need: number; have: number; ok: boolean }[]
  bossId: string | null
  bossName: string | null
}

export function canBreakthrough(save: GameSave): BreakthroughCheck {
  const cur = flatStage(save.profile.stageId)
  const nxt = nextStage(save.profile.stageId)
  const atFinalStage = nxt === null

  const cultivation = save.profile.cultivation
  const cultivationMax = cur.stage.cultivationMax
  const cultivationOk = cultivation >= cultivationMax

  const materials = (cur.stage.breakthroughMaterials ?? []).map((m) => {
    const have = save.inventory.materials[m.id] ?? 0
    return {
      id: m.id,
      name: MATERIAL_BY_ID[m.id]?.name ?? m.id,
      need: m.count,
      have,
      ok: have >= m.count,
    }
  })

  // 缺省心魔；飞升前最后阶段改打天劫虚影（PRD 5：突破必有一场战斗或考验）
  const bossId = atFinalStage
    ? null
    : (cur.stage.breakthroughBoss ??
      (nxt?.realm.id === 'ascension' ? 'boss_tribulation_shadow' : 'boss_heart_demon'))
  const bossName = bossId ? bossDefOf(bossId).name : null

  let reason: string | undefined
  if (atFinalStage) {
    reason = '已至飞升圆满，再无更高境界'
  } else if (!cultivationOk) {
    reason = `修为未至圆满（${formatNumber(cultivation)} / ${formatNumber(cultivationMax)}）`
  } else {
    const missing = materials.find((m) => !m.ok)
    if (missing) reason = `突破材料不足：${missing.name} ${missing.have}/${missing.need}`
  }

  return {
    can: reason === undefined,
    reason,
    atFinalStage,
    stageId: cur.stage.id,
    stageLabel: cur.stage.label,
    cultivation,
    cultivationMax,
    cultivationOk,
    materials,
    bossId,
    bossName,
  }
}

/* ------------------------------ 突破战敌人 ------------------------------ */

/**
 * 合成突破战敌人（不在关卡表）：monsterStats(maxStage) × Boss 倍率 × 1.15 台阶。
 * 已至飞升 / 无下一境界时返回 null。
 */
export function breakthroughEnemy(save: GameSave): EnemyStats | null {
  const nxt = nextStage(save.profile.stageId)
  if (!nxt) return null
  const check = canBreakthrough(save)
  const bossId = check.bossId
  if (!bossId) return null

  const def = bossDefOf(bossId)
  const anchor = Math.max(1, save.progress.maxStage || save.progress.stage)
  const base = monsterStats(anchor)

  const hp = Math.max(1, Math.round(base.hp * def.hpMul * BREAKTHROUGH_STEP))
  const atk = Math.max(1, Math.round(base.atk * def.atkMul * BREAKTHROUGH_STEP))
  const dfn = Math.max(0, Math.round(base.def * def.defMul * BREAKTHROUGH_STEP))

  return {
    def,
    name: def.name,
    hp,
    maxHp: hp,
    atk,
    dfn,
    aspd: def.aspd || base.aspd || 1,
    crit: 0.12,
    critDmg: 1.6,
    element: def.element,
  }
}

/* ------------------------------ 突破战模拟 ------------------------------ */

/**
 * 无头驱动一场 LiveBattle（与 simulate 共用公式与机制分支），折成 SimResult。
 * 用 LiveBattle 而非 simulate 是因为突破战敌人不在关卡表内，只能走 enemyOverride。
 */
function runHeadless(save: GameSave, enemy: EnemyStats, seed: number): SimResult {
  const battle = new LiveBattle({
    save,
    globalStage: Math.max(1, save.progress.stage || 1),
    seed,
    enemyOverride: enemy,
  })
  const st = battle.state
  let ticks = 0
  const maxTicks = Math.ceil(SIM_MAX_SECONDS / SIM_DT)
  while (!st.done && ticks < maxTicks) {
    battle.tick(SIM_DT)
    ticks += 1
  }

  let enemyDamage = 0
  for (const ev of st.events) {
    if (ev.from === 'enemy' && ev.to === 'player' && (ev.type === 'hit' || ev.type === 'crit')) {
      enemyDamage += ev.value ?? 0
    }
  }

  const duration = st.done ? st.time : SIM_MAX_SECONDS
  const elapsed = Math.max(0.5, st.time)
  return {
    win: st.win,
    duration,
    playerDps: st.dps,
    playerDamage: Math.round(st.dps * elapsed),
    enemyDamage: Math.round(enemyDamage),
    enemy: {
      name: enemy.name,
      hp: Math.max(0, st.enemyHp),
      maxHp: enemy.maxHp,
      dps: enemyDamage / elapsed,
      damageDealt: Math.round(enemyDamage),
    },
    playerHpLeft: Math.max(0, st.playerHp),
    failReason: st.done ? battle.failReason() : '战斗超时 —— 输出不足，未能击破敌方',
  }
}

/**
 * 用 battle 的公式跑一场突破战（只读存档）。
 * profile.weakUntil 只作为 UI 提示 / 再战节奏的软约束，不改战斗数值（PRD 47：不形成永久惩罚）。
 */
export function simulateBreakthrough(save: GameSave, rng?: Rng): SimResult {
  const enemy = breakthroughEnemy(save)
  if (!enemy) {
    // 已至飞升圆满：无需战斗
    const p = playerCombatant(save)
    return {
      win: true,
      duration: 0,
      playerDps: 0,
      playerDamage: 0,
      enemyDamage: 0,
      enemy: { name: '——', hp: 0, maxHp: 0, dps: 0, damageDealt: 0 },
      playerHpLeft: p.maxHp,
    }
  }
  const seed = rng ? Math.floor(rng.next() * 0x7fffffff) : (Date.now() ^ 0x5f3759df) >>> 0
  return runHeadless(save, enemy, seed >>> 0)
}

/* ------------------------------ 结算 ------------------------------ */

export interface BreakthroughOutcome {
  success: boolean
  fromStageId: string
  toStageId: string
  fromLabel: string
  toLabel: string
  consumedMaterials: { id: string; count: number }[]
  unlocked: string[]
  /** 失败时 now+5min，成功时 null */
  weakUntil: number | null
  message: string
  /**
   * 结算后 profile.realmId 应写成的值（跨大境界时会变）。
   * 额外可选字段：store 写入时建议同步 profile.realmId = outcome.realmId
   * （applyBreakthrough 总是返回该字段；手写失败态时可省略，回落到当前境界）。
   */
  realmId?: RealmId
}

/**
 * 结算：不修改 save，只返回变更描述，由 store 写入。
 * success 为突破战结果；已至飞升 / 无下一境界时即使传 true 也返回失败态（不消耗、不虚弱）。
 */
export function applyBreakthrough(
  save: GameSave,
  success: boolean,
  now: number = Date.now(),
): BreakthroughOutcome {
  const cur = flatStage(save.profile.stageId)
  const nxt = nextStage(save.profile.stageId)
  const fromStageId = cur.stage.id
  const fromLabel = cur.stage.label
  const consumed = (cur.stage.breakthroughMaterials ?? []).map((m) => ({
    id: m.id,
    count: m.count,
  }))

  if (!success || !nxt) {
    const finalStage = nxt === null
    return {
      success: false,
      fromStageId,
      toStageId: fromStageId,
      fromLabel,
      toLabel: fromLabel,
      // 失败保护（最宽容策略）：材料不消耗、修为不清零、不掉境界
      consumedMaterials: [],
      unlocked: [],
      weakUntil: finalStage ? null : now + WEAK_MS,
      message: finalStage
        ? '已至飞升圆满，无需再行突破。'
        : `突破失败：未能踏入「${nxt.stage.label}」。修为与材料未损，虚弱 5 分钟后可再试。`,
      realmId: cur.realm.id,
    }
  }

  const unlocked = [
    ...new Set([...(cur.stage.unlocks ?? []), ...(nxt.stage.unlocks ?? [])]),
  ]
  const realmChanged = nxt.realm.id !== cur.realm.id
  return {
    success: true,
    fromStageId,
    toStageId: nxt.stage.id,
    fromLabel,
    toLabel: nxt.stage.label,
    consumedMaterials: consumed,
    unlocked,
    weakUntil: null,
    message: realmChanged
      ? `突破成功！${fromLabel} → ${nxt.stage.label}，你已踏入${nxt.realm.name}。`
      : `突破成功！${fromLabel} → ${nxt.stage.label}。`,
    realmId: nxt.realm.id,
  }
}
