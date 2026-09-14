/**
 * 云存档前端链路 headless 端到端自检。
 *
 * 前提：本地 uvicorn 已启动（cd server && uvicorn app.main:app --port 8000）。
 * 用法：npx tsx scripts/e2e-cloud.ts
 *
 * 覆盖：
 *   1. 游客试玩建档 → 云端无存档时推送本地(base_version=0) → 版本号递增
 *   2. 本地存档清空后（同身份）重新 bootstrap → 采纳云端存档
 *   3. 注册站内账号 → 游客期间的本地进度被推到新账号
 *   4. 仙缘榜能查到该账号
 *   5. 登出 → 回到未登录态且本地存档被清空
 *   6. 用账号密码重新登录 → 采纳该账号的云端存档
 */

const API = 'http://127.0.0.1:8000'
// client.ts 在模块加载时读取该环境变量，必须先于动态 import 设置
process.env.NEXT_PUBLIC_API_URL = API

const memStore = new Map<string, string>()
const storageShim = {
  getItem: (k: string) => memStore.get(k) ?? null,
  setItem: (k: string, v: string) => void memStore.set(k, v),
  removeItem: (k: string) => void memStore.delete(k),
}
;(globalThis as Record<string, unknown>).localStorage = storageShim
;(globalThis as Record<string, unknown>).window = {
  localStorage: storageShim,
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
  setInterval: globalThis.setInterval.bind(globalThis),
  clearInterval: globalThis.clearInterval.bind(globalThis),
  addEventListener: () => undefined,
}
;(globalThis as Record<string, unknown>).document = {
  addEventListener: () => undefined,
  visibilityState: 'visible',
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function serverVersion(token: string): Promise<number | null> {
  const res = await fetch(`${API}/save`, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`fetch save ${res.status}`)
  return ((await res.json()) as { version: number }).version
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

async function main(): Promise<void> {
  const cloud = await import('../lib/game/api/cloud')
  const { useGameStore } = await import('../lib/game/state/store')

  useGameStore.getState().addLog('e2e: 本地存档初始内容', 'system')

  /* ---------------- 1. 游客试玩 ---------------- */
  await cloud.continueAsGuest()
  const s1 = cloud.useCloudStore.getState()
  assert(s1.authed === true, '游客试玩后应为已登录态')
  assert(s1.status === 'synced', `游客建档后应为 synced，实际 ${s1.status} (${s1.message})`)
  assert(s1.mode === 'guest', `身份应为 guest，实际 ${s1.mode}`)
  console.log(`PASS 游客建档 → synced, version=${s1.version}, userId=${s1.userId}`)

  /* ---------------- 2. 增量推送 ---------------- */
  useGameStore.getState().addLog('e2e: 第二次写入', 'system')
  cloud.syncNow()
  await wait(2500)
  const s2 = cloud.useCloudStore.getState()
  assert(s2.version === s1.version + 1, `增量推送后版本应 +1，实际 ${s1.version} → ${s2.version}`)
  console.log(`PASS 增量推送 → version=${s2.version}`)

  const guestToken = (JSON.parse(memStore.get('fanchen-wendao-cloud') ?? '{}') as { token: string }).token
  assert((await serverVersion(guestToken)) === s2.version, '服务端版本与客户端记录不一致')
  console.log(`PASS 服务端版本一致 (${s2.version})`)

  /* ---------------- 3. 本地清空后重新 bootstrap ---------------- */
  useGameStore.getState().reset()
  cloud._resetCloudForTest()
  await cloud.bootstrapCloud()
  const s3 = cloud.useCloudStore.getState()
  assert(s3.authed === true, '已有 token 时 bootstrap 应直接进入已登录态')
  assert(
    useGameStore.getState().save.log.some((l) => l.text.includes('e2e: 第二次写入')),
    '采纳云端后未包含已上传的内容',
  )
  console.log(`PASS 本地新档采纳云端存档, version=${s3.version}`)

  /* ---------------- 4. 注册账号，游客进度转移 ---------------- */
  const username = `e2e_${Date.now().toString(36)}`
  const password = 'pass1234'
  await cloud.registerNewAccount(username, password)
  const s4 = cloud.useCloudStore.getState()
  assert(s4.mode === 'account', `注册后身份应为 account，实际 ${s4.mode}`)
  assert(s4.username === username, '注册后用户名不一致')
  assert(s4.status === 'synced', `注册后应为 synced，实际 ${s4.status} (${s4.message})`)
  assert(
    useGameStore.getState().save.log.some((l) => l.text.includes('e2e: 第二次写入')),
    '注册后应保留游客期间的本地进度',
  )
  console.log(`PASS 注册 ${username} → 游客进度已转移, version=${s4.version}, uid=${s4.userId}`)

  /* ---------------- 4.5 版本冲突契约（多端同时玩的核心路径） ---------------- */
  {
    const { uploadSave, ApiError } = await import('../lib/game/api/client')
    const token = (JSON.parse(memStore.get('fanchen-wendao-cloud') ?? '{}') as { token: string }).token
    const stale = useGameStore.getState().save
    try {
      await uploadSave(token, stale, 0, stale.updatedAt) // 用一个过期的 base_version 写
      throw new Error('过期 base_version 应当返回 409')
    } catch (err) {
      assert(err instanceof ApiError && err.status === 409, `应抛 409，实际 ${String(err)}`)
      const payload = err.payload as { server_save?: unknown; server_version?: number; code?: string }
      assert(payload.code === 'save_conflict', '冲突响应应带 code=save_conflict')
      assert(payload.server_save, '冲突响应应带回服务端存档（客户端据此整体采纳）')
      assert(typeof payload.server_version === 'number', '冲突响应应带回服务端版本号')
    }
    console.log('PASS 版本冲突 → 409 带回服务端存档与版本号')
  }

  /* ---------------- 5. 打两关后仙缘榜能查到 ---------------- */
  for (let i = 0; i < 2; i++) {
    useGameStore.getState().startBattle()
    useGameStore.getState().finishBattle(true)
  }
  cloud.syncNow()
  await wait(2500)

  const { fetchLeaderboard } = await import('../lib/game/api/client')
  const accountToken = (JSON.parse(memStore.get('fanchen-wendao-cloud') ?? '{}') as { token: string }).token
  const board = await fetchLeaderboard('stage', 50)
  const mine = board.entries.find((e) => e.user_id === s4.userId)
  assert(mine, `仙缘榜里应能查到 uid=${s4.userId}（总榜 ${board.total} 人）`)
  assert((await fetchLeaderboard('stage', 50, accountToken)).me?.user_id === s4.userId, '带 token 时应返回 me 条目')
  console.log(`PASS 仙缘榜 → 名次 ${mine.rank}/${board.total}，${mine.name} ${mine.detail}`)

  /* ---------------- 6. 登出 ---------------- */
  await cloud.logout()
  const s5 = cloud.useCloudStore.getState()
  assert(s5.authed === false, '登出后应回到未登录态')
  assert(memStore.get('fanchen-wendao-cloud') !== undefined, '登出后应保留 deviceId（不残留 token）')
  assert(
    !(JSON.parse(memStore.get('fanchen-wendao-cloud') ?? '{}') as { token?: string }).token,
    '登出后 token 应被清空',
  )
  console.log('PASS 登出 → 已清空身份与本地存档')

  /* ---------------- 7. 账号密码重新登录 ---------------- */
  cloud._resetCloudForTest()
  await cloud.loginAccount(username, password)
  const s6 = cloud.useCloudStore.getState()
  assert(s6.authed === true && s6.mode === 'account', '登录后应为账号身份')
  assert(
    useGameStore.getState().save.log.some((l) => l.text.includes('e2e: 第二次写入')),
    '重新登录后应采纳该账号的云端存档',
  )
  console.log(`PASS 账号重新登录 → 云端存档已恢复, version=${s6.version}`)

  console.log('E2E CLOUD OK')
  process.exit(0)
}

main().catch((err) => {
  console.error('E2E CLOUD FAIL:', err)
  process.exit(1)
})
