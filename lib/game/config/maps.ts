/* ------------------------------------------------------------------ *
 * B1 地图与关卡配置 —— 4 张图 × 50 关 = 200 关
 *
 * 节奏（PRD 11 章）：1~4 普通 / 5 精英 / 6~9 普通 / 10 小 Boss，
 * 每 50 关为一张图，第 50 关为章节 Boss。故每图 5 精英 + 5 Boss，
 * 最长连续纯普通关为 4 关，远低于「禁止连续 20 关只加血」的红线。
 *
 * 剧情 / 秘境挂载表见分工说明.md 的 B1，由 storyMounts / realmMounts 声明。
 * 关卡名与怪物名只是数据，UI 与引擎一律通过本文件或 selectors 取用。
 * ------------------------------------------------------------------ */

import type { MapDef, MapStage, MonsterDef, RealmId } from '../types'

export const COMMON_STAGES_PER_MAP = 50

/* ------------------------------ 怪物图鉴（28 个） ------------------------------ */

/**
 * 倍率说明：hpMul / atkMul / defMul 是「同档次内」的相对倍率，
 * 与 monsterStats() 里的 kindMul（普通 1 / 精英 1.6 / Boss 2.5）相乘。
 * 因此普通怪用 0.7~1.2，精英用 2.2~3.0，Boss 用 7~10 才落在同一量纲上。
 */
