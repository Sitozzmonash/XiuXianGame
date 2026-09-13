/* ------------------------------------------------------------------ *
 * 掉落与背包引擎（PRD 19 / 45 章）
 *  · applyPity         —— 软保底：修正 Drop[] 品质并推进保底计数（就地改 save）
 *  · materializeDrops  —— 把 Drop[] 实例化为装备 / 材料 / 丹药
 *  · addToInventory    —— 入包：容量检查 + 自动分解（locked 永不分解）
 *  · autoEquipBest     —— 一键穿戴最优（纯计划，不改存档，由 store 写入）
 *  · salvageValue / expandCost —— 分解价与扩容价
 *
 * 与 store 的约定（勿改）：
 *  · addToInventory 返回的 items / materials / pills 是「入包后的完整表」，
 *    store 会直接整体赋值回 save.inventory，因此不要返回增量；
 *    自动分解所得灵石只统计在 stone 字段里，由 store 写入 resources（本函数不写）。
 *  · applyPity 内部用 WeakSet 记录已结算的掉落批次，materializeDrops 会再调用一次
 *    applyPity；无论调用方是否先手动调用，保底计数都只推进一次。
 * ------------------------------------------------------------------ */

import {
  EQUIP_SLOT_LABEL,
  QUALITY_ORDER,
  type Drop,
  type EquipInstance,
  type EquipSlotId,
  type GameSave,
  type Quality,
} from '../types'
import { equipScore, rollEquipment } from '../config/equipment'
import { FORGE_MATERIAL_IDS } from '../config/materials'
import { PILL_BY_ID } from '../config/pills'
import { clamp, type Rng } from '../utils'

export interface LootBundle {
  equipment: EquipInstance[]
  materials: Record<string, number>
  pills: Record<string, number>
}

export interface AddResult {
  /** 入包后的完整背包（含已有装备），store 直接整体赋值 */
  items: EquipInstance[]
  /** 入包后的完整材料表 */
  materials: Record<string, number>
  /** 入包后的完整丹药表 */
  pills: Record<string, number>
  /** 自动分解所得灵石（由调用方写入 resources.stone，本函数不写） */
  stone: number
  salvaged: EquipInstance[]
  /** 背包是否已满（满时新装备自动分解） */
  full: boolean
}

export const STORAGE_STEP = 50
export const STORAGE_MAX = 1000

/** 装备品质的保底阈值（PRD 45 章） */
const PITY_BLUE_AFTER = 6
const PITY_PURPLE_AFTER = 25
/** 新号保护期：前 10 分钟内必见蓝装 */
const NEWBIE_WINDOW_SECONDS = 600

const qIndex = (q: Quality | undefined): number => (q ? QUALITY_ORDER.indexOf(q) : -1)

/** 已结算过保底的掉落批次（按数组引用去重，避免重复推进计数） */
const pityApplied = new WeakSet<Drop[]>()

/** 本批应强制的目标品质；null 表示不干预 */
function pityTarget(save: GameSave, pity: { sinceBlue: number; sincePurple: number }): Quality | null {
  if (pity.sincePurple >= PITY_PURPLE_AFTER) return 'purple'
  if (pity.sinceBlue >= PITY_BLUE_AFTER) return 'blue'
  // 新号保护：首批装备直接给蓝，之后在保护期内连续 3 次未见蓝也强制给蓝
  if ((save.stats.playTime ?? 0) < NEWBIE_WINDOW_SECONDS) {
    if (pity.sinceBlue >= 3 || (pity.sinceBlue === 0 && pity.sincePurple === 0)) return 'blue'
  }
  return null
}

/**
 * PRD 45 软保底：修正掉落品质；同时更新 save.inventory.pity 计数（就地修改 save）。
 * 计数规则：每件装备结算后推进计数（蓝及以上重置 sinceBlue，紫及以上重置 sincePurple）。
 * 可用模板的 minQuality 只会把实际品质抬得更高，不会低于强制值。
 */
