import {
  EQUIP_SLOTS,
  QUALITY_ORDER,
  type Affix,
  type EquipInstance,
  type EquipSlotId,
  type Quality,
  type Stats,
} from '../types'
import { scaleStats, uid } from '../utils'

/* ------------------------------------------------------------------ *
 * 装备模板 / 词条池 / 掉落生成
 * ------------------------------------------------------------------ */

export interface EquipTemplate {
  id: string
  name: string
  slot: EquipSlotId
  /** 套装 id，如 'qingshi' */
  set: string
  setId: string
  baseStats: Partial<Stats>
  icon: string
  minQuality: Quality
}

export interface EquipSetDef {
  id: string
  name: string
  chapter: number
  desc: string
}

/** 每套的强度台阶：青石 → 太虚 约 6.5 倍，对应 200 余关的地图跨度 */
const SET_TIER: Record<string, number> = {
  qingshi: 1,
  heifeng: 1.5,
  luoxia: 2.2,
  chiyan: 3.2,
  tianyun: 4.6,
  taixu: 6.5,
}

const SET_MIN_QUALITY: Record<string, Quality> = {
  qingshi: 'white',
  heifeng: 'white',
  luoxia: 'green',
  chiyan: 'green',
  tianyun: 'blue',
  taixu: 'purple',
}

export const SETS: EquipSetDef[] = [
  {
    id: 'qingshi',
    name: '青石散修套',
    chapter: 1,
    desc: '青石村铁匠与猎户拼凑出的行头，粗陋却结实，是凡人踏入修途的第一身衣。',
  },
  {
    id: 'heifeng',
    name: '黑风猎妖套',
    chapter: 2,
    desc: '以黑风岭妖兽皮骨所制，行走间自带煞气，专为猎妖而备。',
  },
  {
    id: 'luoxia',
    name: '落霞剑修套',
    chapter: 4,
    desc: '落霞山脉古修洞府所遗的剑修衣冠，剑纹未冷，霞光犹在。',
  },
  {
    id: 'chiyan',
    name: '赤炎灵火套',
    chapter: 5,
    desc: '赤炎秘境熔岩中锻成的火属宝衣，穿之则周身火气流转。',
  },
  {
    id: 'tianyun',
    name: '天云真传套',
    chapter: 9,
    desc: '天云山脉宗门真传弟子的制式宝装，一针一线皆合阵法。',
  },
  {
    id: 'taixu',
    name: '太虚古宝套',
    chapter: 12,
    desc: '虚天遗迹中打捞出的上古宝器，形制古朴，灵力却仍在缓缓自行流转。',
  },
]

const SET_NAMES: Record<string, Record<EquipSlotId, string>> = {
  qingshi: {
    weapon: '青石铁剑',
    crown: '粗布头巾',
    robe: '青石布衣',
    belt: '麻绳腰带',
    bracer: '兽皮护腕',
    boots: '草鞋',
    necklace: '山石挂坠',
    ring: '铜环',
    jade: '半玉片',
    seal: '木刻符印',
  },
  heifeng: {
    weapon: '黑风猎刀',
    crown: '狼首皮盔',
    robe: '黑鳞软甲',
    belt: '妖筋束带',
    bracer: '铁骨护腕',
    boots: '疾风靴',
    necklace: '妖牙链',
    ring: '黑铁指环',
    jade: '镇煞玉',
    seal: '猎妖令',
  },
  luoxia: {
    weapon: '落霞长剑',
    crown: '剑羽冠',
    robe: '霞纹剑袍',
    belt: '剑鞘带',
    bracer: '剑纹护腕',
    boots: '踏霞靴',
    necklace: '剑心坠',
    ring: '藏锋戒',
    jade: '剑鸣玉',
    seal: '剑意法印',
  },
  chiyan: {
    weapon: '赤炎灵剑',
    crown: '火纹冠',
    robe: '焚焰道袍',
    belt: '火蚕丝带',
    bracer: '熔金护腕',
    boots: '踏火靴',
    necklace: '火灵珠链',
    ring: '赤晶戒',
    jade: '焰心玉',
    seal: '火德法印',
  },
  tianyun: {
    weapon: '天云真剑',
    crown: '云纹玉冠',
    robe: '天云真袍',
    belt: '云锦玉带',
    bracer: '云纹护腕',
    boots: '凌云靴',
    necklace: '云心坠',
    ring: '云纹戒',
    jade: '天云玉佩',
    seal: '真传法印',
  },
  taixu: {
    weapon: '太虚古剑',
    crown: '太虚道冠',
    robe: '太虚古袍',
    belt: '虚空束带',
    bracer: '太虚护臂',
    boots: '踏虚靴',
    necklace: '界玦坠',
    ring: '太虚环',
    jade: '太虚古玉',
    seal: '太虚古印',
  },
}

