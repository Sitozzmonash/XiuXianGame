'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BottomTab, ModalKind, Screen } from '@/lib/navigation'
import type { TreasureDetail } from '@/lib/game/ui-tokens'
import { BottomNavigation } from './BottomNavigation'
import { LoginScreen } from './screens/LoginScreen'
import { MainScreen } from './screens/MainScreen'
import { BattleScreen, type BattleFinishView } from './screens/BattleScreen'
import { InventoryScreen } from './screens/InventoryScreen'
import { CharacterScreen } from './screens/CharacterScreen'
import { BuildScreen } from './screens/BuildScreen'
import { RealmScreen } from './screens/RealmScreen'
import { TechniqueScreen } from './screens/TechniqueScreen'
import { CaveScreen } from './screens/CaveScreen'
import { SectScreen } from './screens/SectScreen'
import { DungeonScreen } from './screens/DungeonScreen'
import { RankingScreen } from './screens/RankingScreen'
import { SecretRealmFlow } from './screens/SecretRealmFlow'
import { EquipmentModal } from './modals/EquipmentModal'
import { TreasureModal } from './modals/TreasureModal'
import { IdleModal } from './modals/IdleModal'
import { useGameStore } from '@/lib/game/state/store'
import { TREASURE_BY_ID } from '@/lib/game/config/treasures'
import { MATERIAL_BY_ID } from '@/lib/game/config/materials'
import { playSfx, setSfxEnabled, unlockAudio } from '@/lib/game/audio'
import { StoryFlow } from './overlays/StoryFlow'
import { SagaBook } from './overlays/SagaBook'
import { BreakthroughOverlay } from './overlays/BreakthroughOverlay'
import { OnboardingToast } from './OnboardingToast'

const SCREEN_TAB: Partial<Record<Screen, BottomTab>> = {
  cave: 'cave',
  inventory: 'inventory',
  realm: 'cultivate',
  techniques: 'alchemy',
  build: 'treasure',
}

const NAV_SCREENS: Screen[] = ['login', 'battle']

/** 突破解锁的 flag → 玩家能看懂的功能名 */
const UNLOCK_LABEL: Record<string, string> = {
  cave: '洞府',
  foundation: '筑基境界',
  realm: '秘境探索',
  alchemy: '炼丹',
  forge: '炼器',
  pet: '灵兽',
  sect: '宗门',
  tower: '通天塔',
  world_truth: '世界真相页',
}

interface BreakthroughView {
  fromLabel: string
  toLabel: string | null
  success: boolean
  bossName?: string | null
  consumedMaterials: { name: string; count: number }[]
  unlocked: string[]
  failMessage?: string
}

