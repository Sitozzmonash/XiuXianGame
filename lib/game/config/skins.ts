/* ------------------------------------------------------------------ *
 * 皮肤配置：主角立绘外观（表现层专用）
 *
 * 皮肤只改变立绘，不提供任何数值加成（避免外观付费变数值付费）。
 * 默认皮肤随新档赠送，其余皮肤在商城以仙玉出售（见 mall.ts）。
 * ------------------------------------------------------------------ */

import type { Quality } from '../types'

export interface SkinDef {
  id: string
  name: string
  desc: string
  /** 立绘（public 路径）；缺失时 UI 回落到 player-swordsman.png */
  image: string
  /** 商城售价（仙玉）；0 表示不售卖（初始赠送） */
  price: number
  quality: Quality
}

export const SKINS: SkinDef[] = [
  {
    id: 'default',
    name: '青锋白衣',
    desc: '一袭青白道袍，负剑出山。',
    image: '/images/skins/qingfeng.png',
    price: 0,
    quality: 'blue',
  },
  {
    id: 'xuanye',
    name: '玄夜赤令',
    desc: '玄衣赤绶，剑引紫雷，行魔道而不失本心。',
    image: '/images/skins/xuanye.png',
    price: 98,
    quality: 'purple',
  },
  {
    id: 'leiyin',
    name: '雷引青霄',
    desc: '白衣承雷，一剑开云见青霄。',
    image: '/images/skins/leiyin.png',
    price: 148,
    quality: 'orange',
  },
  {
    id: 'qingzhu',
    name: '青竹烟雨',
    desc: '竹影为伴，剑气如烟，闲步人间。',
    image: '/images/skins/qingzhu.png',
    price: 188,
    quality: 'red',
  },
]

export const SKIN_BY_ID: Record<string, SkinDef> = Object.fromEntries(
  SKINS.map((s) => [s.id, s]),
)

/** 主角立绘：按存档 skin 取图；未知 id 回落到默认剑客图 */
export const PLAYER_FALLBACK_ART = '/images/player-swordsman.png'

export function skinArt(skinId: string | undefined): string {
  if (skinId && SKIN_BY_ID[skinId]) return SKIN_BY_ID[skinId].image
  return SKIN_BY_ID.default.image
}
