/* ------------------------------------------------------------------ *
 * 福利配置：每日签到（7 天一轮）与累计在线时长里程碑
 *
 * 数值口径：base 奖励按「最高关卡 × 0.08」线性放大（见 store.signIn），
 * 保证推关越远的玩家领到的资源越有用，但不会随境界指数级膨胀。
 * ------------------------------------------------------------------ */

import type { Quality } from '../types'

export interface WelfareReward {
  stone?: number
  cultivation?: number
  immortalJade?: number
  /** 额外赠送的材料 id → 数量 */
  materials?: Record<string, number>
  /** 额外赠送的丹药 id → 数量 */
  pills?: Record<string, number>
}

export interface SignInDay extends WelfareReward {
  /** 本轮第几天（1 起） */
  day: number
  /** 该天的卖点描述 */
  note: string
  quality: Quality
}

/** 7 天一轮；连续签到不断则循环，断签回到第 1 天 */
export const SIGN_IN_CYCLE: SignInDay[] = [
  { day: 1, stone: 2000, cultivation: 800, note: '灵石 · 修为', quality: 'white' },
  { day: 2, stone: 3000, cultivation: 1200, note: '灵石 · 修为', quality: 'green' },
  { day: 3, stone: 5000, cultivation: 2000, note: '灵石 · 修为', quality: 'green' },
  {
    day: 4,
    stone: 5000,
    cultivation: 2000,
    immortalJade: 20,
    note: '仙玉 · 灵石 · 修为',
    quality: 'blue',
  },
  {
    day: 5,
    stone: 8000,
    cultivation: 3000,
    pills: { pill_juqi_dan: 3 },
    note: '聚气丹 ×3',
    quality: 'blue',
  },
  {
    day: 6,
    stone: 8000,
    cultivation: 3000,
    materials: { mat_jing_tie: 5, mat_yao_gu: 5 },
    note: '炼器 · 丹材',
    quality: 'purple',
  },
  {
    day: 7,
    stone: 15000,
    cultivation: 6000,
    immortalJade: 60,
    pills: { pill_ningyuan_dan: 2 },
    note: '凝元丹 ×2 · 仙玉',
    quality: 'orange',
  },
]

export interface PlaytimeMilestone {
  /** 累计在线分钟数 */
  minutes: number
  label: string
  stone: number
  cultivation: number
  immortalJade: number
}

/** 累计在线里程碑（按存档 stats.playTime 判定，可一次性全部补领） */
export const PLAY_TIME_MILESTONES: PlaytimeMilestone[] = [
  { minutes: 10, label: '初入山门', stone: 1500, cultivation: 600, immortalJade: 0 },
  { minutes: 30, label: '半日修行', stone: 4000, cultivation: 1500, immortalJade: 10 },
  { minutes: 60, label: '一日苦修', stone: 8000, cultivation: 3000, immortalJade: 20 },
  { minutes: 120, label: '两日不辍', stone: 15000, cultivation: 6000, immortalJade: 40 },
  { minutes: 240, label: '四日闭关', stone: 30000, cultivation: 12000, immortalJade: 80 },
  { minutes: 480, label: '八日入定', stone: 60000, cultivation: 24000, immortalJade: 150 },
]

/** 签到奖励的关卡放大系数：最高关卡越高，基础奖励按此线性抬升 */
export const WELFARE_STAGE_SCALE = 0.08

export function welfareScale(maxStage: number): number {
  return 1 + Math.max(0, maxStage) * WELFARE_STAGE_SCALE
}

export interface SignInState {
  /** 今天是否还能签到 */
  claimable: boolean
  /** 今天签到会落在本轮第几天（1 起） */
  day: number
  /** 若今天签到后的连续天数 */
  streakAfter: number
  /** 今天已签到时为 true */
  doneToday: boolean
}

/**
 * 由签到存档推出当前状态。store.signIn 与福利页共用这一份判定，
 * 避免「界面说能签、点了说不能签」这类不一致。
 */
export function signInState(
  welfare: { lastSignInDay: number; streak: number },
  today: number,
): SignInState {
  if (welfare.lastSignInDay === today) {
    const day = ((Math.max(1, welfare.streak) - 1) % SIGN_IN_CYCLE.length) + 1
    return { claimable: false, day, streakAfter: welfare.streak, doneToday: true }
  }
  const streakAfter = welfare.lastSignInDay === today - 1 ? welfare.streak + 1 : 1
  const day = ((streakAfter - 1) % SIGN_IN_CYCLE.length) + 1
  return { claimable: true, day, streakAfter, doneToday: false }
}

/** 取本轮第 day 天的奖励定义（越界时按循环取模兜底） */
export function signInReward(day: number): SignInDay {
  const index = ((day - 1) % SIGN_IN_CYCLE.length + SIGN_IN_CYCLE.length) % SIGN_IN_CYCLE.length
  return SIGN_IN_CYCLE[index]
}