export function GameShell() {
  const [screen, setScreen] = useState<Screen>('login')
  const [modal, setModal] = useState<ModalKind>(null)
  const [treasure, setTreasure] = useState<TreasureDetail | null>(null)
  const [equipName, setEquipName] = useState<string | undefined>(undefined)

  const save = useGameStore((s) => s.save)
  const battle = useGameStore((s) => s.battle)
  const startBattle = useGameStore((s) => s.startBattle)
  const finishBattle = useGameStore((s) => s.finishBattle)

  const [sagaOpen, setSagaOpen] = useState(false)
  const [bt, setBt] = useState<BreakthroughView | null>(null)
  /** 正在游玩的秘境 id；非空时接管整个游戏区域 */
  const [realmId, setRealmId] = useState<string | null>(null)

  /** 突破：跑一次判定，把结果映射成演出需要的展示数据 */
  const handleBreakthrough = useCallback(() => {
    const g = useGameStore.getState()
    const check = g.canBreakthrough()
    if (!check.can) return
    const res = g.doBreakthrough()
    playSfx(res.outcome.success ? 'breakthrough' : 'defeat')
    setBt({
      fromLabel: res.outcome.fromLabel,
      toLabel: res.outcome.success ? res.outcome.toLabel : null,
      success: res.outcome.success,
      bossName: res.check.bossName,
      consumedMaterials: res.outcome.consumedMaterials.map((m) => ({
        name: MATERIAL_BY_ID[m.id]?.name ?? m.id,
        count: m.count,
      })),
      unlocked: res.outcome.unlocked.map((u) => UNLOCK_LABEL[u] ?? u),
      failMessage: res.outcome.success ? undefined : res.outcome.message,
    })
  }, [])

  /* 进入游戏后结算一次挂机收益 */
  useEffect(() => {
    const t = window.setTimeout(() => {
      useGameStore.getState().claimIdle()
    }, 400)
    return () => window.clearTimeout(t)
  }, [])

  /* 切后台再回前台时补算挂机收益 */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') useGameStore.getState().claimIdle()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  /* 浏览器禁止音频自动播放：首次用户交互时才解锁 AudioContext */
  useEffect(() => {
    const onFirst = () => unlockAudio()
    window.addEventListener('pointerdown', onFirst, { once: true })
    window.addEventListener('keydown', onFirst, { once: true })
    return () => {
      window.removeEventListener('pointerdown', onFirst)
      window.removeEventListener('keydown', onFirst)
    }
  }, [])

  /* 音效开关跟随存档设置 */
  useEffect(() => {
    setSfxEnabled(save.settings.sfx)
  }, [save.settings.sfx])

  /* 奇遇计时：不在战斗中时每秒递减冷却，冷却归零则抽一个奇遇入队 */
  useEffect(() => {
    if (screen === 'battle' || screen === 'login') return
    const id = window.setInterval(() => {
      const g = useGameStore.getState()
      if (g.save.story.pending.length >= 2) {
        g.tickEncounter(1)
        return
      }
      if (g.save.story.encounterCooldown > 0) {
        g.tickEncounter(1)
        return
      }
      g.rollEncounter()
    }, 1000)
    return () => window.clearInterval(id)
  }, [screen])

  const openTreasure = useCallback((t: TreasureDetail) => {
    setTreasure(t)
    setModal('treasure')
  }, [])

  /** 由法宝 defId 构造详情弹窗数据（战斗页点冷却环时用） */
  const openTreasureById = useCallback(
    (defId: string) => {
      const def = TREASURE_BY_ID[defId]
      if (!def) return
      const owned = useGameStore
        .getState()
        .save.combat.ownedTreasures.find((x) => x.defId === defId)
      openTreasure({
        id: def.id,
        name: def.name,
        level: owned?.level ?? 1,
        quality: def.quality,
        icon: def.icon,
        cooldown: def.cooldown,
        ready: 1,
        damage: '—',
        type: def.kind === 'passive' ? '被动' : '主动',
        desc: def.desc,
      })
    },
    [openTreasure],
  )

  const openEquipment = useCallback((name?: string) => {
    setEquipName(name)
    setModal('equipment')
  }, [])

  const closeModal = useCallback(() => setModal(null), [])

  const beginBattle = useCallback(() => {
    startBattle()
    setScreen('battle')
  }, [startBattle])

  const handleFinishBattle = useCallback(
    (win: boolean, failReason?: string): BattleFinishView => {
      const r = finishBattle(win, { failReason })
      return {
        win,
        drops: r.drops,
        stone: r.reward.stone,
        cultivation: r.reward.cultivation,
        failReason,
        storyPending: r.storyPending,
        realmBundle: r.realm?.reward,
      }
    },
    [finishBattle],
  )

  const showNav = !NAV_SCREENS.includes(screen) && realmId === null
  const activeTab = SCREEN_TAB[screen] ?? 'cave'

  const renderScreen = () => {
    switch (screen) {
      case 'login':
        return <LoginScreen onLogin={() => setScreen('home')} />
      case 'home':
        return (
          <MainScreen
            onNavigate={setScreen}
            onBattle={beginBattle}
            onOpenProfile={() => setScreen('character')}
            onOpenSettings={() => setModal('idle')}
            onAdd={() => setModal('idle')}
            onOpenSaga={() => setSagaOpen(true)}
          />
        )
      case 'battle':
        if (!battle) {
          return (
            <div className="flex h-full items-center justify-center bg-ink-950">
              <button
                type="button"
                onClick={() => setScreen('home')}
                className="font-serif text-sm text-cream-faint"
              >
                战斗已结束 · 点击返回
              </button>
            </div>
          )
        }
        return (
          <BattleScreen
            battle={battle}
            save={save}
            onFinishBattle={handleFinishBattle}
            onExit={() => setScreen('home')}
            onOpenTreasure={openTreasureById}
          />
        )
      case 'inventory':
        return (
          <InventoryScreen
            onBack={() => setScreen('home')}
            onSelectItem={(item) => openEquipment(item.name)}
          />
        )
      case 'character':
        return (
          <CharacterScreen
            onBack={() => setScreen('home')}
            onSelectSlot={(slot) => openEquipment(slot.item?.name)}
          />
        )
      case 'build':
        return <BuildScreen onBack={() => setScreen('home')} />
      case 'realm':
        return (
          <RealmScreen
            onBack={() => setScreen('home')}
            onBreakthrough={handleBreakthrough}
          />
        )
      case 'techniques':
        return <TechniqueScreen onBack={() => setScreen('home')} />
      case 'cave':
        return <CaveScreen onBack={() => setScreen('home')} />
      case 'sect':
        return <SectScreen onBack={() => setScreen('home')} />
      case 'dungeon':
        return (
          <DungeonScreen
            onBack={() => setScreen('home')}
            onEnter={() => {
              // DungeonScreen 内部已调 enterRealm，这里读最新存档取 id，
              // 避免拿到渲染时那一次的 stale 闭包值
              const id = useGameStore.getState().save.realmRun?.realmId
              if (id) setRealmId(id)
            }}
          />
        )
      case 'ranking':
        return <RankingScreen onBack={() => setScreen('home')} />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ink-950 sm:p-6">
      <div className="pt-safe px-safe relative h-[100dvh] w-full max-w-[430px] overflow-hidden bg-ink-950 sm:h-[880px] sm:max-h-[94vh] sm:rounded-[2rem] sm:ring-1 sm:ring-gold-300/20 sm:shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
        <div className="relative flex h-full min-h-0 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {realmId ? (
              <SecretRealmFlow realmId={realmId} onLeave={() => setRealmId(null)} />
            ) : (
              renderScreen()
            )}
          </div>
          {showNav && (
            <BottomNavigation active={activeTab} onNavigate={setScreen} />
          )}
        </div>

        <EquipmentModal
          open={modal === 'equipment'}
          onClose={closeModal}
          name={equipName}
        />
        <TreasureModal
          open={modal === 'treasure'}
          onClose={closeModal}
          treasure={treasure}
        />
        <IdleModal open={modal === 'idle'} onClose={closeModal} />
        <OnboardingToast enabled={screen !== 'battle' && screen !== 'login' && modal === null} />
        <SagaBook open={sagaOpen} onClose={() => setSagaOpen(false)} save={save} />
        <BreakthroughOverlay
          open={bt !== null}
          fromLabel={bt?.fromLabel ?? ''}
          toLabel={bt?.toLabel ?? null}
          success={bt?.success ?? false}
          bossName={bt?.bossName}
          consumedMaterials={bt?.consumedMaterials}
          unlocked={bt?.unlocked}
          failMessage={bt?.failMessage}
          onClose={() => setBt(null)}
        />
        <div className="pointer-events-none absolute inset-0 z-[70] [&>*]:pointer-events-auto">
          <StoryFlow
            enabled={screen !== 'battle' && screen !== 'login' && modal === null}
            onResolved={() => setModal(null)}
          />
        </div>
      </div>
    </div>
  )
}
