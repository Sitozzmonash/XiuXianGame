/**
 * 云存档同步管理器（PRD 3.3：服务端权威）。
 *
 * 身份有三种状态：
 * - `anon`    未选择身份（首次进入游戏，停在登录页）
 * - `guest`   游客试玩：按 device_id 幂等建档，进度自动上云
 * - `account` 站内账号（用户名 + 密码）：可在任何设备登录，进度跟着账号走
 *
 * 同步策略：
 * - 启动 / 登录后拉一次云存档：本地是全新存档或云端更新，则整体采纳云端；
 *   本地更新则推送；同一份则只对齐版本号。
 * - 游玩中本地每次存档变更标脏，15s 节流推送；写冲突（409）整体采纳服务端存档。
 * - 一切网络/鉴权失败静默降级为本地模式，游戏不受任何影响。
 */

import { create } from 'zustand'
import { useGameStore } from '../state/store'
import { power } from '../state/selectors'
import { REALM_IDS, flatStage } from '../config/realms'
import { globalToMap } from '../config/maps'
import type { GameSave, RankSummary } from '../types'
import {
  ApiError,
  fetchMe,
  fetchSave,
  guestLogin,
  passwordLogin,
  registerAccount,
  uploadSave,
  type SaveConflictPayload,
} from './client'
import { initAnalytics, setAnalyticsToken, trackEvent } from './analytics'

const META_KEY = 'fanchen-wendao-cloud'
const PUSH_INTERVAL_MS = 15_000
/** 两端 updatedAt 差小于该值视为「同一份」，避免时钟误差导致互相覆盖 */
const CLOCK_SKEW_MS = 30_000

export type IdentityMode = 'guest' | 'account' | null

interface CloudMeta {
  deviceId: string
  token: string | null
  userId: number | null
  /** 站内账号名；游客为 null */
  username: string | null
  isAdmin: boolean
  mode: IdentityMode
  /** 客户端已确认的服务端存档版本号（首次上传为 0） */
  version: number
  /**
   * 云端是否已有该身份的存档；null 表示未知。
   * 已确认「没有」时启动可以直接推送，省掉一次必然 404 的 GET（浏览器会把它记成控制台报错）。
   * 即便判断过时，POST 的 base_version 乐观锁也会拦下来（409 → 采纳服务端存档）。
   */
  hasSave: boolean | null
}

export type CloudStatus = 'off' | 'connecting' | 'synced' | 'syncing' | 'error'

interface CloudState {
  status: CloudStatus
  /** 是否已选好身份（false 时停在登录页）；null 表示还在确认中 */
  authed: boolean | null
  mode: IdentityMode
  userId: number | null
  username: string | null
  isAdmin: boolean
  version: number
  lastSyncedAt: number | null
  /** error 状态下的人类可读原因 */
  message: string | null
}