export const MONSTERS: MonsterDef[] = [
  /* ---------- 青石村：山野妖患 ---------- */
  {
    id: 'mob_shanlang',
    name: '青背山狼',
    kind: 'normal',
    icon: 'beast',
    element: 'physical',
    hpMul: 0.95,
    atkMul: 1,
    defMul: 0.9,
    aspd: 1.05,
    desc: '入夜成群下山，专挑落单的樵夫。',
  },
  {
    id: 'mob_xueya_fu',
    name: '血牙蝠',
    kind: 'normal',
    icon: 'feather',
    element: 'physical',
    hpMul: 0.78,
    atkMul: 1.05,
    defMul: 0.7,
    aspd: 1.3,
    desc: '翅上有血纹，扑击极快，皮薄。',
  },
  {
    id: 'mob_shanzei',
    name: '劫道山匪',
    kind: 'normal',
    icon: 'axe',
    element: 'physical',
    hpMul: 1.15,
    atkMul: 1.05,
    defMul: 1.15,
    aspd: 0.9,
    desc: '刀口舔血的凡人，比野兽更懂配合。',
  },
  {
    id: 'elite_xuemu_yuan',
    name: '血目猿',
    kind: 'elite',
    icon: 'beast',
    element: 'physical',
    hpMul: 2.5,
    atkMul: 1.5,
    defMul: 1.2,
    aspd: 1.05,
    dropBonus: 0.2,
    bossMechanics: ['enrage'],
    desc: '受伤后双目赤红，攻速与伤害陡增，需在狂暴前压死。',
  },
  {
    id: 'elite_fuzhen_kui',
    name: '符镇尸傀',
    kind: 'elite',
    icon: 'seal',
    element: 'soul',
    hpMul: 2.9,
    atkMul: 1.3,
    defMul: 1.7,
    aspd: 0.82,
    dropBonus: 0.2,
    bossMechanics: ['shield', 'resist'],
    desc: '额上灵符不揭，护身罡气不破；且抗元素，物理与神魂伤害更有效。',
  },
  {
    id: 'boss_shanjun',
    name: '血眼山君',
    kind: 'boss',
    icon: 'beast',
    element: 'fire',
    hpMul: 7.6,
    atkMul: 2.05,
    defMul: 1.55,
    aspd: 0.95,
    dropBonus: 0.6,
    bossMechanics: ['enrage', 'summon', 'dot'],
    skills: [
      { name: '血目凝视', cast: 'aoe', scale: 1.55, cooldown: 9, damageType: 'fire' },
      { name: '唤妖', cast: 'summon', scale: 0, cooldown: 14, damageType: 'soul' },
    ],
    desc: '后山之主。对持久战极为不利：会唤来群兽，血目凝视持续灼烧。',
  },
  {
    id: 'boss_yushou_jiang',
    name: '御兽将·钉',
    kind: 'boss',
    icon: 'seal',
    element: 'soul',
    hpMul: 9.2,
    atkMul: 2.25,
    defMul: 1.85,
    aspd: 0.9,
    dropBonus: 0.8,
    bossMechanics: ['treasure_seal', 'summon', 'lifesteal'],
    skills: [
      { name: '钉魂刺', cast: 'dot', scale: 1.5, cooldown: 8, damageType: 'soul' },
      { name: '御兽符阵', cast: 'aoe', scale: 1.45, cooldown: 12, damageType: 'soul' },
    ],
    desc: '颈后插着御兽钉的将尸。会封住你的法宝，且以钉魂刺吸血。',
  },

  /* ---------- 黑风岭：魔修与钉幡 ---------- */
  {
    id: 'mob_heifeng_lang',
    name: '黑风鬃狼',
    kind: 'normal',
    icon: 'beast',
    element: 'physical',
    hpMul: 1,
    atkMul: 1.02,
    defMul: 0.95,
    aspd: 1.1,
    desc: '被黑风道人驱策的狼群，风刃缠身。',
  },
  {
    id: 'mob_xuexi_xi',
    name: '血溪蜥',
    kind: 'normal',
    icon: 'drop',
    element: 'water',
    hpMul: 1.1,
    atkMul: 0.95,
    defMul: 1.2,
    aspd: 0.95,
    desc: '趴在血溪里装死，壳厚，动作迟缓。',
  },
  {
    id: 'mob_moxiu_shitu',
    name: '魔修术士',
    kind: 'normal',
    icon: 'scroll',
    element: 'soul',
    hpMul: 0.85,
    atkMul: 1.25,
    defMul: 0.8,
    aspd: 1,
    desc: '躲在兽潮后面放咒的散修，脆但很痛。',
  },
  {
    id: 'elite_luocha_tongzi',
    name: '罗刹童子',
    kind: 'elite',
    icon: 'burst',
    element: 'soul',
    hpMul: 2.4,
    atkMul: 1.55,
    defMul: 1.15,
    aspd: 1.15,
    dropBonus: 0.2,
    bossMechanics: ['lifesteal', 'burst'],
    desc: '出手极快且以血养身，拖得越久越难杀。',
  },
  {
    id: 'elite_shouhun_fan',
    name: '收魂幡影',
    kind: 'elite',
    icon: 'banner',
    element: 'soul',
    hpMul: 2.8,
    atkMul: 1.35,
    defMul: 1.5,
    aspd: 0.88,
    dropBonus: 0.2,
    bossMechanics: ['dot', 'evade'],
    desc: '幡影飘忽难锁，且持续收魂，需高频命中或高穿透。',
  },
  {
    id: 'boss_luoqi',
    name: '散修罗七',
    kind: 'boss',
    icon: 'sword',
    element: 'physical',
    hpMul: 7.8,
    atkMul: 2.1,
    defMul: 1.5,
    aspd: 1,
    dropBonus: 0.6,
    bossMechanics: ['evade', 'burst'],
    skills: [
      { name: '血溪斩', cast: 'aoe', scale: 1.6, cooldown: 9, damageType: 'physical' },
      { name: '罗刹突袭', cast: 'aoe', scale: 1.4, cooldown: 12, damageType: 'soul' },
    ],
    desc: '老练的散修。身形滑不留手，一旦拖到爆发窗口能一击破防。',
  },
  {
    id: 'boss_heifeng_daoren',
    name: '黑风道人',
    kind: 'boss',
    icon: 'banner',
    element: 'soul',
    hpMul: 9.4,
    atkMul: 2.3,
    defMul: 1.9,
    aspd: 0.88,
    dropBonus: 0.85,
    bossMechanics: ['treasure_seal', 'lifesteal', 'summon'],
    skills: [
      { name: '钉幡摄魂', cast: 'aoe', scale: 1.7, cooldown: 10, damageType: 'soul' },
      { name: '噬魂咒', cast: 'dot', scale: 1.3, cooldown: 7, damageType: 'soul' },
    ],
    desc: '以钉驱兽、以幡收魂。封你法宝，吸你气血，是本章的关底。',
  },

  /* ---------- 云泽坊市：修士世界 ---------- */
  {
    id: 'mob_shifang_jia',
    name: '市坊甲士',
    kind: 'normal',
    icon: 'shield',
    element: 'physical',
    hpMul: 1.2,
    atkMul: 0.95,
    defMul: 1.35,
    aspd: 0.92,
    desc: '坊市护卫，甲厚刀沉，靠防御吃饭。',
  },
  {
    id: 'mob_heishi_sishi',
    name: '黑市死士',
    kind: 'normal',
    icon: 'axe',
    element: 'soul',
    hpMul: 0.9,
    atkMul: 1.2,
    defMul: 0.85,
    aspd: 1.15,
    desc: '拿了灵石就敢拼命，攻高防低。',
  },
  {
    id: 'mob_yaoteng',
    name: '云泽妖藤',
    kind: 'normal',
    icon: 'leaf',
    element: 'wood',
    hpMul: 1.15,
    atkMul: 0.9,
    defMul: 1.1,
    aspd: 1,
    desc: '缠住便不松开的藤妖，木属，惧火。',
  },
  {
    id: 'elite_gangfeng_wei',
    name: '罡风卫',
    kind: 'elite',
    icon: 'wind',
    element: 'metal',
    hpMul: 2.5,
    atkMul: 1.45,
    defMul: 1.3,
    aspd: 1.2,
    dropBonus: 0.22,
    bossMechanics: ['evade', 'thorn'],
    desc: '身法极快，且罡风反噬 —— 多段连击会把自己割伤。',
  },
  {
    id: 'elite_yunwu_jia',
    name: '云雾甲傀',
    kind: 'elite',
    icon: 'tortoise',
    element: 'water',
    hpMul: 3,
    atkMul: 1.25,
    defMul: 1.75,
    aspd: 0.85,
    dropBonus: 0.22,
    bossMechanics: ['shield', 'resist'],
    desc: '云雾凝成的甲壳，周期回盾，且抗元素。',
  },
  {
    id: 'boss_tu_san',
    name: '黑市大首·屠三',
    kind: 'boss',
    icon: 'axe',
    element: 'fire',
    hpMul: 8,
    atkMul: 2.15,
    defMul: 1.6,
    aspd: 1,
    dropBonus: 0.7,
    bossMechanics: ['enrage', 'thorn'],
    skills: [
      { name: '焚金爪', cast: 'aoe', scale: 1.6, cooldown: 8, damageType: 'fire' },
      { name: '毒烟', cast: 'dot', scale: 1.25, cooldown: 11, damageType: 'wood' },
    ],
    desc: '黑市的话事人。越打越疯，且皮糙反伤，硬拼吃亏。',
  },
  {
    id: 'boss_guchangfeng',
    name: '太虚盟执事·顾长风',
    kind: 'boss',
    icon: 'sword',
    element: 'water',
    hpMul: 9.6,
    atkMul: 2.4,
    defMul: 1.95,
    aspd: 0.95,
    dropBonus: 0.9,
    bossMechanics: ['resist', 'shield', 'phase'],
    skills: [
      { name: '太虚剑印', cast: 'aoe', scale: 1.8, cooldown: 10, damageType: 'water' },
      { name: '云泽囚笼', cast: 'dot', scale: 1.35, cooldown: 9, damageType: 'water' },
    ],
    desc: '高高在上的执事。抗元素、常驻护盾，四成血后入第二阶段。',
  },

  /* ---------- 落霞山脉：古修遗府 ---------- */
  {
    id: 'mob_luoxia_yezhu',
    name: '落霞野彘',
    kind: 'normal',
    icon: 'beast',
    element: 'earth',
    hpMul: 1.15,
    atkMul: 1,
    defMul: 1.2,
    aspd: 0.9,
    desc: '拱开药田的凶彘，皮糙力沉。',
  },
  {
    id: 'mob_gumu_kui',
    name: '古墓阴傀',
    kind: 'normal',
    icon: 'crystal',
    element: 'soul',
    hpMul: 0.95,
    atkMul: 1.15,
    defMul: 1,
    aspd: 0.95,
    desc: '遗府里巡行的傀影，专攻神魂。',
  },
  {
    id: 'mob_lingtian_yao',
    name: '灵田药妖',
    kind: 'normal',
    icon: 'sprout',
    element: 'wood',
    hpMul: 1.05,
    atkMul: 1.05,
    defMul: 0.95,
    aspd: 1.05,
    desc: '吃了三十年灵药的草木成精，木属。',
  },
  {
    id: 'elite_jianzhong_shi',
    name: '剑冢石侍',
    kind: 'elite',
    icon: 'sword',
    element: 'metal',
    hpMul: 2.7,
    atkMul: 1.5,
    defMul: 1.6,
    aspd: 1,
    dropBonus: 0.25,
    bossMechanics: ['thorn', 'resist'],
    desc: '守碑的石侍，剑意反噬且抗元素，物理硬碰更划算。',
  },
  {
    id: 'elite_guipei_shi',
    name: '鬼佩尸',
    kind: 'elite',
    icon: 'jade',
    element: 'soul',
    hpMul: 2.45,
    atkMul: 1.4,
    defMul: 1.25,
    aspd: 1.1,
    dropBonus: 0.25,
    bossMechanics: ['dot', 'lifesteal'],
    desc: '佩着鬼玉的行尸，持续蚀魂并以蚀魂养身。',
  },
  {
    id: 'boss_yinshan_gulong',
    name: '阴山骨龙',
    kind: 'boss',
    icon: 'tortoise',
    element: 'soul',
    hpMul: 8.4,
    atkMul: 2.2,
    defMul: 1.7,
    aspd: 0.9,
    dropBonus: 0.8,
    bossMechanics: ['shield', 'summon', 'dot'],
    skills: [
      { name: '阴山吐息', cast: 'aoe', scale: 1.7, cooldown: 9, damageType: 'soul' },
      { name: '骨甲', cast: 'shield', scale: 0, cooldown: 15, damageType: 'soul' },
    ],
    desc: '埋在阴山的龙骨，被遗府阵纹唤醒。吐息蚀魂，还会凝骨为甲。',
  },
  {
    id: 'boss_xie_wuchen',
    name: '剑修·谢无尘',
    kind: 'boss',
    icon: 'sword',
    element: 'metal',
    hpMul: 10,
    atkMul: 2.45,
    defMul: 1.85,
    aspd: 1.05,
    dropBonus: 1,
    bossMechanics: ['evade', 'treasure_seal', 'burst'],
    skills: [
      { name: '一字剑光', cast: 'aoe', scale: 1.85, cooldown: 9, damageType: 'metal' },
      { name: '剑心通明', cast: 'aoe', scale: 1.5, cooldown: 13, damageType: 'metal' },
    ],
    desc: '为剑碑而来的剑修。身法飘忽、封你法宝，一击可破防。敌友只在一念。',
  },
]

