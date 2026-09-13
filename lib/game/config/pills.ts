import type { Quality, Stats } from '../types'

export interface PillDef {
  id: string
  name: string
  category: 'cultivation' | 'breakthrough' | 'battle' | 'permanent'
  quality: Quality
  icon: string
  desc: string
  effect: {
    /** 直接获得的修为 */
    cultivation?: number
    /** 服下后获得的属性（battle 类为限时，permanent 类为永久） */
    stats?: Partial<Stats>
    /** 持续时间（秒），仅 battle 类有效 */
    duration?: number
  }
}

/* ------------------------------------------------------------------ *
 * 30 个丹药（PRD 22 章）
 * cultivation 类给固定修为，数值按境界台阶翻倍；
 * battle 类限时 30~60 秒，倍率型属性（如 crit / dmgReduction）不超过 0.15；
 * permanent 类每颗只加微量永久属性，靠数量积累。
 * ------------------------------------------------------------------ */
export const PILLS: PillDef[] = [
  /* ------------------------------ 修为类 ------------------------------ */
  {
    id: 'pill_juqi_dan',
    name: '聚气丹',
    category: 'cultivation',
    quality: 'green',
    icon: 'pill',
    desc: '最寻常的修行丹药，聚散逸灵气为一缕修为。',
    effect: { cultivation: 1200 },
  },
  {
    id: 'pill_ningyuan_dan',
    name: '凝元丹',
    category: 'cultivation',
    quality: 'blue',
    icon: 'pill',
    desc: '凝元固本，服后元气不散，修为增速更稳。',
    effect: { cultivation: 6000 },
  },
  {
    id: 'pill_zhuji_lingye',
    name: '筑基灵液',
    category: 'cultivation',
    quality: 'purple',
    icon: 'bottle',
    desc: '以地脉灵髓化开的灵液，筑基前服下可平血气。',
    effect: { cultivation: 26000 },
  },
  {
    id: 'pill_jinyuan_dan',
    name: '金元丹',
    category: 'cultivation',
    quality: 'purple',
    icon: 'pill',
    desc: '丹成金色，服之如饮金液，元力浑厚绵长。',
    effect: { cultivation: 120000 },
  },
  {
    id: 'pill_yuanying_yangshen',
    name: '元婴养神丹',
    category: 'cultivation',
    quality: 'orange',
    icon: 'pill',
    desc: '温养元婴之物，可省去数十年静养之功。',
    effect: { cultivation: 520000 },
  },
  {
    id: 'pill_huashen_wudao',
    name: '化神悟道丹',
    category: 'cultivation',
    quality: 'red',
    icon: 'orb',
    desc: '服后神思澄明，识海自开，常有一悟之机。',
    effect: { cultivation: 2200000 },
  },
  {
    id: 'pill_lianxu_guiyuan',
    name: '炼虚归元丹',
    category: 'cultivation',
    quality: 'red',
    icon: 'orb',
    desc: '炼虚修士的立身之丹，一丹可抵百年苦修。',
    effect: { cultivation: 9000000 },
  },

  /* ------------------------------ 突破类 ------------------------------ */
  {
    id: 'pill_zhuji_dan',
    name: '筑基丹',
    category: 'breakthrough',
    quality: 'orange',
    icon: 'pill',
    desc: '凡人踏入修途的第一道门槛，可提升筑基成功率。',
    effect: { stats: { hp: 200, def: 20 } },
  },
  {
    id: 'pill_ningdan_wan',
    name: '凝丹丸',
    category: 'breakthrough',
    quality: 'orange',
    icon: 'pill',
    desc: '凝气成丹之引，助修士将一身灵气收束为金丹。',
    effect: { stats: { atk: 30, hp: 400 } },
  },
  {
    id: 'pill_yangying_dan',
    name: '养婴丹',
    category: 'breakthrough',
    quality: 'red',
    icon: 'orb',
    desc: '元婴初成时最为脆弱，此丹可护婴魂不散。',
    effect: { stats: { hp: 800, hpRegen: 0.01 } },
  },
  {
    id: 'pill_huashen_dan',
    name: '化神丹',
    category: 'breakthrough',
    quality: 'red',
    icon: 'orb',
    desc: '化神之劫凶险，此丹能稳识海、定神魂。',
    effect: { stats: { atk: 60, cdr: 0.01 } },
  },
  {
    id: 'pill_poqu_dan',
    name: '破虚丹',
    category: 'breakthrough',
    quality: 'red',
    icon: 'crystal',
    desc: '碎虚空之壁、开炼虚之门，服之如隔雾观山。',
    effect: { stats: { pen: 0.02, atk: 90 } },
  },
  {
    id: 'pill_hetian_dan',
    name: '合天丹',
    category: 'breakthrough',
    quality: 'rainbow',
    icon: 'orb',
    desc: '合天道者，先合己身。此丹使肉身与元神交融无隙。',
    effect: { stats: { hp: 2000, dmgReduction: 0.02 } },
  },
  {
    id: 'pill_dacheng_dan',
    name: '大乘丹',
    category: 'breakthrough',
    quality: 'rainbow',
    icon: 'orb',
    desc: '传说中的道果所炼，服之可窥大乘一线。',
    effect: { stats: { atk: 160, hp: 3000 } },
  },
  {
    id: 'pill_dujie_huxin',
    name: '渡劫护心丹',
    category: 'breakthrough',
    quality: 'rainbow',
    icon: 'shield',
    desc: '天雷加身时护住心脉，是渡劫者最后一道底牌。',
    effect: { stats: { dmgReduction: 0.03, hp: 4000 } },
  },

  /* ------------------------------ 战斗类 ------------------------------ */
  {
    id: 'pill_baoxue_dan',
    name: '暴血丹',
    category: 'battle',
    quality: 'blue',
    icon: 'blood',
    desc: '燃血催力，短时攻击大涨，然药力过后必然虚脱。',
    effect: { stats: { atk: 0.25 }, duration: 30 },
  },
  {
    id: 'pill_jingang_dan',
    name: '金刚丹',
    category: 'battle',
    quality: 'blue',
    icon: 'shield',
    desc: '药力如铁，皮膜一硬，刀剑难入。',
    effect: { stats: { def: 0.3, dmgReduction: 0.08 }, duration: 40 },
  },
  {
    id: 'pill_qingxin_dan',
    name: '清心丹',
    category: 'battle',
    quality: 'blue',
    icon: 'lotus',
    desc: '清心定神，可解昏眩与心魔侵扰。',
    effect: { stats: { dmgReduction: 0.06, eva: 0.05 }, duration: 45 },
  },
  {
    id: 'pill_pojia_dan',
    name: '破甲丹',
    category: 'battle',
    quality: 'purple',
    icon: 'axe',
    desc: '药力锋锐，出手专寻甲缝，破敌护体如裂纸。',
    effect: { stats: { pen: 0.12 }, duration: 40 },
  },
  {
    id: 'pill_leiyuan_dan',
    name: '雷元丹',
    category: 'battle',
    quality: 'purple',
    icon: 'thunder',
    desc: '吞服时口齿发麻，雷法威力短时大增。',
    effect: { stats: { metalDmg: 0.12, spellDmg: 0.1 }, duration: 40 },
  },
  {
    id: 'pill_huoling_dan',
    name: '火灵丹',
    category: 'battle',
    quality: 'purple',
    icon: 'flame',
    desc: '丹中封着一缕地火，服后吐息皆带灼意。',
    effect: { stats: { fireDmg: 0.12, dotDmg: 0.1 }, duration: 40 },
  },
  {
    id: 'pill_xuanshui_dan',
    name: '玄水丹',
    category: 'battle',
    quality: 'purple',
    icon: 'water',
    desc: '寒水入喉，周身水气流转，攻守皆得其润。',
    effect: { stats: { waterDmg: 0.12, shieldPower: 0.15 }, duration: 40 },
  },
  {
    id: 'pill_qingmu_dan',
    name: '青木丹',
    category: 'battle',
    quality: 'green',
    icon: 'wood',
    desc: '木气生生不息，服药后旧伤自愈。',
    effect: { stats: { hpRegen: 0.04, woodDmg: 0.1 }, duration: 60 },
  },
  {
    id: 'pill_houtu_dan',
    name: '厚土丹',
    category: 'battle',
    quality: 'green',
    icon: 'earth',
    desc: '土德厚重，服药后立足如山，反伤之力亦增。',
    effect: { stats: { thorn: 0.1, dmgReduction: 0.06 }, duration: 50 },
  },

  /* ------------------------------ 永久 / 特殊 ------------------------------ */
  {
    id: 'pill_xisui_dan',
    name: '洗髓丹',
    category: 'permanent',
    quality: 'orange',
    icon: 'pill',
    desc: '洗去凡骨浊气，永久提升基础生命与防御。',
    effect: { stats: { hp: 30, def: 2 } },
  },
  {
    id: 'pill_yanghun_dan',
    name: '养魂丹',
    category: 'permanent',
    quality: 'orange',
    icon: 'orb',
    desc: '长年服用可固神魂，永久提升生命回复与减伤。',
    effect: { stats: { hpRegen: 0.0005, dmgReduction: 0.001 } },
  },
  {
    id: 'pill_linggen_suxing',
    name: '灵根塑形丹',
    category: 'permanent',
    quality: 'red',
    icon: 'lotus',
    desc: '重塑灵根之用，可调整五行倾向，一生限服数枚。',
    effect: { stats: { spellDmg: 0.004 } },
  },
  {
    id: 'pill_yanshou_dan',
    name: '延寿丹',
    category: 'permanent',
    quality: 'red',
    icon: 'candle',
    desc: '凡人以之延寿，修士以之延缓燃寿魔功的反噬。',
    effect: { stats: { hp: 60, hpRegen: 0.0006 } },
  },
  {
    id: 'pill_jinghun_dan',
    name: '净魂丹',
    category: 'permanent',
    quality: 'red',
    icon: 'purify',
    desc: '净化被仙纹污染的神魂，长期服用可压低仙蚀。',
    effect: { stats: { dmgReduction: 0.0015, dotDmg: 0.003 } },
  },
  {
    id: 'pill_xianshi_yizhi',
    name: '仙蚀抑制丹',
    category: 'permanent',
    quality: 'rainbow',
    icon: 'shard',
    desc: '以仙纹残片与道心莲合炼，是压制仙蚀的最后手段。',
    effect: { stats: { dmgReduction: 0.002, hp: 80 } },
  },
]

export const PILL_BY_ID: Record<string, PillDef> = Object.fromEntries(
  PILLS.map((p) => [p.id, p]),
)

export const PILL_CATEGORY_LABEL: Record<PillDef['category'], string> = {
  cultivation: '修为丹',
  breakthrough: '突破丹',
  battle: '战斗丹',
  permanent: '永久丹',
}
