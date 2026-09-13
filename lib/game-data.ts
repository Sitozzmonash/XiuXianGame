import type { Screen } from './navigation'

/* ------------------------------------------------------------------ */
/* 品质                                                                */
/* ------------------------------------------------------------------ */

export type Quality =
  | 'white'
  | 'green'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'red'
  | 'rainbow'

export const QUALITY: Record<
  Quality,
  { label: string; ring: string; text: string; glow: string }
> = {
  white: { label: '凡品', ring: '#9aa39c', text: '#d7ddd6', glow: 'rgba(154,163,156,0.4)' },
  green: { label: '灵品', ring: '#5cc0ad', text: '#8ad9c8', glow: 'rgba(92,192,173,0.45)' },
  blue: { label: '玄品', ring: '#5b9bd5', text: '#9cc7ec', glow: 'rgba(91,155,213,0.45)' },
  purple: { label: '地品', ring: '#a97bd6', text: '#c9a6ec', glow: 'rgba(169,123,214,0.5)' },
  orange: { label: '天品', ring: '#e0a24a', text: '#f0c47e', glow: 'rgba(224,162,74,0.5)' },
  red: { label: '仙品', ring: '#d24b3a', text: '#f08a7a', glow: 'rgba(210,75,58,0.55)' },
  rainbow: { label: '神品', ring: '#e8c877', text: '#f6e6b8', glow: 'rgba(232,200,119,0.6)' },
}

/* ------------------------------------------------------------------ */
/* 玩家                                                                */
/* ------------------------------------------------------------------ */

export const player = {
  name: '凡尘散人',
  level: 68,
  realm: '炼气中期',
  power: 523000,
  spiritStone: 126000,
  cultivation: 3248000,
  avatar: '/images/player-swordsman.png',
  portrait: '/images/player-portrait.png',
}

export const playerAttributes = [
  { key: '生命', value: '12.6万', icon: 'heart' },
  { key: '攻击', value: '1.8万', icon: 'sword' },
  { key: '防御', value: '8260', icon: 'shield' },
  { key: '暴击率', value: '15.2%', icon: 'spark' },
  { key: '暴击伤害', value: '186.5%', icon: 'burst' },
  { key: '攻速', value: '1.42', icon: 'wind' },
  { key: '闪避', value: '6.8%', icon: 'feather' },
  { key: '吸血', value: '4.2%', icon: 'drop' },
  { key: '破甲', value: '12.0%', icon: 'axe' },
] as const

/* ------------------------------------------------------------------ */
/* 章节 / 关卡                                                          */
/* ------------------------------------------------------------------ */

export const chapters = [
  { id: 1, name: '青石村', progress: 50, total: 50, cleared: true },
  { id: 2, name: '黑风岭', progress: 5, total: 50, cleared: false },
  { id: 3, name: '云泽坊市', progress: 0, total: 50, cleared: false },
  { id: 4, name: '落霞谷', progress: 0, total: 50, cleared: false },
]

export const currentChapter = chapters[1]

export const chapterPoem = '云深不知处，妖风起黑岭。'

/* ------------------------------------------------------------------ */
/* 侧边菜单                                                            */
/* ------------------------------------------------------------------ */

export type MenuItem = {
  id: string
  label: string
  screen: Screen
  icon: string
  redDot?: boolean
}

export const leftMenu: MenuItem[] = [
  { id: 'quest', label: '任务', screen: 'dungeon', icon: 'scroll', redDot: true },
  { id: 'welfare', label: '福利', screen: 'sect', icon: 'gift', redDot: true },
  { id: 'activity', label: '活动', screen: 'dungeon', icon: 'flame', redDot: true },
  { id: 'fate', label: '仙缘', screen: 'ranking', icon: 'lotus' },
]

export const rightMenu: MenuItem[] = [
  { id: 'map', label: '地图', screen: 'home', icon: 'map' },
  { id: 'role', label: '角色', screen: 'character', icon: 'user' },
  { id: 'artifact', label: '法宝', screen: 'build', icon: 'vase' },
  { id: 'technique', label: '功法', screen: 'techniques', icon: 'sword' },
  { id: 'market', label: '坊市', screen: 'sect', icon: 'shop', redDot: true },
]

/* ------------------------------------------------------------------ */
/* 法宝                                                                */
/* ------------------------------------------------------------------ */

export type Treasure = {
  id: string
  name: string
  level: number
  quality: Quality
  icon: string
  cooldown: number
  ready: number
  damage: string
  type: string
  desc: string
}

