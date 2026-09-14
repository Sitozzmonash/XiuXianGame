/* ------------------------------------------------------------------ *
 * 坊市配置：以灵石购买丹药与材料（PRD 29 章「灵石：通用货币」）
 *
 * 只做「灵石 → 物资」的单向兑换，且不做回收（避免玩家把战斗掉落无脑折现
 * 破坏推关掉落的意义）。上架门槛按最高关卡解锁，价格随档位递增。
 * ------------------------------------------------------------------ */

import type { Quality } from '../types'

export interface MarketGood {
  /** 稳定 id：`<kind>:<refId>`，store.buyGood 按它查找 */
  id: string
  kind: 'pill' | 'material'
  refId: string
  /** 单价（灵石） */
  price: number
  /** 一次购买的数量 */
  bundle: number
  /** 解锁所需最高关卡 */
  unlockStage: number
  quality: Quality
}

export const MARKET_GOODS: MarketGood[] = [
  {
    id: 'material:mat_jing_tie',
    kind: 'material',
    refId: 'mat_jing_tie',
    price: 120,
    bundle: 5,
    unlockStage: 0,
    quality: 'white',
  },
  {
    id: 'material:mat_yao_gu',
    kind: 'material',
    refId: 'mat_yao_gu',
    price: 180,
    bundle: 5,
    unlockStage: 0,
    quality: 'green',
  },
  {
    id: 'pill:pill_juqi_dan',
    kind: 'pill',
    refId: 'pill_juqi_dan',
    price: 260,
    bundle: 1,
    unlockStage: 0,
    quality: 'green',
  },
  {
    id: 'material:mat_zhu_ji_ling_cao',
    kind: 'material',
    refId: 'mat_zhu_ji_ling_cao',
    price: 420,
    bundle: 3,
    unlockStage: 10,
    quality: 'blue',
  },
  {
    id: 'pill:pill_ningyuan_dan',
    kind: 'pill',
    refId: 'pill_ningyuan_dan',
    price: 900,
    bundle: 1,
    unlockStage: 12,
    quality: 'blue',
  },
  {
    id: 'material:mat_san_yang_hua',
    kind: 'material',
    refId: 'mat_san_yang_hua',
    price: 1500,
    bundle: 3,
    unlockStage: 25,
    quality: 'purple',
  },
  {
    id: 'pill:pill_qingxin_dan',
    kind: 'pill',
    refId: 'pill_qingxin_dan',
    price: 2200,
    bundle: 1,
    unlockStage: 30,
    quality: 'purple',
  },
  {
    id: 'material:mat_hun_jing',
    kind: 'material',
    refId: 'mat_hun_jing',
    price: 3600,
    bundle: 2,
    unlockStage: 50,
    quality: 'purple',
  },
  {
    id: 'pill:pill_baoxue_dan',
    kind: 'pill',
    refId: 'pill_baoxue_dan',
    price: 5200,
    bundle: 1,
    unlockStage: 60,
    quality: 'orange',
  },
  {
    id: 'material:mat_long_lin_sui_pian',
    kind: 'material',
    refId: 'mat_long_lin_sui_pian',
    price: 8800,
    bundle: 2,
    unlockStage: 100,
    quality: 'orange',
  },
  {
    id: 'pill:pill_jinyuan_dan',
    kind: 'pill',
    refId: 'pill_jinyuan_dan',
    price: 16000,
    bundle: 1,
    unlockStage: 120,
    quality: 'orange',
  },
  {
    id: 'material:mat_xuan_bing_yu',
    kind: 'material',
    refId: 'mat_xuan_bing_yu',
    price: 26000,
    bundle: 2,
    unlockStage: 150,
    quality: 'red',
  },
  {
    id: 'material:mat_jie_shi',
    kind: 'material',
    refId: 'mat_jie_shi',
    price: 42000,
    bundle: 1,
    unlockStage: 180,
    quality: 'red',
  },
]