export function applyPity(save: GameSave, drops: Drop[]): Drop[] {
  if (pityApplied.has(drops)) return drops
  const out = drops.map((d) => ({ ...d }))
  const pity = save.inventory.pity ?? { sinceBlue: 0, sincePurple: 0 }
  save.inventory.pity = pity

  const equipPositions = out
    .map((d, i) => ({ d, i }))
    .filter((x) => x.d.kind === 'equipment')

  if (equipPositions.length > 0) {
    const target = pityTarget(save, pity)
    if (target) {
      let best = equipPositions[0]
      for (const x of equipPositions) {
        if (qIndex(x.d.quality) > qIndex(best.d.quality)) best = x
      }
      if (qIndex(out[best.i].quality) < qIndex(target)) {
        out[best.i] = { ...out[best.i], quality: target }
      }
    }
    for (const x of equipPositions) {
      const q = qIndex(out[x.i].quality)
      if (q >= qIndex('purple')) {
        pity.sinceBlue = 0
        pity.sincePurple = 0
      } else if (q >= qIndex('blue')) {
        pity.sinceBlue = 0
        pity.sincePurple += 1
      } else {
        // 未标注品质（未知）按「未达蓝」保守推进，只加速保底、不卡玩家
        pity.sinceBlue += 1
        pity.sincePurple += 1
      }
    }
  }

  pityApplied.add(out)
  return out
}

/* ------------------------------ 具体 id 映射 ------------------------------ */

/** 按关卡取低阶炼器材料（越靠前的关卡越偏前排 id，少量随机抖动） */
function pickMaterialId(stage: number, rand: () => number): string {
  const pool = FORGE_MATERIAL_IDS
  let band = clamp(Math.floor((stage - 1) / 12), 0, pool.length - 1)
  const jitter = rand()
  if (jitter < 0.22) band -= 1
  else if (jitter > 0.86) band += 1
  return pool[clamp(band, 0, pool.length - 1)]
}

/** 丹药按关卡分档池（低阶 id 起步，随关卡缓慢升级） */
const PILL_TIERS: string[][] = [
  ['pill_juqi_dan', 'pill_qingxin_dan', 'pill_houtu_dan', 'pill_baoxue_dan', 'pill_jingang_dan'],
  ['pill_ningyuan_dan', 'pill_pojia_dan', 'pill_leiyuan_dan', 'pill_huoling_dan', 'pill_xuanshui_dan'],
  ['pill_zhuji_lingye', 'pill_jinyuan_dan', 'pill_yuanying_yangshen'],
  ['pill_huashen_wudao', 'pill_lianxu_guiyuan'],
]

function pickPillId(stage: number, rand: () => number): string {
  const tier = clamp(Math.floor((stage - 1) / 50), 0, PILL_TIERS.length - 1)
  const pool = PILL_TIERS[tier].filter((id) => PILL_BY_ID[id])
  const fallback = PILL_TIERS[0].filter((id) => PILL_BY_ID[id])
  const use = pool.length > 0 ? pool : fallback
  return use[Math.min(use.length - 1, Math.floor(rand() * use.length))]
}

/**
 * 把 Drop[] 实例化：equipment 用 rollEquipment 生成实例（stage 传当前关卡），
 * material / pill 映射到具体 id；stone / cultivation / treasure 等由调用方另行结算。
 * 内部已调用 applyPity（同一批数组只会结算一次计数），调用方无需再手动调用。
 */
export function materializeDrops(save: GameSave, drops: Drop[], rng?: Rng): LootBundle {
  const rand = rng ? () => rng.next() : Math.random
  const stage = Math.max(1, save.progress.stage || 1)
  const patched = applyPity(save, drops)
  const bundle: LootBundle = { equipment: [], materials: {}, pills: {} }

  for (const d of patched) {
    const count = Math.max(1, Math.floor(d.count) || 1)
    switch (d.kind) {
      case 'equipment': {
        for (let i = 0; i < count; i++) {
          bundle.equipment.push(rollEquipment({ stage, quality: d.quality, rng: rand }))
        }
        break
      }
      case 'material': {
        const id = d.id ?? pickMaterialId(stage, rand)
        bundle.materials[id] = (bundle.materials[id] ?? 0) + count
        break
      }
      case 'pill': {
        const id = d.id ?? pickPillId(stage, rand)
        bundle.pills[id] = (bundle.pills[id] ?? 0) + count
        break
      }
      default:
        // stone / cultivation / treasure / technique / pet 不走背包
        break
    }
  }

  return bundle
}