export const activeTreasures: Treasure[] = [
  {
    id: 'flying-sword',
    name: '飞剑术',
    level: 32,
    quality: 'blue',
    icon: 'sword',
    cooldown: 3.2,
    ready: 1,
    damage: '1,240',
    type: '单体 · 穿透',
    desc: '御剑千里，取敌首级。对单体造成 240% 攻击伤害，并穿透 30% 防御。',
  },
  {
    id: 'ward-talisman',
    name: '镇邪符',
    level: 18,
    quality: 'orange',
    icon: 'talisman',
    cooldown: 8,
    ready: 0.6,
    damage: '860',
    type: '范围 · 灼烧',
    desc: '朱砂敕令，镇压邪祟。对范围内敌人造成 180% 伤害并附加灼烧。',
  },
  {
    id: 'clear-wind',
    name: '清风诀',
    level: 24,
    quality: 'green',
    icon: 'wind',
    cooldown: 6,
    ready: 0.35,
    damage: '640',
    type: '自身 · 增益',
    desc: '清风拂体，身法如风。提升自身攻速 25%，持续 6 秒。',
  },
  {
    id: 'soul-banner',
    name: '摄魂咒',
    level: 12,
    quality: 'purple',
    icon: 'banner',
    cooldown: 12,
    ready: 0.9,
    damage: '1,580',
    type: '魂系 · 吸血',
    desc: '摄魂夺魄，反哺己身。造成 300% 伤害并回复 20% 已造成伤害。',
  },
  {
    id: 'thunder-rite',
    name: '五雷诀',
    level: 9,
    quality: 'red',
    icon: 'thunder',
    cooldown: 15,
    ready: 0.2,
    damage: '2,460',
    type: '范围 · 爆发',
    desc: '五雷轰顶，天威浩荡。对全体敌人造成 420% 雷属性伤害。',
  },
]

export const passiveTreasures: Treasure[] = [
  {
    id: 'green-wood-seal',
    name: '青木印',
    level: 20,
    quality: 'green',
    icon: 'seal',
    cooldown: 0,
    ready: 1,
    damage: '—',
    type: '被动 · 回复',
    desc: '每 5 秒回复 2% 最大生命。',
  },
  {
    id: 'black-tortoise',
    name: '玄龟甲',
    level: 16,
    quality: 'blue',
    icon: 'tortoise',
    cooldown: 0,
    ready: 1,
    damage: '—',
    type: '被动 · 减伤',
    desc: '受到伤害降低 12%，生命低于 30% 时额外降低 10%。',
  },
]

/* ------------------------------------------------------------------ */
/* 装备                                                                */
/* ------------------------------------------------------------------ */

export type EquipmentSlot = {
  id: string
  label: string
  item?: { name: string; level: number; quality: Quality; icon: string }
}

export const equipmentSlots: EquipmentSlot[] = [
  { id: 'weapon', label: '武器', item: { name: '青霄飞剑', level: 32, quality: 'orange', icon: 'sword' } },
  { id: 'crown', label: '头冠', item: { name: '流云冠', level: 28, quality: 'purple', icon: 'crown' } },
  { id: 'robe', label: '道袍', item: { name: '玄元道袍', level: 30, quality: 'orange', icon: 'robe' } },
  { id: 'belt', label: '腰带', item: { name: '玉带', level: 22, quality: 'blue', icon: 'belt' } },
  { id: 'bracer', label: '护腕', item: { name: '玄铁护腕', level: 25, quality: 'purple', icon: 'bracer' } },
  { id: 'boots', label: '靴子', item: { name: '踏云靴', level: 24, quality: 'blue', icon: 'boots' } },
  { id: 'necklace', label: '项链', item: { name: '灵犀链', level: 20, quality: 'green', icon: 'necklace' } },
  { id: 'ring', label: '戒指', item: { name: '纳灵戒', level: 26, quality: 'purple', icon: 'ring' } },
  { id: 'jade', label: '玉佩', item: { name: '养魂玉', level: 18, quality: 'green', icon: 'jade' } },
  { id: 'seal', label: '法印', item: { name: '镇岳印', level: 15, quality: 'blue', icon: 'seal' } },
]

/* ------------------------------------------------------------------ */
/* 背包                                                                */
/* ------------------------------------------------------------------ */

