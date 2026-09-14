'use client'

/* ------------------------------------------------------------------ *
 * 存档 → UI 展示的映射层
 *
 * 页面不该各自去猜存档字段怎么显示：装备品质色、词条文案、法宝冷却、
 * 功法流派名都在这里统一，组件只管渲染。
 * ------------------------------------------------------------------ */

import { QUALITY } from '@/lib/game/ui-tokens'
import type { Quality } from '@/lib/game/types'
import { EQUIP_SLOT_LABEL, SCHOOL_LABEL, type EquipInstance, type Stats } from '@/lib/game/types'
import { TREASURE_BY_ID } from '@/lib/game/config/treasures'
import { TECHNIQUE_BY_ID } from '@/lib/game/config/techniques'
import { PET_BY_ID } from '@/lib/game/config/pets'
import { MATERIAL_BY_ID } from '@/lib/game/config/materials'
import { PILL_BY_ID } from '@/lib/game/config/pills'
import { formatNumber } from '@/lib/game/utils'

/* ------------------------------ 属性文案 ------------------------------ */

const STAT_LABEL: Partial<Record<keyof Stats, string>> = {
  hp: '生命',
  atk: '攻击',
  def: '防御',
  aspd: '攻速',
  crit: '暴击率',
  critDmg: '暴击伤害',
  hit: '命中',
  eva: '闪避',
  lifesteal: '吸血',
  pen: '破甲',
  dmgReduction: '伤害减免',
  cdr: '冷却缩减',
  shieldPower: '护盾强度',
  thorn: '反伤',
  hpRegen: '生命回复',
  metalDmg: '金系伤害',
  woodDmg: '木系伤害',
  waterDmg: '水系伤害',
  fireDmg: '火系伤害',
  earthDmg: '土系伤害',
  swordDmg: '飞剑伤害',
  spellDmg: '法术伤害',
  summonDmg: '召唤伤害',
  dotDmg: '持续伤害',
  petDmg: '灵兽伤害',
  bossDmg: 'Boss 伤害',
  eliteDmg: '精英伤害',
  idleCultivation: '挂机修为',
  stoneGain: '灵石获取',
  dropRate: '装备掉率',
  rareDropRate: '稀有掉率',
}

/** 百分比属性：显示成 x.x% 而不是点数 */
const PERCENT_KEYS = new Set<keyof Stats>([
  'crit',
  'critDmg',
  'lifesteal',
  'eva',
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
])

export function statLabel(key: keyof Stats): string {
  return STAT_LABEL[key] ?? String(key)
}

export function formatStat(key: keyof Stats, value: number): string {
  if (PERCENT_KEYS.has(key)) return `+${(value * 100).toFixed(1)}%`
  if (key === 'aspd') return `+${value.toFixed(2)}`
  return `+${formatNumber(value)}`
}

/** 把一条属性表拆成可直接渲染的行 */
export function statRows(stats: Partial<Stats>): { label: string; value: string }[] {
  const rows: { key: keyof Stats; label: string; value: string }[] = []
  for (const k of Object.keys(stats) as (keyof Stats)[]) {
    const v = stats[k]
    if (typeof v !== 'number' || v === 0) continue
    rows.push({ key: k, label: statLabel(k), value: formatStat(k, v) })
  }
  // 主要属性优先：生命 / 攻击 / 防御在最前
  const order: (keyof Stats)[] = ['hp', 'atk', 'def']
  return rows
    .sort((a, b) => {
      const ai = order.indexOf(a.key)
      const bi = order.indexOf(b.key)
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      return a.label.localeCompare(b.label, 'zh')
    })
    .map(({ label, value }) => ({ label, value }))
}

/* ------------------------------ 品质 ------------------------------ */

export interface QualityView {
  label: string
  ring: string
  text: string
  glow: string
}

export function qualityView(q: Quality): QualityView {
  return QUALITY[q] ?? QUALITY.white
}

/* ------------------------------ 装备 ------------------------------ */

export interface EquipmentView {
  uid: string
  name: string
  slotLabel: string
  quality: Quality
  level: number
  enhance: number
  icon: string
  /** 主属性（模板基础属性） */
  mainStats: { label: string; value: string }[]
  /** 随机词条 */
  affixes: { label: string; legendary?: boolean }[]
  locked: boolean
}

