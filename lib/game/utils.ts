/* 通用工具：随机、格式化、属性计算 */

import { ZERO_STATS, type Stats } from './types'

/* ------------------------------ 随机 ------------------------------ */

/** 可播种随机数（mulberry32），用于可重放战斗 */
export function makeRng(seed: number) {
  let a = seed >>> 0
  return {
    next(): number {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
    int(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min
    },
    pick<T>(arr: readonly T[]): T {
      return arr[Math.floor(this.next() * arr.length)]
    },
    chance(p: number): boolean {
      return this.next() < p
    },
  }
}

export type Rng = ReturnType<typeof makeRng>

export const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

export const uid = (prefix = 'u') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/* ------------------------------ 属性 ------------------------------ */

export function addStats(a: Stats, b: Partial<Stats>): Stats {
  const out = { ...a }
  for (const k of Object.keys(b) as (keyof Stats)[]) {
    out[k] = (out[k] ?? 0) + (b[k] ?? 0)
  }
  return out
}

export function mergeStats(...parts: Partial<Stats>[]): Stats {
  let out: Stats = { ...ZERO_STATS }
  for (const p of parts) out = addStats(out, p)
  return out
}

export function scaleStats(s: Partial<Stats>, mul: number): Partial<Stats> {
  const out: Partial<Stats> = {}
  for (const k of Object.keys(s) as (keyof Stats)[]) {
    out[k] = (s[k] ?? 0) * mul
  }
  return out
}

/* ------------------------------ 格式化 ------------------------------ */

export function formatNumber(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}万亿`
  if (abs >= 1e8) return `${(n / 1e8).toFixed(2)}亿`
  if (abs >= 1e4) return `${(n / 1e4).toFixed(2)}万`
  return Math.floor(n).toLocaleString('zh-CN')
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
}

export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`

/* ------------------------------ 日期 ------------------------------ */

/**
 * 玩家本地时区下的「日期序号」（自 1970-01-01 起的天数）。
 * 签到按自然日判定，用本地日期而不是 UTC，跨时区玩家的「今天」才符合直觉。
 */
export function localDayIndex(now: number = Date.now()): number {
  return Math.floor((now - new Date(now).getTimezoneOffset() * 60_000) / 86_400_000)
}
