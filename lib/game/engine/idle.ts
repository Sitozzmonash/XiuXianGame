/* ------------------------------------------------------------------ *
 * 挂机引擎（PRD 28 章）
 * 纯函数：只读存档快照并返回结算结果，不修改存档（save.idle.lastClaim 由 store 写入）。
 *
 * 收益公式（PRD 28）：
 *   关卡基础收益 × 境界倍率 × 洞府倍率 × 功法倍率 × 离线时长
 *   · 关卡基础收益：稳定刷怪点（无则当前进度关）的 stageReward()，按单关 / 20 秒折算每秒；
 *   · 境界倍率：REALM_BY_ID[realmId].multiplier 的开方级温和放大（sqrt）；
 *   · 洞府倍率：解锁洞府（story.flags.cave_unlocked）后 1.25；
 *   · 功法倍率：1 + 主修等级 × 0.05 + 已装备辅助功法数 × 0.02。
 * 离线不满 60 秒视为「没挂上」，零收益；超过 24 小时按 24 小时结算。
 * 离线段内不替玩家做任何重大选择：只给线索提示（hint），奇遇 / 突破留给玩家上线处理。
 * ------------------------------------------------------------------ */

import type { Drop, GameSave } from '../types'
import { REALM_BY_ID, flatStage } from '../config/realms'
import { FORGE_MATERIAL_IDS } from '../config/materials'
import { PILL_BY_ID } from '../config/pills'
import { rollDrops, stageReward } from './battle'
import { encounterPool } from './story'
import { makeRng, type Rng } from '../utils'

export const IDLE_CAP_SECONDS = 24 * 60 * 60

/** 离线不足该秒数不结算（视为未挂机） */
const MIN_SETTLE_SECONDS = 60
/** 离线达到该时长且奇遇池非空时给一句提示（PRD 28：不自动替玩家做选择） */
const ANOMALY_HINT_SECONDS = 4 * 60 * 60
const ANOMALY_HINT = '挂机期间似乎发现了异常，是否查看？'

/** 单关收益折算为每秒的口径（一关约 20 秒，与自动推关节奏一致） */
const SECONDS_PER_STAGE = 20
/** 装备掉落期望：约 0.35 件 / 小时 */
const EQUIP_PER_HOUR = 0.35
/** 低阶材料 / 丹药：按小时小额给，只取配置里的低阶 id（PRD 28「炼器材料 / 丹材」） */
const IDLE_MATERIAL_IDS = FORGE_MATERIAL_IDS.slice(0, 3)
const MATERIAL_PER_HOUR = 0.5
const IDLE_PILL_IDS = ['pill_juqi_dan', 'pill_qingxin_dan', 'pill_houtu_dan'].filter(
  (id) => PILL_BY_ID[id],
)
const PILL_PER_HOUR = 0.1

export interface IdleResult {
  /** 实际结算秒数（≤24h） */
  duration: number
  capped: boolean
  stone: number
  cultivation: number
  /** 装备掉落（未实例化，交给 loot.materializeDrops） */
  drops: Drop[]
  materials: Record<string, number>
  pills: Record<string, number>
  /** 离线期间发现异常时的提示（PRD 28：不替玩家做重大选择） */
  hint: string | null
}

export interface IdleBreakdown {
  seconds: number
  capped: boolean
  stonePerSec: number
  cultivationPerSec: number
  /** 关卡基础灵石收益（每秒原始值，未乘倍率） */
  stageFactor: number
  realmFactor: number
  caveFactor: number
  techniqueFactor: number
}

/* ------------------------------ 倍率 ------------------------------ */

/** 功法倍率：主修等级 + 已装备辅助功法数 */
function techniqueFactor(save: GameSave): number {
  const mainId = save.combat.mainTechnique
  const mainLevel = mainId
    ? (save.combat.techniques.find((t) => t.defId === mainId)?.level ?? 0)
    : 0
  const supportCount = save.combat.supportTechniques.filter(Boolean).length
  return 1 + mainLevel * 0.05 + supportCount * 0.02
}

/** 境界倍率：大境界倍率的开方级温和放大 */
function realmFactor(save: GameSave): number {
  const def = REALM_BY_ID[save.profile.realmId] ?? flatStage(save.profile.stageId).realm
  return Math.sqrt(Math.max(1, def.multiplier))
}

