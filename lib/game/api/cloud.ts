/**
 * 云存档同步管理器（PRD 3.3：服务端权威）。
 *
 * - 游客登录按 device_id 幂等，token / userId / 服务端版本号持久化在 localStorage。
 * - 启动时拉取云存档：本地是全新存档则直接采纳云端；否则按 updatedAt 取新（30s 时钟容差）。
 * - 游玩中本地每次存档变更标脏，15s 节流推送；写冲突（409）整体采纳服务端存档。
 * - 一切网络/鉴权失败静默降级为本地模式，游戏不受任何影响。
 */

import { create } from 'zustand'
import { useGameStore } from '../state/store'
import type { GameSave } from '../types'
import {
  ApiError,
  fetchSave,
  guestLogin,
  uploadSave,
  type SaveConflictPayload,
} from './client'
import { initAnalytics, setAnalyticsToken, trackEvent } from './analytics'

const META_KEY = 'fanchen-wendao-cloud'
const PUSH_INTERVAL_MS = 15_000
/** 两端 updatedAt 差小于该值视为「同一份」，避免时钟误差导致互相覆盖 */
const CLOCK_SKEW_MS = 30_000

interface CloudMeta {
  deviceId: string
  token: string | null
  userId: number | null
  /** 客户端已确认的服务端存档版本号（首次上传为 0） */
  version: number
}

export type CloudStatus = 'off' | 'connecting' | 'synced' | 'syncing' | 'error'

interface CloudState {
  status: CloudStatus
  userId: number | null
  version: number
  lastSyncedAt: number | null
  /** error 状态下的人类可读原因 */
  message: string | null
}

export const useCloudStore = create<CloudState>(() => ({
  status: 'off',
  userId: null,
  version: 0,
  lastSyncedAt: null,
  message: null,
}))

let meta: CloudMeta | null = null
let started = false
let dirty = false
let pushing = false
let pushTimer: number | null = null
let unsubscribe: (() => void) | null = null

function loadMeta(): CloudMeta | null {
  try {
    const raw = window.localStorage.getItem(META_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CloudMeta>
    if (typeof parsed.deviceId !== 'string' || !parsed.deviceId) return null
    return {
      deviceId: parsed.deviceId,
      token: typeof parsed.token === 'string' ? parsed.token : null,
      userId: typeof parsed.userId === 'number' ? parsed.userId : null,
      version: typeof parsed.version === 'number' ? parsed.version : 0,
    }
  } catch {
    return null
  }
}

function persistMeta(): void {
  if (!meta) return
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    /* 存储满 / 隐私模式：保持内存态 */
  }
}

