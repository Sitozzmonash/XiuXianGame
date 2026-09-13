/* ------------------------------------------------------------------ *
 * 派生数据选择器（B4）
 * 纯函数：只读 GameSave，产出 UI 直接可用的展示数据。
 * 设计原则（PRD 44）：战力只是快速估算，不等于胜负；Build 评分给方向而非唯一答案。
 * ------------------------------------------------------------------ */

import { MAPS, getStage, globalToMap, MATERIAL_BY_ID, PILL_BY_ID, TREASURE_BY_ID, TECHNIQUE_BY_ID, PET_BY_ID } from '../config'
import { EQUIP_SLOT_LABEL, QUALITY_ORDER, SCHOOL_LABEL, type EquipInstance, type GameSave, type Quality, type Stats } from '../types'
import { playerCombatant, simulate } from '../engine/battle'
import { canBreakthrough } from '../engine/breakthrough'
import { flatStage, FLAT_STAGES } from '../config/realms'

/* ------------------------------ 战力 ------------------------------ */

export interface PowerBreakdown {
  total: number
  offense: number
  survival: number
  utility: number
}

export function powerBreakdown(save: GameSave): PowerBreakdown {
  const s = playerCombatant(save).stats
  const offense =
    s.atk * 6 +
    s.crit * 1200 +
    (s.critDmg - 1.5) * 800 +
    s.pen * 700 +
    (s.swordDmg + s.spellDmg + s.summonDmg + s.dotDmg + s.petDmg) * 500 +
    (s.metalDmg + s.woodDmg + s.waterDmg + s.fireDmg + s.earthDmg) * 500 +
    s.bossDmg * 300 +
    s.eliteDmg * 250 +
    s.aspd * 120
  const survival =
    s.hp * 0.35 +
    s.def * 3 +
    s.dmgReduction * 1100 +
    s.shieldPower * 400 +
    s.lifesteal * 900 +
    s.hpRegen * 15 +
    s.thorn * 500 +
    s.eva * 300
  const utility = s.hit * 200 + s.cdr * 800 + (s.idleCultivation + s.stoneGain + s.dropRate + s.rareDropRate) * 400
  const total = Math.round(offense + survival + utility)
  return { total, offense: Math.round(offense), survival: Math.round(survival), utility: Math.round(utility) }
}

export function power(save: GameSave): number {
  return powerBreakdown(save).total
}

/* ------------------------------ 属性面板 ------------------------------ */

export interface StatRow {
  key: keyof Stats
  label: string
  value: number
  display: string
  group: '基础' | '进攻' | '防御' | '增益'
}

const PCT_KEYS: (keyof Stats)[] = [
  'crit',
  'critDmg',
  'hit',
  'eva',
  'lifesteal',
  'pen',
  'dmgReduction',
  'cdr',
  'shieldPower',
  'thorn',
  'metalDmg',
  'woodDmg',
  'waterDmg',
  'fireDmg',
  'earthDmg',
  'swordDmg',
  'spellDmg',
  'summonDmg',
  'dotDmg',
  'petDmg',
  'bossDmg',
  'eliteDmg',
  'idleCultivation',
  'stoneGain',
  'dropRate',
  'rareDropRate',
]

