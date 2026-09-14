/* ------------------------------------------------------------------ *
 * 《凡尘问道》核心类型定义
 * 本文件是引擎 / 配置 / UI 三方共同遵守的唯一契约。
 * 任何模块不得自行定义与存档相关的类型。
 * ------------------------------------------------------------------ */

/* ------------------------------ 品质 ------------------------------ */

export type Quality =
  | 'white'
  | 'green'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'red'
  | 'rainbow'

export const QUALITY_ORDER: Quality[] = [
  'white',
  'green',
  'blue',
  'purple',
  'orange',
  'red',
  'rainbow',
]

export type Element = 'metal' | 'wood' | 'water' | 'fire' | 'earth'

export type DamageType = Element | 'physical' | 'soul' | 'true'

/* ------------------------------ 属性 ------------------------------ */

/** 全部战斗属性。缺失的键按 0 处理（百分比属性用小数，如 0.15 = 15%）。 */
export interface Stats {
  hp: number
  atk: number
  def: number
  aspd: number
  crit: number
  critDmg: number
  hit: number
  eva: number
  lifesteal: number
  pen: number
  dmgReduction: number
  cdr: number
  shieldPower: number
  thorn: number
  hpRegen: number
  /** 五行增伤 */
  metalDmg: number
  woodDmg: number
  waterDmg: number
  fireDmg: number
  earthDmg: number
  /** 流派增伤 */
  swordDmg: number
  spellDmg: number
  summonDmg: number
  dotDmg: number
  petDmg: number
  bossDmg: number
  eliteDmg: number
  /** 收益类 */
  idleCultivation: number
  stoneGain: number
  dropRate: number
  rareDropRate: number
}

export const ZERO_STATS: Stats = {
  hp: 0,
  atk: 0,
  def: 0,
  aspd: 0,
  crit: 0,
  critDmg: 0,
  hit: 0,
  eva: 0,
  lifesteal: 0,
  pen: 0,
  dmgReduction: 0,
  cdr: 0,
  shieldPower: 0,
  thorn: 0,
  hpRegen: 0,
  metalDmg: 0,
  woodDmg: 0,
  waterDmg: 0,
  fireDmg: 0,
  earthDmg: 0,
  swordDmg: 0,
  spellDmg: 0,
  summonDmg: 0,
  dotDmg: 0,
  petDmg: 0,
  bossDmg: 0,
  eliteDmg: 0,
  idleCultivation: 0,
  stoneGain: 0,
  dropRate: 0,
  rareDropRate: 0,
}

export type StatKey = keyof Stats

/* ------------------------------ 境界 ------------------------------ */

export type RealmId =
  | 'qi_refining'
  | 'foundation'
  | 'core_formation'
  | 'nascent_soul'
  | 'spirit_transform'
  | 'void_refining'
  | 'body_integration'
  | 'great_vehicle'
  | 'tribulation'
  | 'ascension'

export interface RealmStage {
  id: string
  label: string
  /** 该阶段修为上限 */
  cultivationMax: number
  /** 突破到下一阶段所需材料 */
  breakthroughMaterials?: { id: string; count: number }[]
  /** 突破 Boss / 心魔 */
  breakthroughBoss?: string
  /** 突破后解锁的功能 id */
  unlocks?: string[]
}

export interface RealmDef {
  id: RealmId
  name: string
  /** 该大境界的属性倍率 */
  multiplier: number
  /** 防御常数，随境界增长 */
  defenseConstant: number
  stages: RealmStage[]
}

/* ------------------------------ 灵根 ------------------------------ */

export type SpiritRootQuality =
  | 'mixed'
  | 'quad'
  | 'triple'
  | 'dual'
  | 'single'
  | 'heaven'

export interface SpiritRoot {
  quality: SpiritRootQuality
  /** 五行权重，值越大越偏向该系 */
  elements: Partial<Record<Element, number>>
}

/* ------------------------------ 装备 ------------------------------ */

export type EquipSlotId =
  | 'weapon'
  | 'crown'
  | 'robe'
  | 'belt'
  | 'bracer'
  | 'boots'
  | 'necklace'
  | 'ring'
  | 'jade'
  | 'seal'