export function equipmentView(e: EquipInstance): EquipmentView {
  const mainStats = statRows(e.stats)
  return {
    uid: e.uid,
    name: e.name,
    slotLabel: EQUIP_SLOT_LABEL[e.slot],
    quality: e.quality,
    level: e.level,
    enhance: e.enhance,
    icon: e.icon,
    mainStats,
    affixes: e.affixes.map((a) => ({ label: a.label, legendary: a.legendary })),
    locked: e.locked ?? false,
  }
}

/** 简化的装备卡片（列表 / 格子用） */
export interface EquipmentBrief {
  uid: string
  name: string
  quality: Quality
  level: number
  enhance: number
  icon: string
  locked: boolean
}

export function equipmentBrief(e: EquipInstance): EquipmentBrief {
  return {
    uid: e.uid,
    name: e.name,
    quality: e.quality,
    level: e.level,
    enhance: e.enhance,
    icon: e.icon,
    locked: e.locked ?? false,
  }
}

/* ------------------------------ 法宝 ------------------------------ */

export interface TreasureView {
  defId: string
  name: string
  kind: 'active' | 'passive'
  kindLabel: string
  quality: Quality
  icon: string
  level: number
  tier: number
  cooldown: number
  desc: string
  /** 已装备在哪个槽（未装备为 null） */
  slot: number | null
}

export function treasureView(defId: string, slot: number | null, level: number, tier: number): TreasureView | null {
  const def = TREASURE_BY_ID[defId]
  if (!def) return null
  return {
    defId: def.id,
    name: def.name,
    kind: def.kind,
    kindLabel: def.kind === 'passive' ? '被动' : '主动',
    quality: def.quality,
    icon: def.icon,
    level,
    tier,
    cooldown: def.cooldown,
    desc: def.desc,
    slot,
  }
}

/* ------------------------------ 功法 ------------------------------ */

export interface TechniqueView {
  defId: string
  name: string
  schoolLabel: string
  quality: Quality
  icon: string
  level: number
  maxLevel: number
  desc: string
  effects: { label: string; value: string }[]
  isMain: boolean
  slot: number | null
}

export function techniqueView(defId: string, level: number, isMain: boolean, slot: number | null): TechniqueView | null {
  const def = TECHNIQUE_BY_ID[defId]
  if (!def) return null
  return {
    defId: def.id,
    name: def.name,
    schoolLabel: SCHOOL_LABEL[def.school],
    quality: def.quality,
    icon: def.icon,
    level,
    maxLevel: def.maxLevel,
    desc: def.desc,
    effects: statRows(Object.fromEntries(
      Object.entries(def.perLevel).map(([k, v]) => [k, (v as number) * level]),
    ) as Partial<Stats>),
    isMain,
    slot,
  }
}

/* ------------------------------ 材料 / 丹药 ------------------------------ */

export interface MaterialView {
  id: string
  name: string
  quality: Quality
  icon: string
  desc: string
  count: number
  category: string
}

export function materialView(id: string, count: number): MaterialView {
  const def = MATERIAL_BY_ID[id]
  return {
    id,
    name: def?.name ?? id,
    quality: def?.quality ?? 'white',
    icon: def?.icon ?? 'ore',
    desc: def?.desc ?? '',
    count,
    category: def?.category === 'breakthrough' ? '突破材料' : '炼器材料',
  }
}

export function pillView(id: string, count: number): MaterialView {
  const def = PILL_BY_ID[id]
  return {
    id,
    name: def?.name ?? id,
    quality: def?.quality ?? 'white',
    icon: 'pill',
    desc: def?.desc ?? '',
    count,
    category: '丹药',
  }
}

/* ------------------------------ 灵兽 ------------------------------ */

export interface PetView {
  id: string
  name: string
  quality: Quality
  icon: string
  desc: string
  skillDesc: string
  isActive: boolean
}

export function petView(id: string, isActive: boolean): PetView | null {
  const def = PET_BY_ID[id]
  if (!def) return null
  return {
    id: def.id,
    name: def.name,
    quality: def.quality,
    icon: def.icon,
    desc: def.desc,
    skillDesc: def.skill.desc,
    isActive,
  }
}