/* ------------------------------ 关卡蓝图 ------------------------------ */

/* 换图处基准 = 上一张图基准 × growth^50，保证 200 关曲线连续、不出现阶跃 */
const GROWTH: MapDef['growth'] = { hp: 1.055, atk: 1.045, def: 1.04 }

function chainBase(prev: MapDef['base']): MapDef['base'] {
  return {
    hp: Math.round(prev.hp * GROWTH.hp ** COMMON_STAGES_PER_MAP),
    atk: Math.round(prev.atk * GROWTH.atk ** COMMON_STAGES_PER_MAP),
    def: Math.round(prev.def * GROWTH.def ** COMMON_STAGES_PER_MAP),
  }
}

const BASE_1: MapDef['base'] = { hp: 900, atk: 60, def: 20 }
const BASE_2 = chainBase(BASE_1)
const BASE_3 = chainBase(BASE_2)
const BASE_4 = chainBase(BASE_3)

interface LandmarkStage {
  name: string
  monsterId: string
  desc?: string
}

interface MapBlueprint {
  id: string
  chapter: number
  name: string
  poem: string
  bg: string
  base: MapDef['base']
  unlockRealm: RealmId
  /** 该图专属普通怪（≥3） */
  monsters: string[]
  /** 该图专属精英（≥2） */
  elites: string[]
  /** 该图专属 Boss（≥1） */
  bosses: string[]
  /** 普通关名字池，按序循环 */
  normalNames: string[]
  /** 精英关：图内 index → 定义 */
  eliteStages: Record<number, LandmarkStage>
  /** Boss 关：图内 index → 定义 */
  bossStages: Record<number, LandmarkStage>
  /** 主线 / 奇遇挂载：图内 index → storyNodeId */
  storyMounts: Record<number, string>
  /** 秘境入口：图内 index → secretRealmId */
  realmMounts: Record<number, string>
}