function ensureMeta(): CloudMeta {
  const loaded = loadMeta()
  if (loaded) {
    meta = loaded
    return loaded
  }
  const deviceId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `dev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  meta = { deviceId, token: null, userId: null, version: 0 }
  persistMeta()
  return meta
}

function setStatus(patch: Partial<CloudState>): void {
  useCloudStore.setState(patch)
}

/** 游客登录（或 token 失效后重登）；成功则更新 meta 并回报 token。 */
async function ensureAuth(): Promise<string> {
  const m = ensureMeta()
  const auth = await guestLogin(m.deviceId)
  m.token = auth.token
  m.userId = auth.user_id
  persistMeta()
  setAnalyticsToken(auth.token)
  setStatus({ userId: auth.user_id })
  if (auth.is_new) trackEvent('login', { is_new: true })
  return auth.token
}

function isFreshLocalSave(save: GameSave): boolean {
  return save.stats.playTime <= 0 && save.progress.maxStage <= 1
}

/** 采纳服务端存档：整体替换本地（PRD 3.3 服务端权威）。 */
function adoptServerSave(serverSave: unknown, serverVersion: number): void {
  useGameStore.getState().importSave(JSON.stringify(serverSave))
  if (meta) {
    meta.version = serverVersion
    persistMeta()
  }
  dirty = false
  setStatus({ version: serverVersion, lastSyncedAt: Date.now(), status: 'synced', message: null })
}

/** 推送本地存档；冲突采纳服务端，401 重登后重试一次。 */
async function push(retried = false): Promise<void> {
  if (pushing || !meta) return
  pushing = true
  setStatus({ status: 'syncing' })
  try {
    if (!meta.token) await ensureAuth()
    const token = meta.token as string
    const save = useGameStore.getState().save
    const res = await uploadSave(token, save, meta.version, save.updatedAt)
    meta.version = res.version
    persistMeta()
    dirty = false
    setStatus({ status: 'synced', version: res.version, lastSyncedAt: Date.now(), message: null })
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const payload = err.payload as SaveConflictPayload
      if (payload && typeof payload.server_version === 'number' && payload.server_save) {
        adoptServerSave(payload.server_save, payload.server_version)
      }
    } else if (err instanceof ApiError && err.status === 401 && !retried) {
      meta.token = null
      pushing = false
      await push(true)
      return
    } else {
      setStatus({ status: 'error', message: err instanceof Error ? err.message : 'network' })
    }
  } finally {
    pushing = false
  }
}

/** 启动时与云端对齐一次。 */
async function initialSync(): Promise<void> {
  if (!meta) return
  if (!meta.token) await ensureAuth()
  const token = meta.token as string
  try {
    const remote = await fetchSave(token)
    const local = useGameStore.getState().save
    const remoteSave = remote.save as GameSave
    const remoteUpdatedAt =
      typeof remoteSave?.updatedAt === 'number' ? remoteSave.updatedAt : 0
    meta.version = remote.version
    persistMeta()

    if (isFreshLocalSave(local) || remoteUpdatedAt > local.updatedAt + CLOCK_SKEW_MS) {
      adoptServerSave(remoteSave, remote.version)
    } else if (local.updatedAt > remoteUpdatedAt + CLOCK_SKEW_MS || remoteUpdatedAt === 0) {
      dirty = true
      await push()
    } else {
      // 同一份存档：仅对齐版本号
      dirty = false
      setStatus({ status: 'synced', version: remote.version, lastSyncedAt: Date.now() })
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      dirty = true // 云端无存档：把本地推上去
      await push()
      return
    }
    if (err instanceof ApiError && err.status === 401) {
      meta.token = null
      await ensureAuth()
      return initialSync()
    }
    throw err
  }
}

function schedulePush(): void {
  if (pushTimer !== null) return
  pushTimer = window.setTimeout(() => {
    pushTimer = null
    if (dirty) void push()
  }, PUSH_INTERVAL_MS)
}

function markDirty(): void {
  dirty = true
  schedulePush()
}

/** 立即同步一次（徽章点按重试 / 切后台时调用）。 */
export function syncNow(): void {
  if (!started) {
    void bootstrapCloud()
    return
  }
  void push()
}

/** 启动云同步；幂等。仅在客户端调用。 */
export async function bootstrapCloud(): Promise<void> {
  if (started || typeof window === 'undefined') return
  started = true

  initAnalytics()
  ensureMeta()
  setStatus({ status: 'connecting' })

  try {
    await initialSync()
  } catch (err) {
    setStatus({ status: 'error', message: err instanceof Error ? err.message : 'network' })
  }

  // 本地存档任何变更 → 标脏，节流推送
  unsubscribe = useGameStore.subscribe((state, prev) => {
    if (state.save !== prev.save) markDirty()
  })

  const onHidden = () => {
    if (document.visibilityState === 'hidden' && dirty) void push()
  }
  document.addEventListener('visibilitychange', onHidden)
  window.addEventListener('pagehide', onHidden)
}

/** 仅测试用：重置模块态。 */
export function _resetCloudForTest(): void {
  started = false
  dirty = false
  pushing = false
  if (pushTimer !== null) window.clearTimeout(pushTimer)
  pushTimer = null
  unsubscribe?.()
  unsubscribe = null
}
