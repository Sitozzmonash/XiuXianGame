/* ------------------------------------------------------------------ *
 * ⚠️ 占位骨架 —— 由乙方（逻辑/数据）替换为完整实现
 *
 * 本文件当前只提供一个可运行的最小地图，目的是让 config/index.ts 的
 * 导出完整、引擎与 UI 能编译与调试。正式版本需要：
 *   · 4 张地图 × 50 关 = 200 关（青石村 / 黑风岭 / 云泽坊市 / 落霞山脉）
 *   · 24~30 个怪物（含每张图 3 普通 + 2 精英 + 1~2 Boss）
 *   · Boss 携带 2~3 个不同组合的 bossMechanics
 *   · 在指定关卡挂上 storyId 与 realmId（清单见 分工说明.md 的 B1）
 * 替换时请保持本文件导出的所有符号名称与签名不变，UI 与引擎直接依赖它们。
 * ------------------------------------------------------------------ */

import type { MapDef, MapStage, MonsterDef, MapStage as Stage } from '../types'

export const COMMON_STAGES_PER_MAP = 50

export const MONSTERS: MonsterDef[] = [
  {
    id: 'mob_placeholder_wolf',
    name: '山狼',
    kind: 'normal',
    icon: 'wolf',
    element: 'physical',
    hpMul: 1,
    atkMul: 1,
    defMul: 1,
    aspd: 1,
  },
  {
    id: 'mob_placeholder_elite',
    name: '血目猿',
    kind: 'elite',
    icon: 'ape',
    element: 'physical',
    hpMul: 2.6,
    atkMul: 1.6,
    defMul: 1.4,
    aspd: 1.1,
    bossMechanics: ['enrage'],
  },
  {
    id: 'boss_placeholder_shanjun',
    name: '血眼山君',
    kind: 'boss',
    icon: 'beast',
    element: 'fire',
    hpMul: 9,
    atkMul: 2.2,
    defMul: 1.8,
    aspd: 0.95,
    bossMechanics: ['summon', 'enrage'],
    skills: [
      { name: '血目凝视', cast: 'aoe', scale: 1.6, cooldown: 9, damageType: 'fire' },
      { name: '召唤妖兽', cast: 'summon', scale: 0, cooldown: 14, damageType: 'soul' },
    ],
  },
]

function buildPlaceholderStages(): MapStage[] {
  const stages: MapStage[] = []
  for (let i = 1; i <= COMMON_STAGES_PER_MAP; i++) {
    const isBoss = i === COMMON_STAGES_PER_MAP
    const isElite = i % 10 === 5
    stages.push({
      index: i,
      name: isBoss ? '山君巢穴' : isElite ? `险地·第 ${i} 关` : `山径·第 ${i} 关`,
      kind: isBoss ? 'boss' : isElite ? 'elite' : 'normal',
      monsterId: isBoss
        ? 'boss_placeholder_shanjun'
        : isElite
          ? 'mob_placeholder_elite'
          : 'mob_placeholder_wolf',
    })
  }
  return stages
}

export const MAPS: MapDef[] = [
  {
    id: 'map_qingshi',
    chapter: 1,
    name: '青石村',
    poem: '云深不知处，妖风起黑岭。',
    bg: '/images/bg-ink-mountains.png',
    base: { hp: 900, atk: 60, def: 20 },
    growth: { hp: 1.055, atk: 1.045, def: 1.04 },
    monsters: ['mob_placeholder_wolf'],
    elites: ['mob_placeholder_elite'],
    bosses: ['boss_placeholder_shanjun'],
    stages: buildPlaceholderStages(),
    unlockRealm: 'qi_refining',
  },
]

export const MAP_BY_ID: Record<string, MapDef> = Object.fromEntries(MAPS.map((m) => [m.id, m]))

export const MONSTER_BY_ID: Record<string, MonsterDef> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m]),
)

export const STAGES_PER_MAP = COMMON_STAGES_PER_MAP

export function stageNumberToGlobal(mapId: string, mapStage: number): number {
  let offset = 0
  for (const map of MAPS) {
    if (map.id === mapId) return offset + mapStage
    offset += map.stages.length
  }
  return Math.max(1, mapStage)
}

export function globalToMap(globalStage: number): { mapId: string; mapStage: number; map: MapDef } {
  let remaining = Math.max(1, Math.floor(globalStage))
  for (const map of MAPS) {
    if (remaining <= map.stages.length) {
      return { mapId: map.id, mapStage: remaining, map }
    }
    remaining -= map.stages.length
  }
  const last = MAPS[MAPS.length - 1]
  return { mapId: last.id, mapStage: last.stages.length, map: last }
}

export function getStage(globalStage: number): { map: MapDef; stage: Stage; monster: MonsterDef | null } {
  const { map, mapStage } = globalToMap(globalStage)
  const stage = map.stages[Math.min(map.stages.length, Math.max(1, mapStage)) - 1] ?? map.stages[0]
  const monster = stage.monsterId ? (MONSTER_BY_ID[stage.monsterId] ?? null) : null
  return { map, stage, monster }
}

export function monsterStats(globalStage: number): {
  hp: number
  atk: number
  def: number
  aspd: number
  crit: number
  critDmg: number
} {
  const { map, stage, monster } = getStage(globalStage)
  const m = monster
  const n = Math.max(0, stage.index - 1)
  const kindMul = m?.kind === 'boss' ? 2.5 : m?.kind === 'elite' ? 1.6 : 1
  const decadeMul = stage.index % 10 === 0 && stage.index !== map.stages.length ? 1.35 : 1
  const hp = map.base.hp * map.growth.hp ** n * (m?.hpMul ?? 1) * kindMul * decadeMul
  const atk = map.base.atk * map.growth.atk ** n * (m?.atkMul ?? 1) * (m?.kind === 'boss' ? 1.35 : 1)
  const def = map.base.def * map.growth.def ** n * (m?.defMul ?? 1)
  return {
    hp: Math.max(1, Math.round(hp)),
    atk: Math.max(1, Math.round(atk)),
    def: Math.max(0, Math.round(def)),
    aspd: m?.aspd ?? 1,
    crit: m?.kind === 'boss' ? 0.12 : m?.kind === 'elite' ? 0.1 : 0.05,
    critDmg: 1.6,
  }
}
