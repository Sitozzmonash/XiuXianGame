'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BottomTab, ModalKind, Screen } from '@/lib/navigation'
import type { Treasure } from '@/lib/game-data'
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
import { EquipmentModal } from './modals/EquipmentModal'
import { TreasureModal } from './modals/TreasureModal'
import { IdleModal } from './modals/IdleModal'
import { useGameStore } from '@/lib/game/state/store'
import { TREASURE_BY_ID } from '@/lib/game/config/treasures'
import { StoryFlow } from './overlays/StoryFlow'

const SCREEN_TAB: Partial<Record<Screen, BottomTab>> = {
  cave: 'cave',
  inventory: 'inventory',
  realm: 'cultivate',
  techniques: 'alchemy',
  build: 'treasure',
}

const NAV_SCREENS: Screen[] = ['login', 'battle']

export function GameShell() {
  const [screen, setScreen] = useState<Screen>('login')
  const [modal, setModal] = useState<ModalKind>(null)
  const [treasure, setTreasure] = useState<Treasure | null>(null)
  const [equipName, setEquipName] = useState<string | undefined>(undefined)

  const save = useGameStore((s) => s.save)
  const battle = useGameStore((s) => s.battle)
  const startBattle = useGameStore((s) => s.startBattle)
  const finishBattle = useGameStore((s) => s.finishBattle)

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

  const openTreasure = useCallback((t: Treasure) => {
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
        quality: def.quality as Treasure['quality'],
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

  const showNav = !NAV_SCREENS.includes(screen)
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
            onBreakthrough={() => setModal('idle')}
          />
        )
      case 'techniques':
        return <TechniqueScreen onBack={() => setScreen('home')} />
      case 'cave':
        return (
          <CaveScreen
            onBack={() => setScreen('home')}
            onSelectBuilding={() => setModal('idle')}
          />
        )
      case 'sect':
        return <SectScreen onBack={() => setScreen('home')} />
      case 'dungeon':
        return (
          <DungeonScreen
            onBack={() => setScreen('home')}
            onEnter={() => setScreen('battle')}
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
      <div className="relative h-[100dvh] w-full max-w-[430px] overflow-hidden bg-ink-950 sm:h-[880px] sm:max-h-[94vh] sm:rounded-[2rem] sm:ring-1 sm:ring-gold-300/20 sm:shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
        <div className="relative flex h-full flex-col">
          <div className="relative flex-1 overflow-hidden">{renderScreen()}</div>
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
