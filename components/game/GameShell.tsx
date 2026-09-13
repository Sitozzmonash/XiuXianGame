'use client'

import { useCallback, useState } from 'react'
import type { BottomTab, ModalKind, Screen } from '@/lib/navigation'
import type { Treasure } from '@/lib/game-data'
import { BottomNavigation } from './BottomNavigation'
import { LoginScreen } from './screens/LoginScreen'
import { MainScreen } from './screens/MainScreen'
import { BattleScreen } from './screens/BattleScreen'
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
import { BossFailModal } from './modals/BossFailModal'

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

  const openTreasure = useCallback((t: Treasure) => {
    setTreasure(t)
    setModal('treasure')
  }, [])

  const openEquipment = useCallback((name?: string) => {
    setEquipName(name)
    setModal('equipment')
  }, [])

  const closeModal = useCallback(() => setModal(null), [])

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
            onBattle={() => setScreen('battle')}
            onOpenProfile={() => setScreen('character')}
            onOpenSettings={() => setModal('idle')}
            onAdd={() => setModal('idle')}
          />
        )
      case 'battle':
        return (
          <BattleScreen
            onBack={() => setScreen('home')}
            onOpenTreasure={openTreasure}
            onOpenIdle={() => setModal('idle')}
            onOpenBossFail={() => setModal('bossFail')}
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
        <BossFailModal
          open={modal === 'bossFail'}
          onClose={closeModal}
          onRetry={() => setModal(null)}
        />
      </div>
    </div>
  )
}