/** 洞府倍率（PRD 25 / 28）：解锁洞府后 +25%。兼容 store 写入的 cave / unlock_cave 别名标记 */
function caveFactor(save: GameSave): number {
  const flags = save.story.flags
  const unlocked = Boolean(
    flags['cave_unlocked'] || flags['cave'] || flags['unlock_cave'],
  )
  return unlocked ? 1.25 : 1
}

/** 按期望值做「整数 + 概率补一件」的小额结算 */
function accrue(expect: number, rng: Rng): number {
  const whole = Math.floor(expect)
  return whole + (rng.chance(expect - whole) ? 1 : 0)
}

/* ------------------------------ 结算预览 ------------------------------ */

/**
 * 挂机收益明细。now 缺省取当前时间；离线段从 save.idle.lastClaim 起算。
 * 该函数只读存档，可随时用于 UI 展示「离线预计收益」。
 */
export function idleBreakdown(save: GameSave, now: number = Date.now()): IdleBreakdown {
  const last = save.idle.lastClaim || save.updatedAt || now
  const elapsed = Math.max(0, (now - last) / 1000)
  const capped = elapsed > IDLE_CAP_SECONDS
  const seconds = Math.min(elapsed, IDLE_CAP_SECONDS)

  const stage = Math.max(
    1,
    save.progress.stableStage > 0 ? save.progress.stableStage : save.progress.stage,
  )
  const base = stageReward(stage)
  const rf = realmFactor(save)
  const cf = caveFactor(save)
  const tf = techniqueFactor(save)
  const stonePerSec = (base.stone / SECONDS_PER_STAGE) * rf * cf * tf
  const cultivationPerSec = (base.cultivation / SECONDS_PER_STAGE) * rf * cf * tf

  return {
    seconds,
    capped,
    stonePerSec,
    cultivationPerSec,
    stageFactor: Number((base.stone / SECONDS_PER_STAGE).toFixed(4)),
    realmFactor: rf,
    caveFactor: cf,
    techniqueFactor: tf,
  }
}

/* ------------------------------ 结算 ------------------------------ */

/**
 * 挂机结算（PRD 28）。纯函数：不改 save.idle.lastClaim，调用方（store）负责写入。
 * 离线 < 60 秒返回零收益；≥ 24 小时按 24 小时封顶。
 */
export function settleIdle(save: GameSave, now: number = Date.now(), rng?: Rng): IdleResult {
  const b = idleBreakdown(save, now)
  const result: IdleResult = {
    duration: b.seconds,
    capped: b.capped,
    stone: 0,
    cultivation: 0,
    drops: [],
    materials: {},
    pills: {},
    hint: null,
  }
  if (b.seconds < MIN_SETTLE_SECONDS) return result

  const rand = rng ?? makeRng((Date.now() ^ 0x9e3779b9) >>> 0)
  const hours = b.seconds / 3600
  const stage = Math.max(
    1,
    save.progress.stableStage > 0 ? save.progress.stableStage : save.progress.stage,
  )

  result.stone = Math.round(b.stonePerSec * b.seconds)
  result.cultivation = Math.round(b.cultivationPerSec * b.seconds)

  // 装备：每小时约 0.35 件；品质借 rollDrops 的品质表（等价概率，数量按离线时长给）
  const equipCount = accrue(hours * EQUIP_PER_HOUR, rand)
  for (let i = 0; i < equipCount; i++) {
    const rolled = rollDrops(stage, rand)
    const eq = rolled.find((d) => d.kind === 'equipment')
    result.drops.push({ kind: 'equipment', quality: eq?.quality, count: 1, label: '装备' })
  }

  // 低阶炼器材料 / 丹材：按离线小时数小额给
  for (const id of IDLE_MATERIAL_IDS) {
    const n = accrue(hours * MATERIAL_PER_HOUR, rand)
    if (n > 0) result.materials[id] = n
  }
  for (const id of IDLE_PILL_IDS) {
    const n = accrue(hours * PILL_PER_HOUR, rand)
    if (n > 0) result.pills[id] = n
  }

  // 异常提示：只提示、不代为选择（PRD 28）
  if (b.seconds >= ANOMALY_HINT_SECONDS && encounterPool(save).length > 0) {
    result.hint = ANOMALY_HINT
  }

  return result
}
