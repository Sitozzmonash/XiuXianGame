import type { Quality } from '../types'
import { PILLS, PILL_BY_ID } from './pills'
import { MATERIAL_BY_ID } from './materials'

export interface PillRecipe {
  id: string
  pillId: string
  name: string
  quality: Quality
  desc: string
  /** 炼制所需材料清单 */
  materials: {
    materialId: string
    count: number
  }[]
  /** 炼制每颗消耗的灵石 */
  costStone: number
  /** 解锁所需关卡等级 */
  unlockStage: number
}

/**
 * 丹药炼制配方表：
 * 覆盖常用修为丹、战斗丹、突破丹、永久属性丹。
 * 原料取自现有掉落与坊市材料（灵草、花、髓、石、骨、木等）。
 */
export const RECIPES: PillRecipe[] = [
  /* ------------------------------ 修为类 ------------------------------ */
  {
    id: 'recipe_juqi_dan',
    pillId: 'pill_juqi_dan',
    name: '聚气丹方',
    quality: 'green',
    desc: '以寻常药材聚拢天地灵气，凡修启蒙之丹。',
    materials: [{ materialId: 'mat_jing_tie', count: 2 }],
    costStone: 80,
    unlockStage: 0,
  },
  {
    id: 'recipe_ningyuan_dan',
    pillId: 'pill_ningyuan_dan',
    name: '凝元丹方',
    quality: 'blue',
    desc: '以筑基灵草为主引，凝实周天元气。',
    materials: [
      { materialId: 'mat_zhu_ji_ling_cao', count: 2 },
      { materialId: 'mat_chi_tong', count: 1 },
    ],
    costStone: 300,
    unlockStage: 15,
  },
  {
    id: 'recipe_zhuji_lingye',
    pillId: 'pill_zhuji_lingye',
    name: '筑基灵液方',
    quality: 'purple',
    desc: '融合地脉灵髓所萃灵液，服之可壮根基。',
    materials: [
      { materialId: 'mat_di_mai_ling_sui', count: 1 },
      { materialId: 'mat_zhu_ji_ling_cao', count: 3 },
    ],
    costStone: 1200,
    unlockStage: 35,
  },
  {
    id: 'recipe_jinyuan_dan',
    pillId: 'pill_jinyuan_dan',
    name: '金元丹方',
    quality: 'purple',
    desc: '炼结丹砂入药，丹成如金，元气绵延。',
    materials: [
      { materialId: 'mat_san_yang_hua', count: 2 },
      { materialId: 'mat_di_mai_shi', count: 2 },
    ],
    costStone: 5000,
    unlockStage: 70,
  },
  {
    id: 'recipe_yuanying_yangshen',
    pillId: 'pill_yuanying_yangshen',
    name: '元婴养神方',
    quality: 'orange',
    desc: '以婴灵果辅以养魂木，大滋神识与元婴。',
    materials: [
      { materialId: 'mat_ying_ling_guo', count: 1 },
      { materialId: 'mat_yang_hun_mu', count: 2 },
    ],
    costStone: 20000,
    unlockStage: 110,
  },
  {
    id: 'recipe_huashen_wudao',
    pillId: 'pill_huashen_wudao',
    name: '化神悟道方',
    quality: 'red',
    desc: '凝神念晶与化神露，一炉可省数十年苦修。',
    materials: [
      { materialId: 'mat_shen_nian_jing', count: 1 },
      { materialId: 'mat_hua_shen_lu', count: 2 },
    ],
    costStone: 80000,
    unlockStage: 150,
  },

  /* ------------------------------ 突破与护脉类 ------------------------------ */
  {
    id: 'recipe_zhuji_dan',
    pillId: 'pill_zhuji_dan',
    name: '筑基丹方',
    quality: 'orange',
    desc: '破凡踏道之神药，平复气血翻涌，永久强韧肉身体魄。',
    materials: [
      { materialId: 'mat_di_mai_ling_sui', count: 1 },
      { materialId: 'mat_zhu_ji_ling_cao', count: 4 },
    ],
    costStone: 2500,
    unlockStage: 20,
  },
  {
    id: 'recipe_ningdan_wan',
    pillId: 'pill_ningdan_wan',
    name: '凝丹丸方',
    quality: 'orange',
    desc: '结丹关隘必备，收束一身真元归入丹田。',
    materials: [
      { materialId: 'mat_san_yang_hua', count: 3 },
      { materialId: 'mat_yin_yang_xuan_sui', count: 1 },
    ],
    costStone: 8000,
    unlockStage: 60,
  },

  /* ------------------------------ 战斗类 ------------------------------ */
  {
    id: 'recipe_baoxue_dan',
    pillId: 'pill_baoxue_dan',
    name: '暴血丹方',
    quality: 'blue',
    desc: '妖兽骨髓配合赤铜猛火快炼，短时间爆发强绝杀力。',
    materials: [
      { materialId: 'mat_yao_gu', count: 2 },
      { materialId: 'mat_chi_tong', count: 1 },
    ],
    costStone: 400,
    unlockStage: 10,
  },
  {
    id: 'recipe_jingang_dan',
    pillId: 'pill_jingang_dan',
    name: '金刚丹方',
    quality: 'blue',
    desc: '黑铁精炼，皮膜如生金刚甲胄。',
    materials: [
      { materialId: 'mat_hei_tie', count: 3 },
      { materialId: 'mat_jing_tie', count: 2 },
    ],
    costStone: 400,
    unlockStage: 10,
  },
  {
    id: 'recipe_qingxin_dan',
    pillId: 'pill_qingxin_dan',
    name: '清心丹方',
    quality: 'blue',
    desc: '清心凝神，定心魔、避煞气。',
    materials: [
      { materialId: 'mat_zhu_ji_ling_cao', count: 2 },
      { materialId: 'mat_ling_yin', count: 1 },
    ],
    costStone: 600,
    unlockStage: 20,
  },
  {
    id: 'recipe_pojia_dan',
    pillId: 'pill_pojia_dan',
    name: '破甲丹方',
    quality: 'purple',
    desc: '星砂与地脉淬砺，丹气锋锐透骨。',
    materials: [
      { materialId: 'mat_xing_sha', count: 2 },
      { materialId: 'mat_di_mai_shi', count: 1 },
    ],
    costStone: 1500,
    unlockStage: 45,
  },
  {
    id: 'recipe_huoling_dan',
    pillId: 'pill_huoling_dan',
    name: '火灵丹方',
    quality: 'purple',
    desc: '火晶为引，服之吞吐真焰。',
    materials: [
      { materialId: 'mat_huo_jing', count: 2 },
      { materialId: 'mat_san_yang_hua', count: 1 },
    ],
    costStone: 2000,
    unlockStage: 50,
  },
  {
    id: 'recipe_leiyuan_dan',
    pillId: 'pill_leiyuan_dan',
    name: '雷元丹方',
    quality: 'purple',
    desc: '封纳雷击木之一线天雷，雷法通达。',
    materials: [
      { materialId: 'mat_lei_ji_mu', count: 2 },
      { materialId: 'mat_xing_sha', count: 1 },
    ],
    costStone: 2000,
    unlockStage: 55,
  },

  /* ------------------------------ 永久修真类 ------------------------------ */
  {
    id: 'recipe_xisui_dan',
    pillId: 'pill_xisui_dan',
    name: '洗髓丹方',
    quality: 'orange',
    desc: '伐毛洗髓，脱胎换骨，永久增强生命与防御底蕴。',
    materials: [
      { materialId: 'mat_di_mai_ling_sui', count: 2 },
      { materialId: 'mat_long_lin_sui_pian', count: 1 },
    ],
    costStone: 15000,
    unlockStage: 90,
  },
  {
    id: 'recipe_yanghun_dan',
    pillId: 'pill_yanghun_dan',
    name: '养魂丹方',
    quality: 'orange',
    desc: '魂晶与养魂木相合，永久稳固道基心神。',
    materials: [
      { materialId: 'mat_hun_jing', count: 2 },
      { materialId: 'mat_yang_hun_mu', count: 1 },
    ],
    costStone: 25000,
    unlockStage: 120,
  },
]

export const RECIPE_BY_ID: Record<string, PillRecipe> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r]),
)