/** 各槽 1 级基础属性，再乘套装台阶 */
const SLOT_BASE: Record<EquipSlotId, { stats: Partial<Stats>; icon: string }> = {
  weapon: { stats: { atk: 12 }, icon: 'sword' },
  crown: { stats: { hp: 45, def: 3 }, icon: 'crown' },
  robe: { stats: { hp: 70, def: 4 }, icon: 'robe' },
  belt: { stats: { hp: 35, def: 2 }, icon: 'belt' },
  bracer: { stats: { atk: 4, def: 4 }, icon: 'bracer' },
  boots: { stats: { hp: 22, eva: 0.004 }, icon: 'boots' },
  necklace: { stats: { hp: 28, crit: 0.002 }, icon: 'necklace' },
  ring: { stats: { atk: 6 }, icon: 'ring' },
  jade: { stats: { hp: 30, hpRegen: 0.001 }, icon: 'jade' },
  seal: { stats: { atk: 3, cdr: 0.002 }, icon: 'seal' },
}

export const EQUIP_TEMPLATES: EquipTemplate[] = SETS.flatMap((set) =>
  EQUIP_SLOTS.map((slot) => ({
    id: `${set.id}_${slot}`,
    name: SET_NAMES[set.id][slot],
    slot,
    set: set.id,
    setId: set.id,
    baseStats: scaleStats(SLOT_BASE[slot].stats, SET_TIER[set.id] ?? 1),
    icon: SLOT_BASE[slot].icon,
    minQuality: SET_MIN_QUALITY[set.id] ?? 'white',
  })),
)

export const EQUIP_TEMPLATE_BY_ID: Record<string, EquipTemplate> = Object.fromEntries(
  EQUIP_TEMPLATES.map((t) => [t.id, t]),
)

/* ------------------------------ 词条池 ------------------------------ */