const STAT_META: { key: keyof Stats; label: string; group: StatRow['group'] }[] = [
  { key: 'hp', label: '气血', group: '基础' },
  { key: 'atk', label: '攻击', group: '基础' },
  { key: 'def', label: '防御', group: '基础' },
  { key: 'aspd', label: '攻速', group: '基础' },
  { key: 'crit', label: '暴击率', group: '进攻' },
  { key: 'critDmg', label: '暴击伤害', group: '进攻' },
  { key: 'pen', label: '破甲', group: '进攻' },
  { key: 'metalDmg', label: '金系增伤', group: '进攻' },
  { key: 'woodDmg', label: '木系增伤', group: '进攻' },
  { key: 'waterDmg', label: '水系增伤', group: '进攻' },
  { key: 'fireDmg', label: '火系增伤', group: '进攻' },
  { key: 'earthDmg', label: '土系增伤', group: '进攻' },
  { key: 'swordDmg', label: '飞剑伤害', group: '进攻' },
  { key: 'spellDmg', label: '法术伤害', group: '进攻' },
  { key: 'summonDmg', label: '召唤伤害', group: '进攻' },
  { key: 'dotDmg', label: '持续伤害', group: '进攻' },
  { key: 'petDmg', label: '灵兽伤害', group: '进攻' },
  { key: 'bossDmg', label: 'Boss 伤害', group: '进攻' },
  { key: 'eliteDmg', label: '精英伤害', group: '进攻' },
  { key: 'def', label: '减伤', group: '防御' },
  { key: 'dmgReduction', label: '最终减伤', group: '防御' },
  { key: 'eva', label: '闪避', group: '防御' },
  { key: 'shieldPower', label: '护盾强度', group: '防御' },
  { key: 'thorn', label: '反伤', group: '防御' },
  { key: 'lifesteal', label: '吸血', group: '防御' },
  { key: 'hpRegen', label: '生命回复', group: '防御' },
  { key: 'hit', label: '命中', group: '增益' },
  { key: 'cdr', label: '冷却缩减', group: '增益' },
  { key: 'idleCultivation', label: '挂机修为', group: '增益' },
  { key: 'stoneGain', label: '灵石获取', group: '增益' },
  { key: 'dropRate', label: '装备掉率', group: '增益' },
  { key: 'rareDropRate', label: '稀有掉率', group: '增益' },
]

export function statRows(save: GameSave): StatRow[] {
  const s = playerCombatant(save).stats
  const seen = new Set<string>()
  const rows: StatRow[] = []
  for (const meta of STAT_META) {
    const dedupe = `${meta.key}_${meta.label}`
    if (seen.has(dedupe)) continue
    seen.add(dedupe)
    const value = s[meta.key] ?? 0
    const isPct = PCT_KEYS.includes(meta.key)
    rows.push({
      key: meta.key,
      label: meta.label,
      value,
      display: isPct ? `${(value * 100).toFixed(1)}%` : Math.round(value).toLocaleString('zh-CN'),
      group: meta.group,
    })
  }
  return rows
}

export function statGroups(save: GameSave): { group: StatRow['group']; rows: StatRow[] }[] {
  const rows = statRows(save)
  return (['基础', '进攻', '防御', '增益'] as const).map((group) => ({
    group,
    rows: rows.filter((r) => r.group === group && Math.abs(r.value) > 0.0001),
  }))
}

/* ------------------------------ Build 评分 ------------------------------ */

export interface BuildScore {
  score: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  notes: string[]
}

/**
 * Build 评分：战力只占一部分，词条质量、传奇词条、流派纯度、生存底线都计入。
 * PRD 19：Build 评分不能只看总战力。
 */
