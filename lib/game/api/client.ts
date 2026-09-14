/**
 * 云存档后端 HTTP 客户端（对应 server/ 的 FastAPI 契约，PRD 43）。
 *
 * 同源部署（Vercel Services）：默认请求 /api/*，无需任何配置。
 * 前后端分离部署：设 NEXT_PUBLIC_API_URL 为后端完整 origin（可含前缀），
 * 例如 https://api.example.com 或 https://api.example.com/api。
 */

export interface GuestAuthResponse {
  token: string
  user_id: number
  is_new: boolean
  created_at: string
  device_id: string
}

export interface LoginResponse {
  token: string
  user_id: number
  created_at: string
  is_guest: boolean
  username: string | null
  is_admin: boolean
  /** 该账号云端是否已有存档 */
  has_save: boolean
}

export interface RegisterResponse {
  token: string
  user_id: number
  username: string
  created_at: string
  is_admin: boolean
  has_save: boolean
}

export interface MeResponse {
  user_id: number
  username: string | null
  is_guest: boolean
  is_admin: boolean
  created_at: string
  providers: string[]
}

export type BoardKey = 'stage' | 'power' | 'realm'

export interface LeaderboardEntry {
  rank: number
  name: string
  user_id: number
  is_self: boolean
  value: number
  detail: string
  is_admin: boolean
}

export interface LeaderboardResponse {
  board: BoardKey
  entries: LeaderboardEntry[]
  me: LeaderboardEntry | null
  total: number
  updated_at: string
}

export interface SaveGetResponse {
  save: unknown
  version: number
  updated_at: string
}

export interface SaveWarning {
  code: string
  resource?: string | null
  detail?: string | null
}

export interface SavePostResponse {
  version: number
  updated_at: string
  size_bytes: number
  suspicious: boolean
  warnings: SaveWarning[]
}

export interface SaveConflictPayload {
  code: 'save_conflict'
  message: string
  server_save: unknown
  server_version: number
  updated_at: string | null
}

export interface AnalyticsEventIn {
  name: string
  ts?: number
  props?: Record<string, unknown>
  session_id?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly payload: unknown

  constructor(status: number, payload: unknown) {
    const detail =
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
    const code =
      (typeof detail?.code === 'string' && detail.code) ||
      (typeof (detail?.detail as Record<string, unknown> | undefined)?.code === 'string'
        ? ((detail?.detail as Record<string, unknown>).code as string)
        : `http_${status}`)
    super(code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.payload = payload
  }
}

const envBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '')

/** 完整 URL：默认同源 /api 前缀；设了 NEXT_PUBLIC_API_URL 则按其原样拼接。 */
function urlFor(path: string): string {
  return envBase ? `${envBase}${path}` : `/api${path}`
}

async function apiFetch<T>(
  path: string,
  opts: { method?: string; token?: string | null; body?: unknown; keepalive?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`

  const res = await fetch(urlFor(path), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    keepalive: opts.keepalive,
  })
  if (!res.ok) {
    let payload: unknown = null
    try {
      payload = await res.json()
    } catch {
      /* 非 JSON 错误体 */
    }
    throw new ApiError(res.status, payload)
  }
  return (await res.json()) as T
}

export function guestLogin(deviceId: string): Promise<GuestAuthResponse> {
  return apiFetch<GuestAuthResponse>('/auth/guest', {
    method: 'POST',
    body: { device_id: deviceId },
  })
}

export function registerAccount(username: string, password: string): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: { username, password },
  })
}

export function passwordLogin(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { provider: 'password', credential: username, password },
  })
}

export function fetchMe(token: string): Promise<MeResponse> {
  return apiFetch<MeResponse>('/auth/me', { token })
}

export function fetchLeaderboard(
  board: BoardKey,
  limit = 50,
  token?: string | null,
): Promise<LeaderboardResponse> {
  return apiFetch<LeaderboardResponse>(`/leaderboard?board=${board}&limit=${limit}`, {
    token: token ?? undefined,
  })
}

export function fetchSave(token: string): Promise<SaveGetResponse> {
  return apiFetch<SaveGetResponse>('/save', { token })
}

export function uploadSave(
  token: string,
  save: unknown,
  baseVersion: number,
  clientUpdatedAt: number,
  keepalive = false,
): Promise<SavePostResponse> {
  return apiFetch<SavePostResponse>('/save', {
    method: 'POST',
    token,
    body: { save, base_version: baseVersion, client_updated_at: clientUpdatedAt },
    keepalive,
  })
}

export function postEvents(
  events: AnalyticsEventIn[],
  token: string | null,
  keepalive = false,
): Promise<{ accepted: number; unknown: number; server_time: string }> {
  return apiFetch('/analytics/events', {
    method: 'POST',
    token: token ?? undefined,
    body: { events },
    keepalive,
  })
}
