/* ------------------------------------------------------------------ *
 * 秘境引擎：路线图推进 + 奖励结算
 * 纯函数 + 无状态控制器：RealmRun 由调用方（store / 页面）传入传出，
 * 本模块不读写 zustand，也不直接修改 GameSave。
 * ------------------------------------------------------------------ */

import type {
  Effect,
  GameSave,
  RealmNode,
  RealmRun,
  SecretRealmDef,
} from '../types'
import { SECRET_REALM_BY_ID } from '../config/story/secret_realms'
import { emptyBundle, resolveEffects, type EffectBundle } from './story'

/* ------------------------------------------------------------------ *
 * 查询
 * ------------------------------------------------------------------ */

export function realmById(id: string): SecretRealmDef | undefined {
  return SECRET_REALM_BY_ID[id]
}

export function nodeOf(realm: SecretRealmDef, id: string): RealmNode | undefined {
  return realm.nodes.find((n) => n.id === id)
}

/**
 * 当前可前往的节点 = 当前节点的后继中尚未访问者。
 * 合流节点只有一个前驱被走过即可进入，因此这里刻意只看向前一步，
 * 不要求「所有前驱都访问过」——否则分支后的汇合点永远不可达。
 */
export function availableNodes(realm: SecretRealmDef, run: RealmRun): RealmNode[] {
  const current = nodeOf(realm, run.currentNode)
  if (!current) return []
  const visited = new Set(run.visited)
  const out: RealmNode[] = []
  for (const id of current.to) {
    const next = nodeOf(realm, id)
    if (next && !visited.has(next.id)) out.push(next)
  }
  return out
}

/* ------------------------------------------------------------------ *
 * 运行时推进
 * ------------------------------------------------------------------ */

export interface RealmEnterResult {
  run: RealmRun
  node: RealmNode
}

export function enterRealm(realmId: string): RealmEnterResult | null {
  const realm = realmById(realmId)
  if (!realm) return null
  const start = nodeOf(realm, realm.startNode)
  if (!start) return null
  return {
    run: {
      realmId: realm.id,
      currentNode: start.id,
      visited: [start.id],
      cleared: [],
      active: true,
      spoils: { stone: 0, cultivation: 0, items: [] },
    },
    node: start,
  }
}

export interface RealmMoveResult {
  run: RealmRun
  node: RealmNode
  /** 该节点奖励结算后的变更（battle 类型节点由调用方先跑战斗再调用 resolveNode） */
  bundle?: EffectBundle
  /** 是否已到 Boss 终点 */
  finished: boolean
}

/** 移动到某个下游节点；会校验该节点确实可前往 */
export function moveTo(
  realm: SecretRealmDef,
  run: RealmRun,
  nodeId: string,
): RealmMoveResult | null {
  const allowed = availableNodes(realm, run).some((n) => n.id === nodeId)
  if (!allowed) return null
  const node = nodeOf(realm, nodeId)
  if (!node) return null
  return {
    run: {
      ...run,
      currentNode: node.id,
      visited: run.visited.includes(node.id) ? run.visited : [...run.visited, node.id],
      cleared: run.cleared.includes(node.id) ? run.cleared : [...run.cleared, node.id],
    },
    node,
    finished: node.kind === 'boss',
  }
}

function mergeSpoils(run: RealmRun, bundle: EffectBundle): RealmRun['spoils'] {
  const items = [...run.spoils.items]
  // 按件数重复入账（结算时每件 give_item 1 个，件数不失真）；
  // 丹药 id 以 pill_ 开头，届时会由 resolveEffects 自动归回丹药栏。
  for (const it of [...bundle.items, ...bundle.pills]) {
    for (let i = 0; i < it.count; i += 1) items.push(it.id)
  }
  return {
    stone: run.spoils.stone + bundle.stone,
    cultivation: run.spoils.cultivation + bundle.cultivation,
    items,
  }
}

/** 结算一个节点的奖励：折成 bundle，并累积到 run.spoils */
export function resolveNode(
  realm: SecretRealmDef,
  run: RealmRun,
  nodeId: string,
  save: GameSave,
): RealmMoveResult {
  const node = nodeOf(realm, nodeId)
  if (!node) {
    const fallback = nodeOf(realm, run.currentNode)
    if (!fallback) throw new Error(`realm ${realm.id} 缺少节点 ${nodeId}`)
    return { run, node: fallback, bundle: emptyBundle(), finished: false }
  }
  const bundle = resolveEffects(node.reward ?? [], save)
  return {
    run: { ...run, spoils: mergeSpoils(run, bundle) },
    node,
    bundle,
    finished: node.kind === 'boss',
  }
}