export const EQUIP_SLOTS: EquipSlotId[] = [
  'weapon',
  'crown',
  'robe',
  'belt',
  'bracer',
  'boots',
  'necklace',
  'ring',
  'jade',
  'seal',
]

export const EQUIP_SLOT_LABEL: Record<EquipSlotId, string> = {
  weapon: '武器',
  crown: '头冠',
  robe: '道袍',
  belt: '腰带',
  bracer: '护腕',
  boots: '靴子',
  necklace: '项链',
  ring: '戒指',
  jade: '玉佩',
  seal: '法印',
}

export interface Affix {
  id: string
  label: string
  stats: Partial<Stats>
  /** 传奇词条：附带特殊机制说明 */
  legendary?: boolean
}

export interface EquipInstance {
  uid: string
  /** 配置模板 id（equipment.json） */
  templateId: string
  name: string
  slot: EquipSlotId
  quality: Quality
  /** 装备等级 */
  level: number
  /** 强化等级 */
  enhance: number
  icon: string
  stats: Partial<Stats>
  affixes: Affix[]
  locked?: boolean
}

/* ------------------------------ 法宝 ------------------------------ */

export type TreasureKind = 'active' | 'passive'

export interface TreasureDef {
  id: string
  name: string
  kind: TreasureKind
  /** 施放类型，决定战斗表现 */
  cast: 'projectile' | 'aoe' | 'buff' | 'summon' | 'dot' | 'shield' | 'heal' | 'aura'
  damageType: DamageType
  /** 技能倍率（相对 ATK） */
  scale: number
  cooldown: number
  /** 起始冷却 */
  initialCd?: number
  quality: Quality
  icon: string
  /** 目标数量，0 / 省略 = 单体 */
  targets?: number
  duration?: number
  desc: string
  unlockStage?: number
}

export interface TreasureInstance {
  uid: string
  defId: string
  level: number
  /** 法宝阶数，影响倍率 */
  tier: number
  equipped: boolean
}

/* ------------------------------ 功法 ------------------------------ */

export type School = 'sword' | 'spell' | 'body' | 'demon' | 'common'

export const SCHOOL_LABEL: Record<School, string> = {
  sword: '剑修',
  spell: '法修',
  body: '体修',
  demon: '魔修',
  common: '通用',
}

export interface TechniqueDef {
  id: string
  name: string
  school: School
  quality: Quality
  icon: string
  /** 主修 / 辅助 */
  role: 'main' | 'support'
  desc: string
  /** 每级提供的属性 */
  perLevel: Partial<Stats>
  maxLevel: number
}

export interface TechniqueProgress {
  defId: string
  level: number
}

/* ------------------------------ 灵兽 ------------------------------ */

export interface PetDef {
  id: string
  name: string
  quality: Quality
  icon: string
  /** 出战技能 */
  skill: {
    cast: 'heal' | 'shield' | 'buff' | 'aoe' | 'dot' | 'summon'
    damageType: DamageType
    scale: number
    cooldown: number
    desc: string
  }
  passive: Partial<Stats>
  desc: string
}

/* ------------------------------ 怪物 / Boss ------------------------------ */

export type MonsterKind = 'normal' | 'elite' | 'boss'

/** Boss 机制，见 PRD 14 章 */
export type BossMechanic =
  | 'shield'
  | 'enrage'
  | 'summon'
  | 'lifesteal'
  | 'thorn'
  | 'evade'
  | 'control'
  | 'resist'
  | 'burst'
  | 'dot'
  | 'treasure_seal'
  | 'damage_threshold'
  | 'phase'
  | 'weak_window'

export interface MonsterDef {
  id: string
  name: string
  kind: MonsterKind
  icon: string
  element: DamageType
  /** 相对基准的倍率 */
  hpMul: number
  atkMul: number
  defMul: number
  aspd: number
  /** 掉落权重加成 */
  dropBonus?: number
  bossMechanics?: BossMechanic[]
  /** Boss 专属技能 */
  skills?: { name: string; cast: TreasureDef['cast']; scale: number; cooldown: number; damageType: DamageType }[]
  desc?: string
}

