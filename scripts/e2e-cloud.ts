/**
 * 云存档前端链路 headless 端到端自检。
 *
 * 前提：本地 uvicorn 已启动（cd server && uvicorn app.main:app --port 8000）。
 * 用法：npx tsx scripts/e2e-cloud.ts
 *
 * 覆盖：游客登录 → 云端无存档时推送本地(base_version=0) → 标脏后 syncNow 增量推送
 *       → 版本号递增 → 本地存档清空后（同账号）重新 bootstrap 采纳云端存档。
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

async function serverVersion(token: string): Promise<number | null> {
  const res = await fetch(`${API}/save`, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`fetch save ${res.status}`)
  return ((await res.json()) as { version: number }).version
}

async function main(): Promise<void> {
  const { bootstrapCloud, syncNow, useCloudStore, _resetCloudForTest } = await import(
    '../lib/game/api/cloud'
  )
  const { useGameStore } = await import('../lib/game/state/store')

  useGameStore.getState().addLog('e2e: 本地存档初始内容', 'system')
  await bootstrapCloud()
  const s1 = useCloudStore.getState()
  if (s1.status !== 'synced') throw new Error(`bootstrap 后状态应为 synced，实际 ${s1.status} (${s1.message})`)
  console.log(`PASS bootstrap → synced, version=${s1.version}, userId=${s1.userId}`)

  useGameStore.getState().addLog('e2e: 第二次写入', 'system')
  syncNow()
  await new Promise((r) => setTimeout(r, 2500))
  const s2 = useCloudStore.getState()
  if (s2.version !== s1.version + 1) {
    throw new Error(`增量推送后版本应 +1，实际 ${s1.version} → ${s2.version}`)
  }
  console.log(`PASS 增量推送 → version=${s2.version}`)

  const token = (JSON.parse(memStore.get('fanchen-wendao-cloud') ?? '{}') as { token: string }).token
  const remoteV = await serverVersion(token)
  if (remoteV !== s2.version) throw new Error(`服务端版本 ${remoteV} 与客户端记录 ${s2.version} 不一致`)
  console.log(`PASS 服务端版本一致 (${remoteV})`)

  // 模拟「同一账号、本地存档被清空」：保留云 meta（device_id 决定账号），重置游戏存档为全新，
  // bootstrap 应识别本地为新档并采纳云端存档
  useGameStore.getState().reset()
  _resetCloudForTest()
  await bootstrapCloud()
  const s3 = useCloudStore.getState()
  const logs = useGameStore.getState().save.log.map((l) => l.text)
  if (!logs.some((t) => t.includes('e2e: 第二次写入'))) {
    throw new Error('采纳云端后未包含已上传的内容')
  }
  console.log(`PASS 本地新档采纳云端存档, version=${s3.version}`)

  console.log('E2E CLOUD OK')
  process.exit(0)
}

main().catch((err) => {
  console.error('E2E CLOUD FAIL:', err)
  process.exit(1)
})