function buildStages(bp: MapBlueprint): MapStage[] {
  const stages: MapStage[] = []
  let nameCursor = 0
  for (let i = 1; i <= COMMON_STAGES_PER_MAP; i++) {
    const storyId = bp.storyMounts[i]
    const realmId = bp.realmMounts[i]
    const boss = bp.bossStages[i]
    const elite = bp.eliteStages[i]
    if (boss) {
      stages.push({ index: i, name: boss.name, kind: 'boss', monsterId: boss.monsterId, desc: boss.desc, storyId, realmId })
    } else if (elite) {
      stages.push({ index: i, name: elite.name, kind: 'elite', monsterId: elite.monsterId, desc: elite.desc, storyId, realmId })
    } else {
      stages.push({
        index: i,
        name: bp.normalNames[nameCursor++ % bp.normalNames.length],
        kind: 'normal',
        monsterId: bp.monsters[i % bp.monsters.length],
        storyId,
        realmId,
      })
    }
  }
  return stages
}

/* ------------------------------ 四张地图 ------------------------------ */

const BLUEPRINTS: MapBlueprint[] = [
  {
    id: 'map_qingshi',
    chapter: 1,
    name: '青石村',
    poem: '白灯挂老槐，山月照无眠。一玉温入手，凡尘始有仙。',
    bg: '/images/bg-qingshi-village.png',
    base: BASE_1,
    unlockRealm: 'qi_refining',
    monsters: ['mob_shanlang', 'mob_xueya_fu', 'mob_shanzei'],
    elites: ['elite_xuemu_yuan', 'elite_fuzhen_kui'],
    bosses: ['boss_shanjun', 'boss_yushou_jiang'],
    normalNames: [
      '村口老槐',
      '后山樵径',
      '荒畦野地',
      '溪畔血痕',
      '断墙残垣',
      '乱葬岗边',
      '山道岔口',
      '枯井旧院',
      '梯田石阶',
      '雾锁林隙',
    ],
    eliteStages: {
      5: { name: '崖畔猿啸', monsterId: 'elite_xuemu_yuan', desc: '猿群在崖上盯着你，为首那只双目泛红。' },
      15: { name: '乱葬岗·尸傀', monsterId: 'elite_fuzhen_kui', desc: '新坟被刨开，尸身上贴着不该有的符。' },
      25: { name: '山神庙地宫', monsterId: 'elite_fuzhen_kui', desc: '神像座下压着御兽符，尸傀守着不肯退。' },
      35: { name: '血月狼群', monsterId: 'elite_xuemu_yuan', desc: '血月下，狼群跟着那只猿一起扑上来。' },
      45: { name: '古玉共鸣之地', monsterId: 'elite_fuzhen_kui', desc: '怀中古玉微烫，前方地脉裂开一道入口。' },
    },
    bossStages: {
      10: { name: '血月当空', monsterId: 'boss_shanjun', desc: '山君第一次现身，把整条山道烧成焦土。' },
      20: { name: '钉魂之夜', monsterId: 'boss_yushou_jiang', desc: '颈后插钉的将尸立在村口，村民无一人敢出。' },
      30: { name: '山君巢穴', monsterId: 'boss_shanjun', desc: '巢里堆着人骨与狼皮，山君在等你。' },
      40: { name: '御兽符阵', monsterId: 'boss_yushou_jiang', desc: '符阵已布成，御兽将在阵眼等你踏入。' },
      50: { name: '青石村·御兽钉', monsterId: 'boss_yushou_jiang', desc: '拔下那枚钉，山中的妖患才会真正停下。' },
    },
    storyMounts: { 3: 'qs_01_missing', 10: 'qs_02_jade', 25: 'qs_03_shrine', 50: 'qs_04_depart' },
    realmMounts: { 45: 'realm_qingshi_trial' },
  },
  {
    id: 'map_heifeng',
    chapter: 2,
    name: '黑风岭',
    poem: '雾锁黑风岭，剑裂血溪头。钉幡原一套，仙途自此幽。',
    bg: '/images/bg-heifeng-ridge.png',
    base: BASE_2,
    unlockRealm: 'qi_refining',
    monsters: ['mob_heifeng_lang', 'mob_xuexi_xi', 'mob_moxiu_shitu'],
    elites: ['elite_luocha_tongzi', 'elite_shouhun_fan'],
    bosses: ['boss_luoqi', 'boss_heifeng_daoren'],
    normalNames: [
      '雾锁林道',
      '黑风隘口',
      '血溪浅滩',
      '断魂坡',
      '废弃猎户屋',
      '古藤缠绕处',
      '鸮鸣枯木',
      '残阵石台',
      '阴湿岩缝',
      '风蚀栈道',
    ],
    eliteStages: {
      5: { name: '血泉罗刹', monsterId: 'elite_luocha_tongzi', desc: '沈青禾被追至血泉边，追兵里混着个童子。' },
      15: { name: '幡影林', monsterId: 'elite_shouhun_fan', desc: '林间幡影一晃即散，锁不住，只能压着打。' },
      25: { name: '噬魂窟', monsterId: 'elite_luocha_tongzi', desc: '窟口堆着空壳般的尸体，血被喝干了。' },
      35: { name: '百魂幡阵', monsterId: 'elite_shouhun_fan', desc: '百杆幡插成阵，每走一步都在被收魂。' },
      45: { name: '黑风地窟入口', monsterId: 'elite_shouhun_fan', desc: '地窟风里带着钉锈味，幡影守在入口。' },
    },
    bossStages: {
      10: { name: '血溪截杀', monsterId: 'boss_luoqi', desc: '散修罗七堵在溪口，说这条道归他管。' },
      20: { name: '黑风道坛', monsterId: 'boss_heifeng_daoren', desc: '道人坐在坛上，幡未动，风先起。' },
      30: { name: '罗刹血战', monsterId: 'boss_luoqi', desc: '罗七带着满身血痕回来，这次不肯再退。' },
      40: { name: '钉幡摄魂', monsterId: 'boss_heifeng_daoren', desc: '钉与幡同时亮起，你的法宝被压得黯淡下去。' },
      50: { name: '黑风洞府一战', monsterId: 'boss_heifeng_daoren', desc: '杀、取、还是留他一命 —— 打完这一战再决定。' },
    },
    storyMounts: { 5: 'hf_01_shen', 30: 'hf_02_luoqi', 50: 'hf_03_blackwind' },
    realmMounts: { 45: 'realm_heifeng_cave' },
  },
  {
    id: 'map_yunze',
    chapter: 3,
    name: '云泽坊市',
    poem: '云桥千盏火，一石换三秋。残片隔袖响，有人立高楼。',
    bg: '/images/bg-yunze-market.png',
    base: BASE_3,
    unlockRealm: 'qi_refining',
    monsters: ['mob_shifang_jia', 'mob_heishi_sishi', 'mob_yaoteng'],
    elites: ['elite_gangfeng_wei', 'elite_yunwu_jia'],
    bosses: ['boss_tu_san', 'boss_guchangfeng'],
    normalNames: [
      '云泽长街',
      '浮桥夜市',
      '坊市东巷',
      '灵材铺后巷',
      '水榭回廊',
      '黑市暗巷',
      '码头栈桥',
      '丹炉巷口',
      '灯影牌楼',
      '泽畔芦苇',
    ],
    eliteStages: {
      5: { name: '坊市擂台·罡风', monsterId: 'elite_gangfeng_wei', desc: '擂台上押了你的灵石，对手一身罡风。' },
      15: { name: '云雾阵房', monsterId: 'elite_yunwu_jia', desc: '阵房里的甲傀试你手段，回盾极快。' },
      25: { name: '黑市角斗场', monsterId: 'elite_gangfeng_wei', desc: '围栏一落，罡风卫不打算让你活着出场。' },
      35: { name: '云泽水府', monsterId: 'elite_yunwu_jia', desc: '水府深处云雾成壳，甲傀守着残片。' },
      45: { name: '太虚盟外院', monsterId: 'elite_gangfeng_wei', desc: '外院无人拦你，只有罡风在拦。' },
    },
    bossStages: {
      10: { name: '长街截杀', monsterId: 'boss_tu_san', desc: '屠三的人在长街动了手，他要你身上的古玉。' },
      20: { name: '黑市深处', monsterId: 'boss_guchangfeng', desc: '你第一次近距离看清太虚盟执事的剑。' },
      30: { name: '屠三的货仓', monsterId: 'boss_tu_san', desc: '货仓里堆着钉与幡 —— 原来黑风岭的货从他这里出。' },
      40: { name: '阿梨的赌约', monsterId: 'boss_guchangfeng', desc: '为救兄长赌上性命的少女，把你也拖进了这一局。' },
      50: { name: '云泽拍卖会·残片', monsterId: 'boss_guchangfeng', desc: '第二枚残片落槌之前，顾长风先向你出手。' },
    },
    storyMounts: { 10: 'yz_01_market', 40: 'yz_02_ali', 50: 'yz_03_auction' },
    realmMounts: {},
  },
  {
    id: 'map_luoxia',
    chapter: 4,
    name: '落霞山脉',
    poem: '红叶埋旧阵，药田三十年。剑碑通一梦，天裂在云边。',
    bg: '/images/bg-luoxia-mountain.png',
    base: BASE_4,
    unlockRealm: 'qi_refining',
    monsters: ['mob_luoxia_yezhu', 'mob_gumu_kui', 'mob_lingtian_yao'],
    elites: ['elite_jianzhong_shi', 'elite_guipei_shi'],
    bosses: ['boss_yinshan_gulong', 'boss_xie_wuchen'],
    normalNames: [
      '红叶石径',
      '荒废药田',
      '落霞断崖',
      '遗府外墙',
      '枯泉井畔',
      '阵纹残迹',
      '古松虬结',
      '山岚迷雾',
      '灵圃残畦',
      '碑林外道',
    ],
    eliteStages: {
      5: { name: '剑冢入口', monsterId: 'elite_jianzhong_shi', desc: '倒插的断剑成林，石侍从剑影里站起来。' },
      15: { name: '鬼佩尸穴', monsterId: 'elite_guipei_shi', desc: '尸穴里每具行尸都佩着一枚同样的鬼玉。' },
      25: { name: '残阵回廊', monsterId: 'elite_jianzhong_shi', desc: '阵纹残了三十年，石侍仍在按旧令巡守。' },
      35: { name: '阴山裂谷', monsterId: 'elite_guipei_shi', desc: '裂谷里阴气重得能看见，行尸成群爬出。' },
      45: { name: '古修剑碑', monsterId: 'elite_jianzhong_shi', desc: '剑碑与你怀中古玉共鸣，石侍替碑挡在前面。' },
    },
    bossStages: {
      10: { name: '荒兽巢穴', monsterId: 'boss_yinshan_gulong', desc: '药田被拱开的地方，埋着一具不该动的龙骨。' },
      20: { name: '遗府石门', monsterId: 'boss_xie_wuchen', desc: '谢无尘站在石门前，说这碑该归他。' },
      30: { name: '骨龙横道', monsterId: 'boss_yinshan_gulong', desc: '骨龙盘在回廊正中，骨甲一凝便刀枪不入。' },
      40: { name: '剑修拦路', monsterId: 'boss_xie_wuchen', desc: '剑光只一线，却让你所有的法宝都失了声。' },
      50: { name: '剑碑之约', monsterId: 'boss_xie_wuchen', desc: '碑上照出天裂。他与你的选择，决定这碑归谁。' },
    },
    storyMounts: { 20: 'lx_01_ruins', 45: 'lx_02_stele', 50: 'lx_03_xiewuchen' },
    realmMounts: { 50: 'realm_luoxia_cave' },
  },
]