/* ------------------------------ 地图 / 关卡 ------------------------------ */

export interface MapStage {
  index: number
  name: string
  kind: MonsterKind | 'event'
  monsterId?: string
  /** 该关触发的主线 / 奇遇节点 id */
  storyId?: string
  /** 秘境入口 */
  realmId?: string
  desc?: string
}

export interface MapDef {
  id: string
  chapter: number
  name: string
  poem: string
  bg: string
  /** 基准怪物属性 */
  base: { hp: number; atk: number; def: number }
  /** 每关成长系数 */
  growth: { hp: number; atk: number; def: number }
  monsters: string[]
  elites: string[]
  bosses: string[]
  stages: MapStage[]
  unlockRealm?: RealmId
}

/* ------------------------------ 剧情 / 奇遇 ------------------------------ */

export type StoryNodeType = 'dialogue' | 'encounter' | 'choice' | 'battle' | 'cinematic' | 'unlock'

export interface StoryLine {
  /** 说话人 id；'player' 为主角，'narration' 为旁白 */
  speaker: string
  text: string
  /** 立绘情绪 */
  mood?: 'normal' | 'hurt' | 'angry' | 'happy' | 'cold'
}

export interface Condition {
  type:
    | 'stage_gte'
    | 'stage_eq'
    | 'flag'
    | 'not_flag'
    | 'relation_gte'
    | 'realm_gte'
    | 'item'
    | 'karma_gte'
    | 'level_gte'
  key?: string
  value?: number | string | boolean
}

export interface Effect {
  type:
    | 'flag_set'
    | 'relation_add'
    | 'karma_add'
    | 'give_item'
    | 'consume_item'
    | 'give_equipment'
    | 'give_treasure'
    | 'give_technique'
    | 'give_pet'
    | 'give_stone'
    | 'give_cultivation'
    | 'unlock'
    | 'npc_state'
    | 'log'
  key?: string
  value?: number | string | boolean
  count?: number
  quality?: Quality
}

export interface StoryChoice {
  id: string
  text: string
  /** 选择要求（材料、属性门槛等） */
  requirements?: Condition[]
  effects: Effect[]
  /** 选择后的追加台词 */
  reply?: StoryLine[]
}

export interface StoryNode {
  id: string
  chapter: number
  type: StoryNodeType
  title: string
  /** 触发条件 */
  conditions?: Condition[]
  /** 只触发一次 */
  once?: boolean
  /** 触发时机 */
  trigger: 'stage' | 'manual' | 'realm' | 'breakthrough'
  /** 在哪些关卡区间可触发（type = stage） */
  stageRange?: [number, number]
  /** 权重（奇遇池用） */
  weight?: number
  npc?: string
  lines: StoryLine[]
  choices?: StoryChoice[]
  /** 无关卡战斗，仅奖励 */
  reward?: Effect[]
  /** battle 类型：指定怪物 */
  monsterId?: string
  /** 完成后跳转 */
  next?: string
}

export interface NpcDef {
  id: string
  name: string
  title: string
  /** 立绘 */
  portrait: string
  /** 立绘情绪变体，缺省回落到 portrait */
  moods?: Partial<Record<'normal' | 'hurt' | 'angry' | 'happy' | 'cold', string>>
  desc: string
  /** 初始关系值 */
  initialRelation: number
  /** 关系阶段阈值 → 文案 */
  stages: { min: number; label: string }[]
}

/* ------------------------------ 秘境 ------------------------------ */

export type RealmNodeKind = 'battle' | 'elite' | 'treasure' | 'encounter' | 'heritage' | 'boss' | 'entry'

export interface RealmNode {
  id: string
  kind: RealmNodeKind
  name: string
  desc: string
  /** 前驱节点 id */
  from: string[]
  /** 该节点之后可以走的路，允许多条 */
  to: string[]
  monsterId?: string
  storyId?: string
  /** 固定奖励 */
  reward?: Effect[]
  /** 可重复挑战 */
  repeatable?: boolean
}

