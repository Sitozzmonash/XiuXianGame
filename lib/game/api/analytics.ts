/**
 * 埋点批量上报（PRD 49）：内存队列 + 定时/切后台冲刷。
 * 任何失败都静默吞掉——埋点永远不能影响游戏。
 */

import { postEvents, type AnalyticsEventIn } from './client'

const FLUSH_INTERVAL_MS = 30_000
const FLUSH_THRESHOLD = 20

let token: string | null = null
let queue: AnalyticsEventIn[] = []
let timer: number | null = null
let flushing = false

const sessionId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 16)
    : `s${Date.now().toString(36)}`

export function setAnalyticsToken(t: string | null): void {
  token = t
}

export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  queue.push({ name, ts: Date.now(), props, session_id: sessionId })
  if (queue.length >= FLUSH_THRESHOLD) void flushAnalytics()
}

export async function flushAnalytics(keepalive = false): Promise<void> {
  if (flushing || queue.length === 0) return
  const batch = queue.slice(0, 500)
  queue = queue.slice(batch.length)
  flushing = true
  try {
    await postEvents(batch, token, keepalive)
  } catch {
    queue = [...batch, ...queue].slice(-500) // 失败回队，丢弃最旧防膨胀
  } finally {
    flushing = false
  }
}

/** 启动定时冲刷；幂等。返回清理函数（仅测试用）。 */
export function initAnalytics(): () => void {
  if (typeof window === 'undefined' || timer !== null) return () => undefined
  timer = window.setInterval(() => void flushAnalytics(), FLUSH_INTERVAL_MS)
  const onHidden = () => {
    if (document.visibilityState === 'hidden') void flushAnalytics(true)
  }
  document.addEventListener('visibilitychange', onHidden)
  return () => {
    if (timer !== null) window.clearInterval(timer)
    timer = null
    document.removeEventListener('visibilitychange', onHidden)
  }
}