export const AFFIX_POOL: Affix[] = [
  /* 基础词条 */
  { id: 'af_atk_pct', label: '攻击 +6%', stats: { atk: 0.06 } },
  { id: 'af_hp_pct', label: '生命 +7%', stats: { hp: 0.07 } },
  { id: 'af_def_pct', label: '防御 +8%', stats: { def: 0.08 } },
  { id: 'af_crit', label: '暴击率 +2.5%', stats: { crit: 0.025 } },
  { id: 'af_crit_dmg', label: '暴击伤害 +12%', stats: { critDmg: 0.12 } },
  { id: 'af_aspd', label: '攻击速度 +6%', stats: { aspd: 0.06 } },
  { id: 'af_lifesteal', label: '吸血 +1.8%', stats: { lifesteal: 0.018 } },
  { id: 'af_eva', label: '闪避 +2.2%', stats: { eva: 0.022 } },
  { id: 'af_hit', label: '命中 +4%', stats: { hit: 0.04 } },
  { id: 'af_pen', label: '破甲 +4%', stats: { pen: 0.04 } },
  { id: 'af_cdr', label: '冷却缩减 +3%', stats: { cdr: 0.03 } },
  { id: 'af_shield_power', label: '护盾强度 +6%', stats: { shieldPower: 0.06 } },
  { id: 'af_thorn', label: '反伤 +5%', stats: { thorn: 0.05 } },
  { id: 'af_hp_regen', label: '生命回复 +0.8%/息', stats: { hpRegen: 0.008 } },

  /* Build 词条 */
  { id: 'af_sword_dmg', label: '飞剑伤害 +8%', stats: { swordDmg: 0.08 } },
  { id: 'af_spell_dmg', label: '法术伤害 +8%', stats: { spellDmg: 0.08 } },
  { id: 'af_metal_dmg', label: '金系伤害 +8%', stats: { metalDmg: 0.08 } },
  { id: 'af_wood_dmg', label: '木系伤害 +8%', stats: { woodDmg: 0.08 } },
  { id: 'af_water_dmg', label: '水系伤害 +8%', stats: { waterDmg: 0.08 } },
  { id: 'af_fire_dmg', label: '火系伤害 +8%', stats: { fireDmg: 0.08 } },
  { id: 'af_earth_dmg', label: '土系伤害 +8%', stats: { earthDmg: 0.08 } },
  { id: 'af_summon_dmg', label: '召唤伤害 +9%', stats: { summonDmg: 0.09 } },
  { id: 'af_dot_dmg', label: '持续伤害 +9%', stats: { dotDmg: 0.09 } },
  { id: 'af_sacrifice', label: '献祭收益 +7%', stats: { lifesteal: 0.012, dotDmg: 0.03 } },
  { id: 'af_pet_dmg', label: '灵兽伤害 +10%', stats: { petDmg: 0.1 } },
  { id: 'af_boss_dmg', label: 'Boss 伤害 +7%', stats: { bossDmg: 0.07 } },
  { id: 'af_elite_dmg', label: '精英伤害 +7%', stats: { eliteDmg: 0.07 } },
  { id: 'af_dmg_reduction', label: '伤害减免 +2.5%', stats: { dmgReduction: 0.025 } },

  /* 挂机 / 经济词条 */
  { id: 'af_idle_cultivation', label: '挂机修为 +9%', stats: { idleCultivation: 0.09 } },
  { id: 'af_stone_gain', label: '灵石获取 +9%', stats: { stoneGain: 0.09 } },
  { id: 'af_drop_rate', label: '装备掉率 +6%', stats: { dropRate: 0.06 } },
  { id: 'af_rare_drop_rate', label: '稀有掉率 +3%', stats: { rareDropRate: 0.03 } },

  /* 传奇词条：附带机制，掉率极低 */
  { id: 'af_legend_wanjian', label: '万剑归宗', legendary: true, stats: { swordDmg: 0.15, critDmg: 0.2 } },
  { id: 'af_legend_leize', label: '雷泽共鸣', legendary: true, stats: { metalDmg: 0.16, spellDmg: 0.14 } },
  { id: 'af_legend_bumie', label: '不灭金身', legendary: true, stats: { dmgReduction: 0.06, hp: 0.1 } },
  { id: 'af_legend_xuehai', label: '血海无涯', legendary: true, stats: { lifesteal: 0.05, dotDmg: 0.16 } },
  { id: 'af_legend_lingshou', label: '灵兽同心', legendary: true, stats: { petDmg: 0.18, cdr: 0.05 } },
]

export const AFFIX_BY_ID: Record<string, Affix> = Object.fromEntries(
  AFFIX_POOL.map((a) => [a.id, a]),
)

export const LEGENDARY_AFFIXES: Affix[] = AFFIX_POOL.filter((a) => a.legendary)
const NORMAL_AFFIXES: Affix[] = AFFIX_POOL.filter((a) => !a.legendary)

/* ------------------------------ 品质掉落 ------------------------------ */

/** 基准权重（白装为 100 时的相对概率），实际权重再按关卡与掉率加成调整 */
export const QUALITY_WEIGHTS: Record<Quality, number> = {
  white: 100,
  green: 62,
  blue: 34,
  purple: 11,
  orange: 3.2,
  red: 0.7,
  rainbow: 0.08,
}

export const QUALITY_AFFIX_COUNT: Record<Quality, number> = {
  white: 0,
  green: 1,
  blue: 2,
  purple: 3,
  orange: 4,
  red: 4,
  rainbow: 5,
}

const QUALITY_STAT_MUL: Record<Quality, number> = {
  white: 1,
  green: 1.12,
  blue: 1.28,
  purple: 1.5,
  orange: 1.75,
  red: 2.1,
  rainbow: 2.6,
}

/** 整数属性，其余按百分比保留四位小数 */
const INT_STATS: (keyof Stats)[] = ['hp', 'atk', 'def']

function roundStat(key: keyof Stats, v: number): number {
  return INT_STATS.includes(key) ? Math.round(v) : Math.round(v * 1e4) / 1e4
}

/**
 * 品质判定（PRD 45 章保底原则）：
 * - 前 20 关蓝装权重最多放大 10 倍（前 10 分钟必见蓝装），紫装权重同时 ×3.2，
 *   保证 30 分钟内至少出现一次紫装。
 * - 白 / 绿随关卡推进逐步让位，但始终保留 4 的底权重，不会完全绝迹。
 * - 红 / 彩不吃关卡成长，只吃掉率加成，保持稀缺。
 */