/* ------------------------------ 分解与入包 ------------------------------ */

const SALVAGE_QUALITY_MUL: Record<Quality, number> = {
  white: 1,
  green: 1.7,
  blue: 2.8,
  purple: 5,
  orange: 9.5,
  red: 18,
  rainbow: 36,
}

export function salvageValue(e: EquipInstance): number {
  const mul = SALVAGE_QUALITY_MUL[e.quality] ?? 1
  return Math.max(1, Math.round((15 + e.level * 5) * mul * (1 + e.enhance * 0.2)))
}

/**
 * 入包：容量检查；低于 autoSalvageBelow 品质的自动分解成灵石；locked 装备永不分解。
 * 背包满时新装备也自动分解（locked 例外：宁可短暂超容也不分解）。
 * 返回完整结果表（见文件头约定），灵石由调用方入账。
 */
export function addToInventory(
  save: GameSave,
  bundle: LootBundle,
  opts: { autoSalvageBelow?: Quality | 'off' } = {},
): AddResult {
  const inv = save.inventory
  const threshold = opts.autoSalvageBelow ?? inv.autoSalvageBelow ?? 'off'
  const cap = Math.max(0, inv.capacity)
  const thresholdIdx = threshold === 'off' ? -1 : QUALITY_ORDER.indexOf(threshold)

  const items = [...inv.items]
  const salvaged: EquipInstance[] = []
  let stone = 0

  for (const e of bundle.equipment) {
    const belowThreshold = thresholdIdx >= 0 && qIndex(e.quality) < thresholdIdx
    const overflow = items.length >= cap
    if (!e.locked && (belowThreshold || overflow)) {
      stone += salvageValue(e)
      salvaged.push(e)
      continue
    }
    items.push(e)
  }

  const materials = { ...inv.materials }
  for (const [id, n] of Object.entries(bundle.materials)) {
    materials[id] = (materials[id] ?? 0) + n
  }
  const pills = { ...inv.pills }
  for (const [id, n] of Object.entries(bundle.pills)) {
    pills[id] = (pills[id] ?? 0) + n
  }

  inv.items = items
  inv.materials = materials
  inv.pills = pills

  return { items, materials, pills, stone, salvaged, full: items.length >= cap }
}

/* ------------------------------ 一键穿戴 ------------------------------ */

/**
 * 一键穿戴最优：每个部位取评分最高的候选，严格优于当前才替换。
 * 纯计划函数，不修改存档；store 依据返回的 equipment（完整装备表）/ replaced 写入。
 * candidates 缺省取背包内装备。locked 只影响分解，不影响穿戴。
 */
export function autoEquipBest(
  save: GameSave,
  candidates?: EquipInstance[],
): {
  equipment: Partial<Record<EquipSlotId, EquipInstance>>
  replaced: EquipInstance[]
  changed: string[]
} {
  const pool = candidates ?? save.inventory.items
  const bestOf = new Map<EquipSlotId, EquipInstance>()
  for (const e of pool) {
    const prev = bestOf.get(e.slot)
    if (!prev || equipScore(e) > equipScore(prev)) bestOf.set(e.slot, e)
  }

  const equipment: Partial<Record<EquipSlotId, EquipInstance>> = { ...save.combat.equipment }
  const replaced: EquipInstance[] = []
  const changed: string[] = []

  for (const [slot, cand] of bestOf) {
    const cur = save.combat.equipment[slot]
    if (cur && equipScore(cand) <= equipScore(cur)) continue
    if (cur) replaced.push(cur)
    equipment[slot] = cand
    changed.push(EQUIP_SLOT_LABEL[slot])
  }

  return { equipment, replaced, changed }
}

/* ------------------------------ 扩容 ------------------------------ */

/** 下一次扩容所需灵石；已满（≥ STORAGE_MAX）返回 0 */
export function expandCost(save: GameSave): number {
  const cap = save.inventory.capacity
  if (cap >= STORAGE_MAX) return 0
  const next = Math.min(STORAGE_MAX, cap + STORAGE_STEP)
  return Math.round((200 * Math.pow(Math.max(1, next) / 100, 1.5)) / 10) * 10
}