export type Item = {
  id: string
  name: string
  level: number
  quality: Quality
  icon: string
  category: '装备' | '法宝' | '材料' | '丹药' | '其他'
  locked?: boolean
  upgrade?: boolean
  enhance?: number
}

export const inventoryItems: Item[] = [
  { id: 'i1', name: '青霄飞剑', level: 32, quality: 'orange', icon: 'sword', category: '装备', enhance: 7, upgrade: true },
  { id: 'i2', name: '玄元道袍', level: 30, quality: 'orange', icon: 'robe', category: '装备', enhance: 5 },
  { id: 'i3', name: '流云冠', level: 28, quality: 'purple', icon: 'crown', category: '装备', enhance: 4, locked: true },
  { id: 'i4', name: '玄铁护腕', level: 25, quality: 'purple', icon: 'bracer', category: '装备', enhance: 3 },
  { id: 'i5', name: '踏云靴', level: 24, quality: 'blue', icon: 'boots', category: '装备', enhance: 2 },
  { id: 'i6', name: '玉带', level: 22, quality: 'blue', icon: 'belt', category: '装备' },
  { id: 'i7', name: '灵犀链', level: 20, quality: 'green', icon: 'necklace', category: '装备' },
  { id: 'i8', name: '养魂玉', level: 18, quality: 'green', icon: 'jade', category: '装备' },
  { id: 'i9', name: '镇岳印', level: 15, quality: 'blue', icon: 'seal', category: '法宝', enhance: 1 },
  { id: 'i10', name: '青木印', level: 20, quality: 'green', icon: 'seal', category: '法宝' },
  { id: 'i11', name: '玄龟甲', level: 16, quality: 'blue', icon: 'tortoise', category: '法宝' },
  { id: 'i12', name: '摄魂幡', level: 12, quality: 'purple', icon: 'banner', category: '法宝', upgrade: true },
  { id: 'i13', name: '五雷符', level: 9, quality: 'red', icon: 'thunder', category: '法宝' },
  { id: 'i14', name: '玄铁', level: 1, quality: 'blue', icon: 'ore', category: '材料' },
  { id: 'i15', name: '灵木', level: 1, quality: 'green', icon: 'wood', category: '材料' },
  { id: 'i16', name: '妖丹', level: 1, quality: 'purple', icon: 'orb', category: '材料' },
  { id: 'i17', name: '地脉灵髓', level: 1, quality: 'orange', icon: 'crystal', category: '材料' },
  { id: 'i18', name: '筑基丹', level: 1, quality: 'orange', icon: 'pill', category: '丹药' },
  { id: 'i19', name: '聚气丹', level: 1, quality: 'blue', icon: 'pill', category: '丹药' },
  { id: 'i20', name: '回春丹', level: 1, quality: 'green', icon: 'pill', category: '丹药' },
  { id: 'i21', name: '藏宝图', level: 1, quality: 'purple', icon: 'scroll', category: '其他' },
  { id: 'i22', name: '宗门令', level: 1, quality: 'blue', icon: 'token', category: '其他' },
  { id: 'i23', name: '灵石袋', level: 1, quality: 'green', icon: 'pouch', category: '其他' },
  { id: 'i24', name: '残破剑谱', level: 1, quality: 'white', icon: 'book', category: '其他' },
]

export const inventoryTabs = ['全部', '装备', '法宝', '材料', '丹药', '其他'] as const
export const inventoryCapacity = { used: 182, total: 300 }

/* ------------------------------------------------------------------ */
/* 功法                                                                */
/* ------------------------------------------------------------------ */

export type Technique = {
  id: string
  name: string
  level: number
  quality: Quality
  school: '剑诀' | '法术' | '体术' | '魔功'
  icon: string
  desc: string
  effects: string[]
}