export function rollQuality(base: number, bonus: number, rng: () => number = Math.random): Quality {
  const stage = Math.max(1, base)
  const lateScale = 1 + stage * 0.02 + bonus * 1.8
  const earlyBoost = stage <= 20 ? (21 - stage) / 20 : 0

  const weights = QUALITY_ORDER.map((q, i) => {
    const w = QUALITY_WEIGHTS[q]
    if (i <= 1) return Math.max(4, w * Math.max(0.12, 1 - stage * 0.015))
    if (q === 'red') return w * (1 + stage * 0.01 + bonus * 3)
    if (q === 'rainbow') return w * (1 + stage * 0.006 + bonus * 3)
    let out = w * lateScale
    if (q === 'blue') out *= 1 + earlyBoost * 9
    if (q === 'purple') out *= 1 + earlyBoost * 2.2
    return out
  })

  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return QUALITY_ORDER[i]
  }
  return 'white'
}

function pickAffixes(count: number, quality: Quality, rng: () => number): Affix[] {
  if (count <= 0) return []
  const legendChance = quality === 'rainbow' ? 0.35 : quality === 'red' ? 0.18 : quality === 'orange' ? 0.06 : 0
  const out: Affix[] = []
  if (legendChance > 0 && rng() < legendChance) {
    out.push(LEGENDARY_AFFIXES[Math.floor(rng() * LEGENDARY_AFFIXES.length)])
  }
  const pool = [...NORMAL_AFFIXES]
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  }
  return out
}

export interface RollEquipOptions {
  /** 全局关卡序号 */
  stage: number
  quality?: Quality
  slot?: EquipSlotId
  rng?: () => number
  dropRateBonus?: number
}

/**
 * 属性缩放：等级用 level^0.85 的温和幂函数（200 级约 6.8 倍），
 * 再乘品质与套装台阶。前期（stage 1~50）单件装备总属性只有几十点，
 * 不会让数值失控。
 */
export function rollEquipment(opts: RollEquipOptions): EquipInstance {
  const rng = opts.rng ?? Math.random
  const stage = Math.max(1, Math.floor(opts.stage))
  const bonus = opts.dropRateBonus ?? 0

  const pool = opts.slot ? EQUIP_TEMPLATES.filter((t) => t.slot === opts.slot) : EQUIP_TEMPLATES
  const template = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]

  let quality: Quality = opts.quality ?? rollQuality(stage, bonus, rng)
  if (QUALITY_ORDER.indexOf(quality) < QUALITY_ORDER.indexOf(template.minQuality)) {
    quality = template.minQuality
  }

  const level = Math.max(1, Math.round((stage + 3) * 0.95))
  const mul = Math.pow(level, 0.85) * QUALITY_STAT_MUL[quality]

  const stats: Partial<Stats> = {}
  for (const k of Object.keys(template.baseStats) as (keyof Stats)[]) {
    stats[k] = roundStat(k, (template.baseStats[k] ?? 0) * mul)
  }

  // 词条本身随等级温和放大，避免 200 关时词条仍是开局数值
  const affixScale = 1 + Math.min(1.2, level * 0.01)
  const affixes = pickAffixes(QUALITY_AFFIX_COUNT[quality], quality, rng)
  for (const a of affixes) {
    for (const k of Object.keys(a.stats) as (keyof Stats)[]) {
      stats[k] = roundStat(k, (stats[k] ?? 0) + (a.stats[k] ?? 0) * affixScale)
    }
  }

  return {
    uid: uid('eq'),
    templateId: template.id,
    name: template.name,
    slot: template.slot,
    quality,
    level,
    enhance: 0,
    icon: template.icon,
    stats,
    affixes,
  }
}

/** 装备评分：仅用于排序与快速对比，不等于真实战力 */
export function equipScore(e: EquipInstance): number {
  const s = e.stats
  return Math.round(
    (s.atk ?? 0) * 4 +
      (s.hp ?? 0) * 0.5 +
      (s.def ?? 0) * 2 +
      ((s.crit ?? 0) + (s.critDmg ?? 0) + (s.pen ?? 0) + (s.dmgReduction ?? 0)) * 400,
  )
}