export function buildScore(save: GameSave): BuildScore {
  const notes: string[] = []
  const p = powerBreakdown(save)
  const equips = Object.values(save.combat.equipment).filter(Boolean) as EquipInstance[]
  const legendary = equips.reduce((n, e) => n + e.affixes.filter((a) => a.legendary).length, 0)
  const affixCount = equips.reduce((n, e) => n + e.affixes.length, 0)
  const enhanced = equips.reduce((n, e) => n + e.enhance, 0)
  const qualityScore = equips.reduce((n, e) => n + QUALITY_ORDER.indexOf(e.quality) * 260, 0)
  const school = save.profile.school
  const schoolStats = playerCombatant(save).stats
  const schoolBonus =
    school === 'sword'
      ? schoolStats.swordDmg + schoolStats.metalDmg
      : school === 'spell'
        ? schoolStats.spellDmg + schoolStats.fireDmg + schoolStats.waterDmg + schoolStats.metalDmg
        : school === 'body'
          ? schoolStats.dmgReduction + schoolStats.thorn + schoolStats.shieldPower
          : school === 'demon'
            ? schoolStats.dotDmg + schoolStats.summonDmg + schoolStats.lifesteal
            : 0

  const score = Math.round(
    p.total + qualityScore + affixCount * 90 + legendary * 420 + enhanced * 60 + schoolBonus * 600,
  )
  const grade: BuildScore['grade'] =
    score > 90000 ? 'S' : score > 60000 ? 'A' : score > 38000 ? 'B' : score > 20000 ? 'C' : 'D'

  if (schoolStats.dmgReduction < 0.08) notes.push('减伤偏低：面对爆发型 Boss 容易被秒')
  if (schoolStats.pen < 0.05) notes.push('缺破甲：高防御敌人会显著拖长战斗')
  if (schoolStats.lifesteal < 0.03 && school === 'demon') notes.push('魔修没堆吸血，献祭流不稳定')
  if (schoolStats.crit < 0.12 && school === 'sword') notes.push('剑修暴击不足，飞剑质变点难触发')
  if (schoolStats.hp < 2000 && save.progress.maxStage > 30) notes.push('气血偏薄，可考虑体修词条过渡')
  if (equips.length < 10) notes.push(`还有 ${10 - equips.length} 个装备槽空着`)
  if (legendary === 0 && save.progress.maxStage > 40) notes.push('暂无传奇词条：留意红色以上品质')
  if (notes.length === 0) notes.push('构筑均衡，暂无明显短板')

  return { score, grade, notes }
}

/* ------------------------------ 进度 / 关卡 ------------------------------ */

export interface CultivationProgress {
  current: number
  max: number
  pct: number
  atMax: boolean
  ready: boolean
  reason?: string
  stageLabel: string
  realmName: string
}

export function cultivationProgress(save: GameSave): CultivationProgress {
  const flat = flatStage(save.profile.stageId)
  const max = flat.stage.cultivationMax
  const check = canBreakthrough(save)
  return {
    current: save.profile.cultivation,
    max,
    pct: max > 0 ? Math.min(1, save.profile.cultivation / max) : 0,
    atMax: save.profile.cultivation >= max,
    ready: check.can,
    reason: check.reason,
    stageLabel: flat.stage.label,
    realmName: flat.realm.name,
  }
}

export interface StageView {
  global: number
  mapStage: number
  mapId: string
  mapName: string
  chapter: number
  stageName: string
  kind: 'normal' | 'elite' | 'boss' | 'event'
  isBoss: boolean
  monsterName: string | null
  storyId?: string
  realmId?: string
  cleared: boolean
}

export function stageView(save: GameSave, globalStage = save.progress.stage): StageView {
  const { map, stage, monster } = getStage(globalStage)
  return {
    global: globalStage,
    mapStage: stage.index,
    mapId: map.id,
    mapName: map.name,
    chapter: map.chapter,
    stageName: stage.name,
    kind: stage.kind,
    isBoss: monster?.kind === 'boss',
    monsterName: monster?.name ?? null,
    storyId: stage.storyId,
    realmId: stage.realmId,
    cleared: globalStage <= save.progress.maxStage,
  }
}

export interface MapProgressView {
  id: string
  name: string
  chapter: number
  poem: string
  total: number
  cleared: number
  unlocked: boolean
  current: boolean
}

export function mapProgressList(save: GameSave): MapProgressView[] {
  let offset = 0
  return MAPS.map((map) => {
    const start = offset + 1
    offset += map.stages.length
    const end = offset
    const cleared = Math.max(0, Math.min(map.stages.length, save.progress.maxStage - start + 1))
    return {
      id: map.id,
      name: map.name,
      chapter: map.chapter,
      poem: map.poem,
      total: map.stages.length,
      cleared,
      unlocked: save.progress.maxStage + 1 >= start,
      current: save.progress.stage >= start && save.progress.stage <= end,
    }
  })
}

/* ------------------------------ 卡关诊断（PRD 47） ------------------------------ */

export function diagnose(save: GameSave, globalStage = save.progress.stage): string {
  const sim = simulate(save, globalStage, { maxSeconds: 90 })
  if (sim.win) return '当前战力足以过关，继续推关即可。'
  return sim.failReason ?? '输出与生存都不足，建议强化装备或调整 Build。'
}