export interface SecretRealmDef {
  id: string
  name: string
  chapter: number
  desc: string
  entryStage: number
  bg: string
  nodes: RealmNode[]
  startNode: string
  /** 首次通关奖励 */
  firstClear: Effect[]
}

export interface RealmRun {
  realmId: string
  currentNode: string
  /** 已访问节点 */
  visited: string[]
  /** 已探索方向记录 */
  cleared: string[]
  active: boolean
  /** 累积收益 */
  spoils: { stone: number; cultivation: number; items: string[] }
}

/* ------------------------------ 掉落与奖励 ------------------------------ */

export interface Drop {
  kind: 'stone' | 'cultivation' | 'equipment' | 'material' | 'pill' | 'treasure' | 'technique' | 'pet'
  id?: string
  quality?: Quality
  count: number
  label: string
  icon?: string
}

export interface BattleReward {
  stone: number
  cultivation: number
  drops: Drop[]
}

/* ------------------------------ 因果变量 ------------------------------ */

export type KarmaKey =
  | 'daoHeart'
  | 'demonThought'
  | 'immortalErosion'
  | 'jadeResonance'
  | 'taixuAttention'
  | 'qingxuanFame'
  | 'yaozuFame'
  | 'youmingFame'
  | 'jadeShards'

export const KARMA_LABEL: Record<KarmaKey, string> = {
  daoHeart: '道心',
  demonThought: '魔念',
  immortalErosion: '仙蚀',
  jadeResonance: '古玉共鸣',
  taixuAttention: '太虚关注',
  qingxuanFame: '青玄声望',
  yaozuFame: '妖族声望',
  youmingFame: '幽冥声望',
  jadeShards: '界玦碎片',
}

/* ------------------------------ 存档 ------------------------------ */

export interface PlayerProfile {
  name: string
  /** 当前境界阶段 id */
  stageId: string
  realmId: RealmId
  cultivation: number
  level: number
  spiritRoot: SpiritRoot
  school: School
  /** 突破失败后的短期虚弱截止时间戳（ms），不构成永久惩罚（PRD 5 / 47 章） */
  weakUntil?: number
}

export interface LogEntry {
  id: string
  time: number
  text: string
  kind: 'story' | 'reward' | 'system' | 'battle'
}

/** 仙缘榜排序用的派生摘要（不是游戏数值，仅用于榜单展示）。 */
export interface RankSummary {
  /** 游戏内道号 */
  name: string
  /** 综合战力（selectors.power 的结果） */
  power: number
  /** 大境界序数（0 起，越大越靠前） */
  realmIndex: number
  /** 境界展示名，如「炼气三层」 */
  realmLabel: string
  /** 关卡展示名，如「青石村 · 第 12 关」 */
  stageLabel: string
  /** 最高关卡 */
  stage: number
}

