/* ------------------------------------------------------------------ *
 * 商城配置：仙玉 / 灵石的消费去处（PRD 29 章货币体系补完）
 *
 * 分三个货架：
 *  · skin     皮肤 —— 仙玉购买，纯外观不加数值（见 skins.ts）
 *  · equip    装备福匣 + 法宝囊 —— 灵石 / 仙玉购买，开出随机部位
 *  · exchange 兑换 —— 仙玉换灵石，数额随最高关卡放大保持后期有用
 * 坊市（market.ts）继续做灵石买丹药材料的日常补给，两边不重复上架。
 * ------------------------------------------------------------------ */

import type { Quality } from '../types'
import { welfareScale } from './welfare'

export type MallSection = 'skin' | 'equip' | 'exchange'

export interface MallItem {
  /** 稳定 id */
  id: string
  section: MallSection
  name: string
  desc: string
  currency: 'jade' | 'stone'
  /** 单价（仙玉 / 灵石） */
  price: number
  quality: Quality
  /** 解锁所需最高关卡 */
  unlockStage: number
  /** 展示图标（GameIcon 名） */
  icon: string
  /** section = skin：对应皮肤 id */
  skinId?: string
  /** section = equip：装备福匣开出的品质 */
  equipQuality?: Quality
  /** section = equip：法宝囊标记 */
  treasureBox?: boolean
  /** section = exchange：兑换得到的灵石基数（实际数额随关卡放大） */
  stone?: number
}

export const MALL_ITEMS: MallItem[] = [
  /* ---- 皮肤（仙玉） ---- */
  {
    id: 'skin_xuanye',
    section: 'skin',
    name: '玄夜赤令',
    desc: '玄衣赤绶，剑引紫雷。',
    currency: 'jade',
    price: 98,
    quality: 'purple',
    unlockStage: 0,
    icon: 'sword',
    skinId: 'xuanye',
  },
  {
    id: 'skin_leiyin',
    section: 'skin',
    name: '雷引青霄',
    desc: '白衣承雷，一剑开云。',
    currency: 'jade',
    price: 148,
    quality: 'orange',
    unlockStage: 0,
    icon: 'thunder',
    skinId: 'leiyin',
  },
  {
    id: 'skin_qingzhu',
    section: 'skin',
    name: '青竹烟雨',
    desc: '竹影为伴，剑气如烟。',
    currency: 'jade',
    price: 188,
    quality: 'red',
    unlockStage: 0,
    icon: 'leaf',
    skinId: 'qingzhu',
  },

  /* ---- 装备福匣（灵石） ---- */
  {
    id: 'box_green',
    section: 'equip',
    name: '铁纹匣',
    desc: '随机部位，开出一件青装。',
    currency: 'stone',
    price: 3000,
    quality: 'green',
    unlockStage: 0,
    icon: 'pouch',
    equipQuality: 'green',
  },
  {
    id: 'box_blue',
    section: 'equip',
    name: '青锋匣',
    desc: '随机部位，开出一件蓝装。',
    currency: 'stone',
    price: 12000,
    quality: 'blue',
    unlockStage: 15,
    icon: 'pouch',
    equipQuality: 'blue',
  },
  {
    id: 'box_purple',
    section: 'equip',
    name: '紫电匣',
    desc: '随机部位，开出一件紫装。',
    currency: 'stone',
    price: 45000,
    quality: 'purple',
    unlockStage: 40,
    icon: 'pouch',
    equipQuality: 'purple',
  },
  {
    id: 'box_orange',
    section: 'equip',
    name: '赤霄匣',
    desc: '随机部位，开出一件橙装。',
    currency: 'stone',
    price: 160000,
    quality: 'orange',
    unlockStage: 90,
    icon: 'pouch',
    equipQuality: 'orange',
  },
  {
    id: 'box_red',
    section: 'equip',
    name: '绯曜匣',
    desc: '随机部位，开出一件红装。',
    currency: 'stone',
    price: 600000,
    quality: 'red',
    unlockStage: 150,
    icon: 'pouch',
    equipQuality: 'red',
  },

  /* ---- 法宝囊（仙玉） ---- */
  {
    id: 'box_treasure',
    section: 'equip',
    name: '法宝囊',
    desc: '开出一件尚未拥有的法宝（按当前进度选取）。',
    currency: 'jade',
    price: 88,
    quality: 'orange',
    unlockStage: 20,
    icon: 'vase',
    treasureBox: true,
  },

  /* ---- 兑换（仙玉 → 灵石） ---- */
  {
    id: 'exchange_small',
    section: 'exchange',
    name: '聚灵囊',
    desc: '急用灵石时的换法，数额随修行见长。',
    currency: 'jade',
    price: 10,
    quality: 'blue',
    unlockStage: 0,
    icon: 'token',
    stone: 6000,
  },
  {
    id: 'exchange_large',
    section: 'exchange',
    name: '聚宝囊',
    desc: '大笔横财，数额随修行见长。',
    currency: 'jade',
    price: 50,
    quality: 'orange',
    unlockStage: 0,
    icon: 'token',
    stone: 40000,
  },
]

/** 兑换类商品实际到手的灵石：基数 ×（1 + 0.08 × 最高关卡） */
export function exchangeStone(base: number, maxStage: number): number {
  return Math.round(base * welfareScale(maxStage))
}