export const techniques: Technique[] = [
  {
    id: 't1',
    name: '青元剑诀',
    level: 3,
    quality: 'purple',
    school: '剑诀',
    icon: 'sword',
    desc: '剑气如虹，斩妖除邪。',
    effects: ['飞剑伤害 +12%', '暴击率 +3%'],
  },
  {
    id: 't2',
    name: '五雷真诀',
    level: 2,
    quality: 'orange',
    school: '法术',
    icon: 'thunder',
    desc: '引天雷，覆万敌。',
    effects: ['雷法伤害 +18%', '范围 +1'],
  },
  {
    id: 't3',
    name: '玄武金身诀',
    level: 1,
    quality: 'blue',
    school: '体术',
    icon: 'shield',
    desc: '肉身如岳，不动如山。',
    effects: ['防御 +15%', '减伤 +6%'],
  },
  {
    id: 't4',
    name: '血煞魔功',
    level: 1,
    quality: 'red',
    school: '魔功',
    icon: 'drop',
    desc: '以血为引，吞噬生机。',
    effects: ['吸血 +8%', '攻击 +10%'],
  },
  {
    id: 't5',
    name: '清风剑意',
    level: 4,
    quality: 'green',
    school: '剑诀',
    icon: 'wind',
    desc: '剑随心动，快若清风。',
    effects: ['攻速 +10%', '闪避 +4%'],
  },
  {
    id: 't6',
    name: '离火焚天诀',
    level: 2,
    quality: 'orange',
    school: '法术',
    icon: 'flame',
    desc: '离火燎原，焚尽八荒。',
    effects: ['火法伤害 +20%', '灼烧 +2 层'],
  },
]

export const techniqueTabs = ['全部', '剑诀', '法术', '体术', '魔功'] as const

/* ------------------------------------------------------------------ */
/* 境界                                                                */
/* ------------------------------------------------------------------ */

export const realms = [
  '炼气', '筑基', '结丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫', '飞升',
]

export const realmState = {
  current: '炼气中期',
  cultivation: 3248000,
  cultivationMax: 5000000,
  conditions: [
    { label: '修为达到 500万', value: '324.8万 / 500万', met: false },
    { label: '筑基丹', value: '3 / 3', met: true },
    { label: '地脉灵髓', value: '1 / 1', met: true },
  ],
}

/* ------------------------------------------------------------------ */
/* 流派 / Build                                                        */
/* ------------------------------------------------------------------ */

export type BuildPlan = {
  id: string
  name: string
  school: string
  tagline: string
  desc: string
  tags: string[]
  power: number
  quality: Quality
  icon: string
}

export const buildPlans: BuildPlan[] = [
  {
    id: 'sword',
    name: '剑修',
    school: '剑修',
    tagline: '以剑入道，剑气纵横',
    desc: '高速、多飞剑、暴击、穿透。',
    tags: ['高爆发', '单体强', '持续输出'],
    power: 523000,
    quality: 'blue',
    icon: 'sword',
  },
  {
    id: 'spell',
    name: '法修',
    school: '法修',
    tagline: '五行法术，术法万千',
    desc: '雷法、火法、范围爆发。',
    tags: ['范围', '爆发', '清怪快'],
    power: 498000,
    quality: 'orange',
    icon: 'thunder',
  },
  {
    id: 'body',
    name: '体修',
    school: '体修',
    tagline: '肉身成圣，力镇山河',
    desc: '高血、防御、护盾、反伤。',
    tags: ['高生存', '反伤', '护盾'],
    power: 471000,
    quality: 'green',
    icon: 'shield',
  },
  {
    id: 'demon',
    name: '魔修',
    school: '魔修',
    tagline: '吞噬生灵，逆天而行',
    desc: '吸血、魂系、召唤、持续伤害。',
    tags: ['吸血', '召唤', '持续伤害'],
    power: 505000,
    quality: 'red',
    icon: 'drop',
  },
]

export const buildPlanTabs = ['方案一', '方案二', '方案三'] as const

/* ------------------------------------------------------------------ */
/* 洞府                                                                */
/* ------------------------------------------------------------------ */

export type Building = {
  id: string
  name: string
  level: number
  icon: string
  x: number
  y: number
  claimable?: boolean
}

export const caveBuildings: Building[] = [
  { id: 'spirit-array', name: '聚灵阵', level: 5, icon: 'array', x: 30, y: 22, claimable: true },
  { id: 'alchemy', name: '炼丹房', level: 3, icon: 'furnace', x: 68, y: 30 },
  { id: 'forge', name: '炼器室', level: 4, icon: 'anvil', x: 24, y: 58 },
  { id: 'field', name: '灵田', level: 3, icon: 'field', x: 62, y: 66, claimable: true },
  { id: 'beast', name: '灵兽园', level: 2, icon: 'beast', x: 44, y: 44 },
  { id: 'library', name: '藏经阁', level: 3, icon: 'library', x: 78, y: 52 },
]

/* ------------------------------------------------------------------ */
/* 宗门                                                                */
/* ------------------------------------------------------------------ */