export const MAPS: MapDef[] = BLUEPRINTS.map((bp) => ({
  id: bp.id,
  chapter: bp.chapter,
  name: bp.name,
  poem: bp.poem,
  bg: bp.bg,
  base: bp.base,
  growth: GROWTH,
  monsters: bp.monsters,
  elites: bp.elites,
  bosses: bp.bosses,
  stages: buildStages(bp),
  unlockRealm: bp.unlockRealm,
}))

/* ------------------------------ 索引与查询 ------------------------------ */

export const MAP_BY_ID: Record<string, MapDef> = Object.fromEntries(MAPS.map((m) => [m.id, m]))

export const MONSTER_BY_ID: Record<string, MonsterDef> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m]),
)

export const STAGES_PER_MAP = COMMON_STAGES_PER_MAP

/** 图内关号 → 全局关号（第 1 图为 1~50，第 2 图为 51~100…） */
export function stageNumberToGlobal(mapId: string, mapStage: number): number {
  let offset = 0
  for (const map of MAPS) {
    if (map.id === mapId) return offset + mapStage
    offset += map.stages.length
  }
  return Math.max(1, mapStage)
}

export function globalToMap(globalStage: number): { mapId: string; mapStage: number; map: MapDef } {
  let remaining = Math.max(1, Math.floor(globalStage))
  for (const map of MAPS) {
    if (remaining <= map.stages.length) {
      return { mapId: map.id, mapStage: remaining, map }
    }
    remaining -= map.stages.length
  }
  const last = MAPS[MAPS.length - 1]
  return { mapId: last.id, mapStage: last.stages.length, map: last }
}