/**
 * 秘境整体通关结算：累积收益 + 首通奖励。
 * 幂等：调用方在写入首通后必须把 realm.id 加进 save.progress.clearedRealms，
 * 再次调用时便只结算 spoils、不再发放 firstClear。
 */
export function settleRealm(
  realm: SecretRealmDef,
  run: RealmRun,
  save: GameSave,
): EffectBundle {
  const effects: Effect[] = []
  if (run.spoils.stone > 0) effects.push({ type: 'give_stone', value: run.spoils.stone })
  if (run.spoils.cultivation > 0) {
    effects.push({ type: 'give_cultivation', value: run.spoils.cultivation })
  }
  for (const id of run.spoils.items) {
    effects.push({ type: 'give_item', key: id, count: 1 })
  }
  const firstClear = !save.progress.clearedRealms.includes(realm.id)
  if (firstClear) effects.push(...realm.firstClear)
  return resolveEffects(effects, save)
}

/* ------------------------------------------------------------------ *
 * 布局与路径
 * ------------------------------------------------------------------ */

export interface RealmLayoutPoint {
  nodeId: string
  x: number
  y: number
  depth: number
}

const X_MARGIN = 0.09
const Y_MARGIN = 0.05

/**
 * 竖屏纵向推进布局：depth（BFS 层级）映射到 y（自上而下），
 * 同层节点沿 x 均匀展开。同层排序取 nodes 数组中的定义顺序，
 * 因此同样输入必得同样坐标（布局稳定，便于动画与命中区域复用）。
 */
export function layoutRealm(realm: SecretRealmDef): RealmLayoutPoint[] {
  const depths = new Map<string, number>()
  const order = new Map<string, number>()
  realm.nodes.forEach((n, i) => order.set(n.id, i))

  const start = nodeOf(realm, realm.startNode)
  if (start) {
    depths.set(start.id, 0)
    const queue: string[] = [start.id]
    while (queue.length > 0) {
      const id = queue.shift() as string
      const d = depths.get(id) ?? 0
      const node = nodeOf(realm, id)
      if (!node) continue
      for (const next of node.to) {
        if (!nodeOf(realm, next)) continue
        const known = depths.get(next)
        if (known === undefined || known > d + 1) {
          depths.set(next, d + 1)
          queue.push(next)
        }
      }
    }
  }

  let maxDepth = 0
  for (const d of depths.values()) maxDepth = Math.max(maxDepth, d)
  // 不可达节点不参与纵向分层，统一压到最底层，避免出现空行
  const unreachableDepth = maxDepth + 1
  let hasUnreachable = false

  const rows = new Map<number, string[]>()
  for (const node of realm.nodes) {
    let d = depths.get(node.id)
    if (d === undefined) {
      d = unreachableDepth
      hasUnreachable = true
    }
    const row = rows.get(d)
    if (row) row.push(node.id)
    else rows.set(d, [node.id])
  }
  if (hasUnreachable) maxDepth = unreachableDepth

  const span = maxDepth === 0 ? 1 : maxDepth
  const points: RealmLayoutPoint[] = []
  for (const [depth, ids] of rows) {
    ids.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
    ids.forEach((nodeId, i) => {
      const x =
        ids.length === 1
          ? 0.5
          : X_MARGIN + ((1 - X_MARGIN * 2) * i) / (ids.length - 1)
      const y = Y_MARGIN + (1 - Y_MARGIN * 2) * (depth / span)
      points.push({ nodeId, x, y, depth })
    })
  }
  points.sort((a, b) => a.depth - b.depth || (order.get(a.nodeId) ?? 0) - (order.get(b.nodeId) ?? 0))
  return points
}

const MAX_ROUTES = 6

/** 从 startNode 到 target 的所有路径（DFS，最多 6 条，供 UI 高亮可选路线） */
export function routesTo(realm: SecretRealmDef, target: string): string[][] {
  const start = realm.startNode
  if (!nodeOf(realm, start) || !nodeOf(realm, target)) return []
  const routes: string[][] = []
  const path: string[] = []

  const walk = (id: string): void => {
    if (routes.length >= MAX_ROUTES) return
    path.push(id)
    if (id === target) {
      routes.push([...path])
      path.pop()
      return
    }
    const node = nodeOf(realm, id)
    const nexts = node ? node.to : []
    for (const next of nexts) {
      if (path.includes(next) || !nodeOf(realm, next)) continue
      walk(next)
      if (routes.length >= MAX_ROUTES) break
    }
    path.pop()
  }

  walk(start)
  return routes
}