export const useCloudStore = create<CloudState>(() => ({
  status: 'off',
  authed: null,
  mode: null,
  userId: null,
  username: null,
  isAdmin: false,
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

/* ------------------------------------------------------------------ *
 * 元数据持久化
 * ------------------------------------------------------------------ */

function emptyMeta(deviceId: string): CloudMeta {
  return {
    deviceId,
    token: null,
    userId: null,
    username: null,
    isAdmin: false,
    mode: null,
    version: 0,
    hasSave: null,
  }
}

function newDeviceId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `dev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

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
      username: typeof parsed.username === 'string' ? parsed.username : null,
      isAdmin: parsed.isAdmin === true,
      mode: parsed.mode === 'guest' || parsed.mode === 'account' ? parsed.mode : null,
      version: typeof parsed.version === 'number' ? parsed.version : 0,
      hasSave: typeof parsed.hasSave === 'boolean' ? parsed.hasSave : null,
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
  meta = emptyMeta(newDeviceId())
  persistMeta()
  return meta
}

function setStatus(patch: Partial<CloudState>): void {
  useCloudStore.setState(patch)
}

function applyIdentity(m: CloudMeta): void {
  setStatus({
    mode: m.mode,
    userId: m.userId,
    username: m.username,
    isAdmin: m.isAdmin,
    version: m.version,
  })
}

/* ------------------------------------------------------------------ *
 * 登录 / 注册 / 登出
 * ------------------------------------------------------------------ */

/** 游客登录（或 token 失效后重登）；成功则更新 meta。 */
async function ensureGuestAuth(): Promise<string> {
  const m = ensureMeta()
  const auth = await guestLogin(m.deviceId)
  m.token = auth.token
  m.userId = auth.user_id
  m.username = null
  m.isAdmin = false
  m.mode = 'guest'
  // 全新设备必然没有云存档：直接标记，省掉一次注定 404 的 GET
  if (auth.is_new) m.hasSave = false
  persistMeta()
  setAnalyticsToken(auth.token)
  applyIdentity(m)
  if (auth.is_new) trackEvent('login', { is_new: true, mode: 'guest' })
  return auth.token
}

/**
 * 换身份后与云端对齐一次。
 *
 * 规则：云端已有存档 → 采纳云端（账号的进度说了算）；
 * 云端没有 → 把本地存档推上去（注册场景：游客期间玩的进度不丢）。
 */
async function attachIdentity(token: string): Promise<void> {
  const m = meta
  if (!m) return
  if (m.hasSave === false && m.version === 0) {
    dirty = true
    await push()
    return
  }
  try {
    const remote = await fetchSave(token)
    m.version = remote.version
    m.hasSave = true
    persistMeta()
    adoptServerSave(remote.save, remote.version)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      m.hasSave = false
      persistMeta()
      dirty = true
      await push()
      return
    }
    throw err
  }
}

/** 站内账号登录：账号下已有云存档则以云端为准。 */
export async function loginAccount(username: string, password: string): Promise<void> {
  const m = ensureMeta()
  const res = await passwordLogin(username, password)
  m.token = res.token
  m.userId = res.user_id
  m.username = res.username ?? username
  m.isAdmin = res.is_admin === true
  m.mode = 'account'
  m.version = 0
  m.hasSave = res.has_save // 服务端直接告知，省掉一次探测 GET
  persistMeta()
  setAnalyticsToken(res.token)
  applyIdentity(m)
  setStatus({ authed: true, status: 'connecting', message: null })
  startSyncLoop()
  trackEvent('login', { is_new: false, mode: 'account' })
  await attachIdentity(res.token)
}

/** 注册并直接登录；注册前若在游客态，本地进度会被推到新账号上。 */
export async function registerNewAccount(username: string, password: string): Promise<void> {
  const m = ensureMeta()
  const res = await registerAccount(username, password)
  m.token = res.token
  m.userId = res.user_id
  m.username = res.username
  m.isAdmin = res.is_admin === true
  m.mode = 'account'
  m.version = 0
  m.hasSave = false // 刚注册的账号必然没有云存档
  persistMeta()
  setAnalyticsToken(res.token)
  applyIdentity(m)
  setStatus({ authed: true, status: 'connecting', message: null })
  startSyncLoop()
  trackEvent('login', { is_new: true, mode: 'account' })
  await attachIdentity(res.token)
}

/** 游客试玩：建档并立即开始同步。 */
export async function continueAsGuest(): Promise<void> {
  setStatus({ status: 'connecting', message: null })
  await ensureGuestAuth()
  setStatus({ authed: true })
  startSyncLoop()
  await initialSync()
}

/**
 * 登出：先把本地进度推上去，再清空身份信息与本地存档。
 * 清本地存档是为了避免下一个登录的账号继承上一个账号的进度。
 */
export async function logout(): Promise<void> {
  if (meta?.token) {
    try {
      dirty = true
      await push()
    } catch {
      /* 离线登出：云端可能落后，但本地必须清干净 */
    }
  }
  stopSyncLoop()
  meta = emptyMeta(meta?.deviceId ?? newDeviceId())
  persistMeta()
  setAnalyticsToken(null)
  useGameStore.getState().reset()
  setStatus({
    status: 'off',
    authed: false,
    mode: null,
    userId: null,
    username: null,
    isAdmin: false,
    version: 0,
    lastSyncedAt: null,
    message: null,
  })
  trackEvent('logout', {})
}

/* ------------------------------------------------------------------ *
 * 同步
 * ------------------------------------------------------------------ */

function isFreshLocalSave(save: GameSave): boolean {
  return save.stats.playTime <= 0 && save.progress.maxStage <= 1
}

/**
 * 仙缘榜排序摘要：服务端不跑引擎，排序所需的派生字段由这里算好随存档上传。
 * 只是展示口径，不参与任何数值结算（见 server/app/routers/leaderboard.py）。
 */
export function rankSummary(save: GameSave): RankSummary {
  const realmId = flatStage(save.profile.stageId).realm.id
  const realmIndex = REALM_IDS.indexOf(realmId)
  const maxStage = save.progress.maxStage
  // 榜单按「已通关的最高关卡」排序，标签也用同一口径，避免榜单值与副标题对不上
  const cleared = maxStage > 0 ? globalToMap(maxStage) : null
  return {
    name: save.profile.name || '无名散修',
    power: Math.round(power(save)),
    realmIndex: realmIndex < 0 ? 0 : realmIndex,
    realmLabel: flatStage(save.profile.stageId).stage.label,
    stageLabel: cleared ? `${cleared.map.name} · 第 ${maxStage} 关` : '尚未出山',
    stage: maxStage,
  }
}

/** 采纳服务端存档：整体替换本地（PRD 3.3 服务端权威）。 */
function adoptServerSave(serverSave: unknown, serverVersion: number): void {
  useGameStore.getState().importSave(JSON.stringify(serverSave))
  if (meta) {
    meta.version = serverVersion
    meta.hasSave = true
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
    if (!meta.token) await ensureGuestAuth()
    const token = meta.token as string
    const save = useGameStore.getState().save
    const payload = { ...save, rank: rankSummary(save) }
    const res = await uploadSave(token, payload, meta.version, save.updatedAt)
    meta.version = res.version
    meta.hasSave = true
    persistMeta()
    dirty = false
    setStatus({ status: 'synced', version: res.version, lastSyncedAt: Date.now(), message: null })
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const payload = err.payload as SaveConflictPayload
      if (payload && typeof payload.server_version === 'number' && payload.server_save) {
        adoptServerSave(payload.server_save, payload.server_version)
      } else if (payload && payload.server_save == null && meta) {
        // 服务端存档已不存在（如运维重置）：版本号归零，15s 后下一轮推送自动重建，
        // 否则客户端永远带着旧 base_version 重试，同步徽标卡在「同步中」
        meta.version = 0
        meta.hasSave = false
        persistMeta()
        setStatus({ status: 'error', version: 0, message: '云端存档缺失，稍后自动重建' })
        schedulePush()
      }
    } else if (err instanceof ApiError && err.status === 401 && !retried) {
      meta.token = null
      pushing = false
      // 账号 token 过期：不能悄悄降级成游客，交回登录页重新登录
      if (meta.mode === 'account') {
        setStatus({ status: 'error', authed: false, message: '登录已过期，请重新登录' })
        return
      }
      await push(true)
      return
    } else {
      setStatus({ status: 'error', message: err instanceof Error ? err.message : 'network' })
    }
  } finally {
    pushing = false
  }
}

/** 启动 / 登录时与云端对齐一次。 */
async function initialSync(): Promise<void> {
  if (!meta) return
  if (!meta.token) await ensureGuestAuth()
  const token = meta.token as string

  // 已知云端没有这份身份的存档：直接推，省掉一次必然 404 的 GET
  if (meta.hasSave === false && meta.version === 0) {
    dirty = true
    await push()
    return
  }

  try {
    const remote = await fetchSave(token)
    const local = useGameStore.getState().save
    const remoteSave = remote.save as GameSave
    const remoteUpdatedAt =
      typeof remoteSave?.updatedAt === 'number' ? remoteSave.updatedAt : 0
    meta.version = remote.version
    meta.hasSave = true
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
      meta.hasSave = false // 云端无存档：把本地推上去（base_version 归零，走「新建」路径）
      meta.version = 0
      persistMeta()
      dirty = true
      await push()
      return
    }
    if (err instanceof ApiError && err.status === 401) {
      if (meta.mode === 'account') {
        setStatus({ status: 'error', authed: false, message: '登录已过期，请重新登录' })
        return
      }
      meta.token = null
      await ensureGuestAuth()
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

/** 当前身份 token；给需要鉴权的只读接口（如仙缘榜的「我的名次」）用。 */
export function cloudAuthToken(): string | null {
  return meta?.token ?? null
}

/**
 * 立刻把本地存档推上云并等待完成。
 * 给「读服务端数据前要确保自己已在榜上」的场景用（如仙缘榜）；失败静默吞掉。
 */
export async function flushCloud(): Promise<void> {
  if (!started || !meta) return
  dirty = true
  try {
    await push()
  } catch {
    /* 离线 / 服务端异常：榜单退化为不带自己，不影响阅读 */
  }
}

/** 立即同步一次（徽章点按重试 / 切后台时调用）。 */
export function syncNow(): void {
  if (!started) {
    void bootstrapCloud()
    return
  }
  void push()
}

function startSyncLoop(): void {
  if (started || typeof window === 'undefined') return
  started = true

  initAnalytics()

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

function stopSyncLoop(): void {
  unsubscribe?.()
  unsubscribe = null
  if (pushTimer !== null) window.clearTimeout(pushTimer)
  pushTimer = null
  started = false
  dirty = false
}

/* ------------------------------------------------------------------ *
 * 启动
 * ------------------------------------------------------------------ */

/**
 * 启动时确认身份：
 * - 本地已有 token → 调 /auth/me 验证，通过则直接进游戏（游客或账号）
 * - token 失效 / 没有 token → authed=false，停在登录页
 */
export async function bootstrapCloud(): Promise<void> {
  if (typeof window === 'undefined') return
  ensureMeta()
  const m = meta as CloudMeta
  if (!m.token) {
    setStatus({ authed: false, status: 'off', message: null })
    initAnalytics()
    return
  }

  setStatus({ status: 'connecting', message: null })
  try {
    const me = await fetchMe(m.token)
    m.userId = me.user_id
    m.username = me.username
    m.isAdmin = me.is_admin
    m.mode = me.is_guest ? 'guest' : 'account'
    persistMeta()
    setAnalyticsToken(m.token)
    applyIdentity(m)
    setStatus({ authed: true })
    startSyncLoop()
    await initialSync()
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      m.token = null
      m.mode = null
      persistMeta()
      setStatus({ authed: false, status: 'off', message: null })
      initAnalytics()
      return
    }
    // 网络不通也要能玩：沿用本地身份继续单机
    applyIdentity(m)
    setStatus({ authed: true, status: 'error', message: err instanceof Error ? err.message : 'network' })
    startSyncLoop()
  }
}

/** 仅测试用：重置模块态。 */
export function _resetCloudForTest(): void {
  stopSyncLoop()
  meta = null
}