export function getStage(globalStage: number): { map: MapDef; stage: MapStage; monster: MonsterDef | null } {
  const { map, mapStage } = globalToMap(globalStage)
  const stage = map.stages[Math.min(map.stages.length, Math.max(1, mapStage)) - 1] ?? map.stages[0]
  const monster = stage.monsterId ? (MONSTER_BY_ID[stage.monsterId] ?? null) : null
  return { map, stage, monster }
}

export function monsterStats(globalStage: number): {
  hp: number
  atk: number
  def: number
  aspd: number
  crit: number
  critDmg: number
} {
  const { map, stage, monster } = getStage(globalStage)
  const m = monster
  const n = Math.max(0, stage.index - 1)
  const kindMul = m?.kind === 'boss' ? 2.5 : m?.kind === 'elite' ? 1.6 : 1
  const decadeMul = stage.index % 10 === 0 && stage.index !== map.stages.length ? 1.35 : 1
  const hp = map.base.hp * map.growth.hp ** n * (m?.hpMul ?? 1) * kindMul * decadeMul
  const atk = map.base.atk * map.growth.atk ** n * (m?.atkMul ?? 1) * (m?.kind === 'boss' ? 1.35 : 1)
  const def = map.base.def * map.growth.def ** n * (m?.defMul ?? 1)
  return {
    hp: Math.max(1, Math.round(hp)),
    atk: Math.max(1, Math.round(atk)),
    def: Math.max(0, Math.round(def)),
    aspd: m?.aspd ?? 1,
    crit: m?.kind === 'boss' ? 0.12 : m?.kind === 'elite' ? 0.1 : 0.05,
    critDmg: 1.6,
  }
}