/* ------------------------------ 背包与资源 ------------------------------ */

export interface BagSummary {
  used: number
  capacity: number
  pct: number
  byQuality: Record<Quality, number>
  locked: number
  salvageable: number
}

export function bagSummary(save: GameSave): BagSummary {
  const items = save.inventory.items
  const byQuality = Object.fromEntries(QUALITY_ORDER.map((q) => [q, 0])) as Record<Quality, number>
  let locked = 0
  for (const it of items) {
    byQuality[it.quality] = (byQuality[it.quality] ?? 0) + 1
    if (it.locked) locked += 1
  }
  const used = items.length
  return {
    used,
    capacity: save.inventory.capacity,
    pct: save.inventory.capacity > 0 ? used / save.inventory.capacity : 0,
    byQuality,
    locked,
    salvageable: used - locked,
  }
}

export function materialLabel(id: string): string {
  return MATERIAL_BY_ID[id]?.name ?? id
}

export function pillLabel(id: string): string {
  return PILL_BY_ID[id]?.name ?? id
}

export function treasureLabel(id: string): string {
  return TREASURE_BY_ID[id]?.name ?? id
}

export function techniqueLabel(id: string): string {
  return TECHNIQUE_BY_ID[id]?.name ?? id
}

export function petLabel(id: string): string {
  return PET_BY_ID[id]?.name ?? id
}

export function loadoutName(save: GameSave): string {
  return save.story.flags['loadout_active'] === 'B' ? '方案 B' : '方案 A'
}

export function schoolName(save: GameSave): string {
  return SCHOOL_LABEL[save.profile.school] ?? '散修'
}

export function equipmentSlotName(slot: keyof typeof EQUIP_SLOT_LABEL): string {
  return EQUIP_SLOT_LABEL[slot]
}

/* ------------------------------ 新手解锁节奏（PRD 34） ------------------------------ */

const UNLOCK_TABLE: { kind: 'stage' | 'flat'; at: number; label: string }[] = [
  { kind: 'stage', at: 1, label: '战斗 · 装备 · 背包' },
  { kind: 'stage', at: 10, label: '法宝栏' },
  { kind: 'stage', at: 20, label: '装备强化' },
  { kind: 'stage', at: 30, label: '功法' },
  { kind: 'flat', at: 4, label: '灵根 · 完整奇遇' },
  { kind: 'flat', at: 7, label: '炼器 · 支线' },
  { kind: 'flat', at: 10, label: '洞府 · 秘境' },
  { kind: 'flat', at: 11, label: '炼丹' },
  { kind: 'flat', at: 12, label: '日常秘境' },
  { kind: 'flat', at: 13, label: '灵兽 · 高级 Build' },
  { kind: 'flat', at: 16, label: '宗门 · 世界阵营' },
  { kind: 'flat', at: 20, label: '通天塔 · 世界真相' },
]

export function unlockProgress(save: GameSave): { label: string; reached: boolean }[] {
  const stageIdx = flatStage(save.profile.stageId).index
  return UNLOCK_TABLE.map((row) => ({
    label: row.label,
    reached: row.kind === 'stage' ? save.progress.maxStage >= row.at : stageIdx >= row.at,
  }))
}

export function nextUnlock(save: GameSave): string | null {
  const stageIdx = flatStage(save.profile.stageId).index
  const pending = unlockProgress(save).filter((u) => !u.reached)
  if (pending.length === 0) return null
  const row = UNLOCK_TABLE.find((r) => r.label === pending[0].label)
  if (!row) return pending[0].label
  return row.kind === 'stage' ? `第 ${row.at} 关解锁：${row.label}` : `${FLAT_STAGES[row.at]?.stage.label ?? ''}解锁：${row.label}`
}

/* ------------------------------ 便捷查看 ------------------------------ */

export function globalToMapView(globalStage: number): { mapId: string; mapStage: number } {
  const { mapId, mapStage } = globalToMap(globalStage)
  return { mapId, mapStage }
}
