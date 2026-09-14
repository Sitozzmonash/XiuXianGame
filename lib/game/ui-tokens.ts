/* ------------------------------------------------------------------ *
 * 品质令牌 —— 全站唯一的品质色与文案来源
 *
 * 原在 lib/game-data.ts（与一堆假数据混在一起）。假数据已清空，这里
 * 只保留 UI 真正需要的品质视觉定义，值域与 lib/game/types.ts 的 Quality 对齐。
 * ------------------------------------------------------------------ */

import { QUALITY_ORDER, type Quality } from '@/lib/game/types'

export interface QualityToken {
  label: string
  /** 边框 / 描边色 */
  ring: string
  /** 文字色 */
  text: string
  /** 光晕（低透明度，用于辉光与阴影） */
  glow: string
}

export const QUALITY: Record<Quality, QualityToken> = {
  white: { label: '凡品', ring: '#9aa39c', text: '#d7ddd6', glow: 'rgba(154,163,156,0.4)' },
  green: { label: '灵品', ring: '#5cc0ad', text: '#8ad9c8', glow: 'rgba(92,192,173,0.45)' },
  blue: { label: '玄品', ring: '#5b9bd5', text: '#9cc7ec', glow: 'rgba(91,155,213,0.45)' },
  purple: { label: '地品', ring: '#a97bd6', text: '#c9a6ec', glow: 'rgba(169,123,214,0.5)' },
  orange: { label: '天品', ring: '#e0a24a', text: '#f0c47e', glow: 'rgba(224,162,74,0.5)' },
  red: { label: '仙品', ring: '#d24b3a', text: '#f08a7a', glow: 'rgba(210,75,58,0.55)' },
  rainbow: { label: '神品', ring: '#e8c877', text: '#f6e6b8', glow: 'rgba(232,200,119,0.6)' },
}

/** 品质在序列中的位置，用于排序与「高于/低于」判断 */
export function qualityRank(q: Quality): number {
  return QUALITY_ORDER.indexOf(q)
}

/** 高品质掉落需要额外演出 */
export function isHighQuality(q: Quality): boolean {
  return q === 'orange' || q === 'red' || q === 'rainbow'
}

/* ------------------------------------------------------------------ *
 * 法宝详情弹窗的展示形状
 * 与 TreasureDef / TreasureInstance 区分：这是「给弹窗看的」聚合视图，
 * 由调用方从定义 + 实例拼出来。
 * ------------------------------------------------------------------ */

export interface TreasureDetail {
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