export interface GameSave {
  version: number
  createdAt: number
  updatedAt: number
  profile: PlayerProfile
  resources: {
    stone: number
    immortalJade: number
    sectContribution: number
  }
  progress: {
    /** 全局关卡序号（从 1 开始，跨地图累加） */
    stage: number
    /** 当前地图内关卡序号 */
    mapStage: number
    mapId: string
    /** 已通关的最高全局关卡 */
    maxStage: number
    /** 稳定刷怪点 */
    stableStage: number
    mapProgress: Record<string, number>
    clearedRealms: string[]
  }
  combat: {
    equipment: Partial<Record<EquipSlotId, EquipInstance>>
    /** 5 主动槽，null 表示空槽 */
    activeTreasures: (string | null)[]
    /** 2 被动槽 */
    passiveTreasures: (string | null)[]
    /** 已拥有法宝（含未装备） */
    ownedTreasures: TreasureInstance[]
    techniques: TechniqueProgress[]
    /** 主修功法 */
    mainTechnique: string | null
    supportTechniques: (string | null)[]
    pet: string | null
    /** 已拥有的灵兽 id（出战为 pet） */
    ownedPets?: string[]
    /** 另一套方案（Build 切换用） */
    loadoutB: GameSave['combat'] | null
  }
  inventory: {
    items: EquipInstance[]
    materials: Record<string, number>
    pills: Record<string, number>
    capacity: number
    /** 低于该品质的装备自动分解；缺省 / 'off' 表示不自动分解（PRD 19 章） */
    autoSalvageBelow?: Quality | 'off'
    /** 软保底计数：距上次蓝装 / 紫装掉落经过的装备掉落次数（PRD 45 章） */
    pity?: { sinceBlue: number; sincePurple: number }
  }
  story: {
    flags: Record<string, boolean | number | string>
    /** 已完成的一次性节点 */
    seenNodes: string[]
    /** 待播放的剧情队列 */
    pending: string[]
    /** 奇遇触发冷却 */
    encounterCooldown: number
    /** 奇遇历史 */
    encounterHistory: string[]
    chapterStage: number
  }
  npcs: Record<string, { relation: number; state: string; alive: boolean; lastSeen: number }>
  karma: Record<KarmaKey, number>
  realmRun: RealmRun | null
  idle: {
    lastClaim: number
  }
  /** 福利：每日签到与累计在线奖励的领取状态 */
  welfare: {
    /** 最近一次签到的「本地日期序号」（自 1970 起的天数，按玩家本地时区） */
    lastSignInDay: number
    /** 连续签到天数 */
    streak: number
    /** 累计签到次数 */
    totalSignIns: number
    /** 已领取的累计在线时长里程碑（分钟） */
    claimedPlaytime: number[]
  }
  /**
   * 仙缘榜排行摘要：推云存档前由客户端写入（见 lib/game/api/cloud.ts），
   * 服务端只做排序与展示，不参与任何数值结算。
   */
  rank?: RankSummary
  /** 外观：皮肤穿戴与拥有状态（表现层专用，不参与数值） */
  appearance: {
    /** 当前穿戴的皮肤 id */
    skin: string
    /** 已拥有的皮肤 id */
    ownedSkins: string[]
  }
  stats: {
    kills: number
    elites: number
    bosses: number
    deaths: number
    encountersDone: number
    treasuresOwned: number
    playTime: number
  }
  log: LogEntry[]
  settings: {
    auto: boolean
    speed: number
    sfx: boolean
    quality: 'low' | 'mid' | 'high'
  }
}

/* ------------------------------------------------------------------ *
 * 战斗结果
 * ------------------------------------------------------------------ */

export interface BattleSideSummary {
  name: string
  hp: number
  maxHp: number
  dps: number
  damageDealt: number
}

export interface SimResult {
  win: boolean
  duration: number
  playerDps: number
  playerDamage: number
  enemyDamage: number
  enemy: BattleSideSummary
  playerHpLeft: number
  failReason?: string
}

export interface SimOptions {
  /** 最多模拟秒数 */
  maxSeconds?: number
  /** 随机种子，用于可重放 */
  seed?: number
}

/* ------------------------------ 战斗事件（表现层） ------------------------------ */

export type BattleEventType =
  | 'hit'
  | 'crit'
  | 'cast'
  | 'kill'
  | 'drop'
  | 'shield'
  | 'heal'
  | 'enrage'
  | 'summon'
  | 'phase'
  | 'death'
  | 'victory'

export interface BattleEvent {
  t: number
  type: BattleEventType
  /** 发起方 */
  from: 'player' | 'enemy' | 'pet'
  /** 目标 */
  to?: 'player' | 'enemy' | 'all'
  value?: number
  damageType?: DamageType
  crit?: boolean
  label?: string
  icon?: string
  /** 弹道 / 特效提示 */
  fx?: 'sword' | 'thunder' | 'fire' | 'water' | 'wood' | 'earth' | 'soul' | 'slash' | 'burst'
}

export interface LiveBattleState {
  time: number
  playerHp: number
  playerMaxHp: number
  playerShield: number
  enemyHp: number
  enemyMaxHp: number
  enemyShield: number
  petHp: number
  petMaxHp: number
  skillCds: number[]
  done: boolean
  win: boolean
  dps: number
  events: BattleEvent[]
}
