/* ------------------------------------------------------------------ *
 * 新档工厂与存档迁移 —— 存档的唯一初始来源
 * store、挂机结算、校验脚本共用 createNewSave()，禁止在别处手搓存档。
 * ------------------------------------------------------------------ */

import { NPCS } from '../config/story'
import { rollEquipment } from '../config/equipment'
import { KARMA_LABEL, type GameSave, type KarmaKey, type SpiritRoot } from '../types'

export const SAVE_VERSION = 1
export const STORAGE_KEY = 'fanchen-wendao-save'

function rollSpiritRoot(rng: () => number): SpiritRoot {
  const pool = ['metal', 'wood', 'water', 'fire', 'earth'] as const
  const primary = pool[Math.floor(rng() * pool.length)]
  const rest = pool.filter((e) => e !== primary)
  const secondary = rest[Math.floor(rng() * rest.length)]
  const extra = rest.filter((e) => e !== secondary)
  const third = extra[Math.floor(rng() * extra.length)]
  const roll = rng()
  if (roll < 0.25) {
    return { quality: 'single', elements: { [primary]: 1 } }
  }
  if (roll < 0.7) {
    return { quality: 'dual', elements: { [primary]: 1, [secondary]: 0.55 } }
  }
  return { quality: 'triple', elements: { [primary]: 1, [secondary]: 0.5, [third]: 0.35 } }
}

export function createNewSave(now = Date.now(), rng: () => number = Math.random): GameSave {
  const karma = Object.fromEntries(
    (Object.keys(KARMA_LABEL) as KarmaKey[]).map((k) => [k, 0]),
  ) as Record<KarmaKey, number>

  const npcs = Object.fromEntries(
    NPCS.map((n) => [n.id, { relation: n.initialRelation, state: 'initial', alive: true, lastSeen: 0 }]),
  )

  const starterWeapon = rollEquipment({ stage: 1, quality: 'white', slot: 'weapon', rng })

  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: {
      name: '无名散修',
      stageId: 'qi_1',
      realmId: 'qi_refining',
      cultivation: 0,
      level: 1,
      spiritRoot: rollSpiritRoot(rng),
      school: 'sword',
    },
    resources: {
      stone: 100,
      immortalJade: 0,
      sectContribution: 0,
    },
    progress: {
      stage: 1,
      mapStage: 1,
      mapId: 'map_qingshi',
      maxStage: 0,
      stableStage: 1,
      mapProgress: { map_qingshi: 1 },
      clearedRealms: [],
    },
    combat: {
      equipment: { weapon: starterWeapon },
      activeTreasures: [null, null, null, null, null],
      passiveTreasures: [null, null],
      ownedTreasures: [],
      techniques: [],
      mainTechnique: null,
      supportTechniques: [null, null, null],
      pet: null,
      loadoutB: null,
    },
    inventory: {
      items: [],
      materials: {},
      pills: {},
      capacity: 200,
      autoSalvageBelow: 'off',
      pity: { sinceBlue: 0, sincePurple: 0 },
    },
    story: {
      flags: {},
      seenNodes: [],
      pending: [],
      encounterCooldown: 0,
      encounterHistory: [],
      chapterStage: 1,
    },
    npcs,
    karma,
    realmRun: null,
    idle: { lastClaim: now },
    stats: {
      kills: 0,
      elites: 0,
      bosses: 0,
      deaths: 0,
      encountersDone: 0,
      treasuresOwned: 1,
      playTime: 0,
    },
    log: [
      {
        id: `log_${now.toString(36)}`,
        time: now,
        text: '你背着一柄旧铁剑，走进了青石村。',
        kind: 'story',
      },
    ],
    settings: {
      auto: true,
      speed: 1,
      sfx: true,
      quality: 'mid',
    },
  }
}

/** 深合并：用新档默认值补齐缺失字段，用于版本升级与导入旧档 */
function deepFill<T>(base: T, patch: unknown): T {
  if (patch === null || patch === undefined) return base
  if (Array.isArray(base)) return (Array.isArray(patch) ? patch : base) as T
  if (typeof base !== 'object') return patch as T
  if (typeof patch !== 'object' || Array.isArray(patch)) return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k]
    out[k] = b === undefined ? v : deepFill(b, v)
  }
  return out as T
}

/**
 * 迁移：把任意历史版本的存档补全到当前版本。
 * 缺字段用新档默认值兜底，多余的旧字段原样保留（不删除玩家数据）。
 */
export function migrateSave(raw: unknown, now = Date.now()): GameSave {
  const fresh = createNewSave(now)
  const merged = deepFill(fresh, raw)
  merged.version = SAVE_VERSION
  merged.updatedAt = now
  return merged
}