export const sect = {
  name: '青云宗',
  level: 3,
  contribution: 28,
  contributionMax: 300,
  role: '外门弟子',
  members: 28,
  membersMax: 30,
  notice: '大道无争，勤修不辍。',
  functions: [
    { id: 'quest', label: '宗门任务', icon: 'scroll' },
    { id: 'shop', label: '宗门商店', icon: 'shop' },
    { id: 'dungeon', label: '宗门秘境', icon: 'gate' },
    { id: 'technique', label: '宗门功法', icon: 'book' },
  ],
}

/* ------------------------------------------------------------------ */
/* 秘境                                                                */
/* ------------------------------------------------------------------ */

export type Dungeon = {
  id: string
  name: string
  reward: string
  recommend: string
  remaining: number
  total: number
  quality: Quality
  image: string
}

export const dungeons: Dungeon[] = [
  {
    id: 'beast',
    name: '妖兽秘境',
    reward: '大量装备 · 材料',
    recommend: '推荐战力 48万',
    remaining: 3,
    total: 3,
    quality: 'orange',
    image: '/images/boss-black-wolf.png',
  },
  {
    id: 'stone',
    name: '灵石秘境',
    reward: '大量灵石',
    recommend: '推荐战力 40万',
    remaining: 2,
    total: 3,
    quality: 'blue',
    image: '/images/bg-ink-mountains.png',
  },
  {
    id: 'forge',
    name: '炼器秘境',
    reward: '炼器材料',
    recommend: '推荐战力 52万',
    remaining: 1,
    total: 2,
    quality: 'purple',
    image: '/images/cave-dwelling.png',
  },
  {
    id: 'cultivation',
    name: '修为秘境',
    reward: '大量修为',
    recommend: '推荐战力 45万',
    remaining: 5,
    total: 5,
    quality: 'green',
    image: '/images/sect-gate.png',
  },
]

/* ------------------------------------------------------------------ */
/* 排行榜                                                              */
/* ------------------------------------------------------------------ */

export type RankEntry = {
  rank: number
  name: string
  realm: string
  stage: string
  value: string
  avatar?: string
}

export const rankingTabs = ['最高关卡', '综合战力', '修仙境界'] as const

export const ranking: RankEntry[] = [
  { rank: 1, name: '剑来', realm: '元婴初期', stage: '12-50', value: '856.3万' },
  { rank: 2, name: '一念成仙', realm: '结丹后期', stage: '11-30', value: '742.1万' },
  { rank: 3, name: '清风道人', realm: '结丹中期', stage: '10-20', value: '689.4万' },
  { rank: 4, name: '逍遥子', realm: '结丹初期', stage: '10-15', value: '621.0万' },
  { rank: 5, name: '夜雨', realm: '筑基后期', stage: '9-50', value: '602.3万' },
  { rank: 6, name: '孤鸿', realm: '筑基中期', stage: '9-12', value: '588.7万' },
  { rank: 7, name: '青莲居士', realm: '筑基初期', stage: '8-40', value: '561.2万' },
  { rank: 8, name: '踏雪无痕', realm: '炼气后期', stage: '7-28', value: '540.9万' },
]

export const myRank: RankEntry = {
  rank: 32,
  name: '凡尘散人',
  realm: '炼气中期',
  stage: '黑风岭 5-50',
  value: '52.3万',
}

/* ------------------------------------------------------------------ */
/* 战斗                                                                */
/* ------------------------------------------------------------------ */

export const battleState = {
  bossName: '黑风妖狼',
  bossHp: 0.62,
  bossHpText: '18.4万 / 29.6万',
  playerHp: 1,
  playerHpText: '5.2万 / 5.2万',
  damageNumbers: ['-3285', '-4162', '-2951'],
  auto: true,
  speed: 1,
}

/* ------------------------------------------------------------------ */
/* 挂机收益                                                            */
/* ------------------------------------------------------------------ */

export const idleReward = {
  offline: '08:26:12',
  cultivation: '+128万',
  spiritStone: '+32万',
  equipment: 18,
  material: 37,
}

/* ------------------------------------------------------------------ */
/* 装备详情示例                                                        */
/* ------------------------------------------------------------------ */

export const equipmentDetail = {
  name: '玄元道袍',
  quality: 'orange' as Quality,
  tier: '元婴 · 极品',
  mainStats: ['防御 +1240', '生命 +8.5%'],
  affixes: ['暴击率 +3.8%', '飞剑伤害 +12.4%', 'Boss伤害 +7.2%'],
}
