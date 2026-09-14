import type { RealmDef, RealmId } from '../types'

/* 突破材料 id 见 lib/game/config/materials.ts */
export const REALMS: RealmDef[] = [
  {
    id: 'qi_refining',
    name: '炼气',
    multiplier: 1,
    defenseConstant: 300,
    stages: [
      { id: 'qi_1', label: '炼气一层', cultivationMax: 1200 },
      { id: 'qi_2', label: '炼气二层', cultivationMax: 3200 },
      { id: 'qi_3', label: '炼气三层', cultivationMax: 7200 },
      { id: 'qi_4', label: '炼气四层', cultivationMax: 14000 },
      { id: 'qi_5', label: '炼气五层', cultivationMax: 26000 },
      { id: 'qi_6', label: '炼气六层', cultivationMax: 46000 },
      { id: 'qi_7', label: '炼气七层', cultivationMax: 78000 },
      { id: 'qi_8', label: '炼气八层', cultivationMax: 128000 },
      { id: 'qi_9', label: '炼气九层', cultivationMax: 200000 },
      {
        id: 'qi_full',
        label: '炼气圆满',
        cultivationMax: 320000,
        breakthroughMaterials: [
          { id: 'mat_di_mai_ling_sui', count: 1 },
          { id: 'mat_zhu_ji_ling_cao', count: 3 },
        ],
        breakthroughBoss: 'boss_foundation_heart',
        unlocks: ['cave'],
      },
    ],
  },
  {
    id: 'foundation',
    name: '筑基',
    multiplier: 2.6,
    defenseConstant: 1200,
    stages: [
      { id: 'fd_early', label: '筑基初期', cultivationMax: 600000 },
      { id: 'fd_mid', label: '筑基中期', cultivationMax: 1100000 },
      { id: 'fd_late', label: '筑基后期', cultivationMax: 2000000 },
      { id: 'fd_full', label: '筑基圆满', cultivationMax: 3400000 , breakthroughMaterials: [{ id: 'mat_san_yang_hua', count: 3 }, { id: 'mat_yin_yang_xuan_sui', count: 1 }] },
    ],
  },
  {
    id: 'core_formation',
    name: '结丹',
    multiplier: 6.5,
    defenseConstant: 4800,
    stages: [
      { id: 'cf_early', label: '结丹初期', cultivationMax: 6000000 },
      { id: 'cf_mid', label: '结丹中期', cultivationMax: 11000000 },
      { id: 'cf_late', label: '结丹后期', cultivationMax: 20000000 },
      { id: 'cf_full', label: '结丹圆满', cultivationMax: 34000000 , breakthroughMaterials: [{ id: 'mat_yin_yang_xuan_sui', count: 3 }, { id: 'mat_jin_dan_sha', count: 1 }] },
    ],
  },
  {
    id: 'nascent_soul',
    name: '元婴',
    multiplier: 16,
    defenseConstant: 18000,
    stages: [
      { id: 'ns_early', label: '元婴初期', cultivationMax: 60000000 },
      { id: 'ns_mid', label: '元婴中期', cultivationMax: 110000000 },
      { id: 'ns_late', label: '元婴后期', cultivationMax: 200000000 },
      { id: 'ns_full', label: '元婴圆满', cultivationMax: 340000000 , breakthroughMaterials: [{ id: 'mat_jin_dan_sha', count: 3 }, { id: 'mat_ying_ling_guo', count: 1 }] },
    ],
  },
  {
    id: 'spirit_transform',
    name: '化神',
    multiplier: 40,
    defenseConstant: 70000,
    stages: [
      { id: 'st_early', label: '化神初期', cultivationMax: 6e8 },
      { id: 'st_mid', label: '化神中期', cultivationMax: 1.1e9 },
      { id: 'st_late', label: '化神后期', cultivationMax: 2e9 },
      { id: 'st_full', label: '化神圆满', cultivationMax: 3.4e9 , breakthroughMaterials: [{ id: 'mat_ying_ling_guo', count: 3 }, { id: 'mat_shen_nian_jing', count: 1 }] },
    ],
  },
  {
    id: 'void_refining',
    name: '炼虚',
    multiplier: 100,
    defenseConstant: 260000,
    stages: [
      { id: 'vr_early', label: '炼虚初期', cultivationMax: 6e9 },
      { id: 'vr_mid', label: '炼虚中期', cultivationMax: 1.1e10 },
      { id: 'vr_late', label: '炼虚后期', cultivationMax: 2e10 },
      { id: 'vr_full', label: '炼虚圆满', cultivationMax: 3.4e10 , breakthroughMaterials: [{ id: 'mat_shen_nian_jing', count: 2 }, { id: 'mat_xu_kong_shi', count: 1 }] },
    ],
  },
  {
    id: 'body_integration',
    name: '合体',
    multiplier: 250,
    defenseConstant: 1e6,
    stages: [
      { id: 'bi_early', label: '合体初期', cultivationMax: 6e10 },
      { id: 'bi_mid', label: '合体中期', cultivationMax: 1.1e11 },
      { id: 'bi_late', label: '合体后期', cultivationMax: 2e11 },
      { id: 'bi_full', label: '合体圆满', cultivationMax: 3.4e11 , breakthroughMaterials: [{ id: 'mat_he_tian_yu', count: 1 }, { id: 'mat_zhen_ling_xue', count: 1 }] },
    ],
  },
  {
    id: 'great_vehicle',
    name: '大乘',
    multiplier: 620,
    defenseConstant: 4e6,
    stages: [
      { id: 'gv_early', label: '大乘初期', cultivationMax: 6e11 },
      { id: 'gv_mid', label: '大乘中期', cultivationMax: 1.1e12 },
      { id: 'gv_late', label: '大乘后期', cultivationMax: 2e12 },
      { id: 'gv_full', label: '大乘圆满', cultivationMax: 3.4e12 , breakthroughMaterials: [{ id: 'mat_da_cheng_guo', count: 1 }, { id: 'mat_tian_lei_ye', count: 1 }] },
    ],
  },
  {
    id: 'tribulation',
    name: '渡劫',
    multiplier: 1500,
    defenseConstant: 1.6e7,
    stages: [
      { id: 'tb_1', label: '一劫', cultivationMax: 6e12 },
      { id: 'tb_2', label: '二劫', cultivationMax: 1.1e13 },
      { id: 'tb_3', label: '三劫', cultivationMax: 2e13 },
      { id: 'tb_full', label: '九劫圆满', cultivationMax: 3.4e13 , breakthroughMaterials: [{ id: 'mat_jiu_jie_mu', count: 1 }, { id: 'mat_xian_men_sui_pian', count: 1 }] },
    ],
  },
  {
    id: 'ascension',
    name: '飞升',
    multiplier: 4000,
    defenseConstant: 6e7,
    stages: [{ id: 'as_1', label: '飞升', cultivationMax: Infinity }],
  },
]

export const REALM_BY_ID: Record<string, RealmDef> = Object.fromEntries(
  REALMS.map((r) => [r.id, r]),
)

export interface FlatStage {
  realm: RealmDef
  stage: RealmDef['stages'][number]
  index: number
}

export const FLAT_STAGES: FlatStage[] = REALMS.flatMap((realm) =>
  realm.stages.map((stage) => ({ realm, stage, index: 0 })),
).map((x, i) => ({ ...x, index: i }))

export const STAGE_BY_ID: Record<string, FlatStage> = Object.fromEntries(
  FLAT_STAGES.map((s) => [s.stage.id, s]),
)

export function flatStage(stageId: string): FlatStage {
  return STAGE_BY_ID[stageId] ?? FLAT_STAGES[0]
}

export function stageIndexOf(stageId: string): number {
  return flatStage(stageId).index
}

export function nextStage(stageId: string): FlatStage | null {
  const i = stageIndexOf(stageId)
  return FLAT_STAGES[i + 1] ?? null
}

export const REALM_IDS: RealmId[] = REALMS.map((r) => r.id)
