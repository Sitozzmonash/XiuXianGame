/* ------------------------------------------------------------------ *
 * 演示存档 —— 用于在状态层（lib/game/state）落地之前跑通全部 UI
 *
 * 这里只做「形状正确、数据来自真实配置」的初始存档：装备、法宝、功法、
 * 灵兽、地图关卡全部从 lib/game/config 读取，因此战斗数值是真实的。
 * 待乙方 createDefaultSave() 完成后，本文件可整体删除。
 * ------------------------------------------------------------------ */

import { EQUIP_SLOTS, type EquipSlotId, type GameSave } from '@/lib/game/types'
import { TECHNIQUE_BY_ID } from '@/lib/game/config/techniques'
import { TREASURE_BY_ID } from '@/lib/game/config/treasures'
import { PET_BY_ID } from '@/lib/game/config/pets'
import { FLAT_STAGES, flatStage } from '@/lib/game/config/realms'

const SAVE_VERSION = 3

/** 炼气阶段全部小阶段的 id，演示存档按 power 档位从中取值 */
const STAGE_IDS = FLAT_STAGES.filter((s) => s.realm.id === 'qi_refining').map((s) => s.stage.id)

/** 早期法宝：优先选冷却短的，让战斗画面在前几十关就能持续看到技能 */
const EARLY_ACTIVE = [
  'tr_qingxiao_sword',
  'tr_qingmu_gourd',
  'tr_chiyan_orb',
  'tr_jiuxiao_thunder',
  'tr_jingang_bell',
]
const EARLY_PASSIVE = ['tr_xuangui_shell', 'tr_tiangang_shield']
const EARLY_TECHNIQUES = ['tech_yujian_jue', 'tech_jianxin_jue', 'tech_qingfeng_jianyi']
const EARLY_PET = 'pet_qingling_fox'

/** 只保留配置里真实存在的 id，避免存档引用到不存在的条目 */
function existingActive(): string[] {
  return EARLY_ACTIVE.filter((id) => TREASURE_BY_ID[id]).slice(0, 5)
}

function existingPassive(): string[] {
  return EARLY_PASSIVE.filter((id) => TREASURE_BY_ID[id]).slice(0, 2)
}

function existingTechniques(): string[] {
  return EARLY_TECHNIQUES.filter((id) => TECHNIQUE_BY_ID[id])
}

export interface DemoSaveOptions extends Partial<GameSave> {
  /**
   * 演示用的进度档位（0~1）。0 = 刚出青石村，1 = 炼气圆满。
   * 只影响演示存档的强度，正式数值成长由状态层负责。
   */
  power?: number
}

export function createDemoSave(options: DemoSaveOptions = {}): GameSave {
  const { power = 0, ...overrides } = options
  const now = Date.now()
  const actives = existingActive()
  const passives = existingPassive()
  const techniques = existingTechniques()

  /* 按进度档位给出匹配的阶段、功法等级与法宝强化 */
  const stageIndex = Math.round(power * 18)
  const stageId = STAGE_IDS[Math.min(STAGE_IDS.length - 1, stageIndex)]
  const techLevel = 1 + Math.round(power * 9)
  const treasureLevel = 1 + Math.round(power * 60)
  const treasureTier = Math.round(power * 3)

  const ownedTreasures = [...actives, ...passives]
    .filter((id) => TREASURE_BY_ID[id])
    .map((defId, i) => ({
      uid: `tr_${i}_${defId}`,
      defId,
      level: treasureLevel,
      tier: treasureTier,
      equipped: true,
    }))

  const equipment: Partial<Record<EquipSlotId, GameSave['combat']['equipment'][EquipSlotId]>> = {}
  for (const slot of EQUIP_SLOTS) {
    equipment[slot] = undefined
  }

  const save: GameSave = {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,

    profile: {
      name: '凡尘散人',
      stageId,
      realmId: flatStage(stageId).realm.id,
      cultivation: 0,
      level: 1 + stageIndex,
      spiritRoot: {
        quality: 'dual',
        elements: { metal: 12, wood: 4 },
      },
      school: 'sword',
    },

    resources: {
      stone: 1200,
      immortalJade: 0,
      sectContribution: 0,
    },

    progress: {
      stage: 1,
      mapStage: 1,
      mapId: 'map_qingshi',
      maxStage: 0,
      stableStage: 1,
      mapProgress: {},
      clearedRealms: [],
    },

    combat: {
      equipment,
      activeTreasures: padTo(actives, 5),
      passiveTreasures: padTo(passives, 2),
      ownedTreasures,
      techniques: techniques.map((defId) => ({ defId, level: techLevel })),
      mainTechnique: techniques[0] ?? null,
      supportTechniques: padTo(techniques.slice(1), 3),
      pet: PET_BY_ID[EARLY_PET] ? EARLY_PET : null,
      loadoutB: null,
    },

    inventory: {
      items: [],
      materials: {},
      pills: {},
      capacity: 200,
    },

    story: {
      flags: {},
      seenNodes: [],
      pending: [],
      encounterCooldown: 0,
      encounterHistory: [],
      chapterStage: 1,
    },

    npcs: {},

    karma: {
      daoHeart: 0,
      demonThought: 0,
      immortalErosion: 0,
      jadeResonance: 0,
      taixuAttention: 0,
      qingxuanFame: 0,
      yaozuFame: 0,
      youmingFame: 0,
      jadeShards: 0,
    },

    realmRun: null,

    idle: {
      lastClaim: now,
    },

    stats: {
      kills: 0,
      elites: 0,
      bosses: 0,
      deaths: 0,
      encountersDone: 0,
      treasuresOwned: ownedTreasures.length,
      playTime: 0,
    },

    log: [],

    settings: {
      auto: true,
      speed: 1,
      sfx: true,
      quality: 'high',
    },
  }

  return { ...save, ...overrides }
}

function padTo<T>(list: T[], length: number): (T | null)[] {
  const out: (T | null)[] = list.slice(0, length)
  while (out.length < length) out.push(null)
  return out
}
