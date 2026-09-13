'use client'

import { useCallback, useRef, useState } from 'react'
import type { BottomTab, ModalKind, Screen } from '@/lib/navigation'
import type { Treasure } from '@/lib/game-data'
import type { GameSave } from '@/lib/game/types'
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
import { createDemoSave } from './demoSave'

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
  const [stage, setStage] = useState(1)

  /* 存档快照：状态层（lib/game/state）落地前先用演示存档。
     战斗期间使用冻结快照，避免战斗过程中的存档变化打断战斗。 */
  const [save, setSave] = useState<GameSave>(() => createDemoSave())
  const [battleSave, setBattleSave] = useState<GameSave>(() =>
    createDemoSave(),
  )
  const [battleRun, setBattleRun] = useState(0)
  const saveRef = useRef(save)
  saveRef.current = save

  const openTreasure = useCallback((t: Treasure) => {
    setTreasure(t)
    setModal('treasure')
  }, [])

  const openEquipment = useCallback((name?: string) => {
    setEquipName(name)
    setModal('equipment')
  }, [])

  const closeModal = useCallback(() => setModal(null), [])

  /** 以当前存档与关卡开一场新战斗 */
  const beginBattle = useCallback(() => {
    const snapshot: GameSave = {
      ...saveRef.current,
      progress: {
        ...saveRef.current.progress,
        stage,
        mapStage: ((stage - 1) % 50) + 1,
      },
    }
    setBattleSave(snapshot)
    setBattleRun((v) => v + 1)
    setScreen('battle')
  }, [stage])

  /** 胜利：结算掉落与进度，停在结算画面等玩家选择 */
  const handleBattleWin = useCallback(
    ({ damage }: { drops: unknown[]; damage: number; dps: number }) => {
      setSave((prev) => {
        const nextStage = prev.progress.stage + 1
        return {
          ...prev,
          updatedAt: Date.now(),
          progress: {
            ...prev.progress,
            stage: nextStage,
            mapStage: ((nextStage - 1) % 50) + 1,
            maxStage: Math.max(prev.progress.maxStage, prev.progress.stage),
            stableStage: Math.max(prev.progress.stableStage, prev.progress.stage - 3),
          },
          stats: {
            ...prev.stats,
            kills: prev.stats.kills + 1,
            playTime: prev.stats.playTime + Math.round(damage / 1000),
          },
        }
      })
    },
    [],
  )

  const handleBattleLose = useCallback(({ failReason }: { failReason?: string }) => {
    setSave((prev) => ({ ...prev, stats: { ...prev.stats, deaths: prev.stats.deaths + 1 } }))
    if (failReason) {
      setSave((prev) => ({
        ...prev,
        log: [
          {
            id: `lose_${Date.now()}`,
            time: Date.now(),
            text: failReason,
            kind: 'battle' as const,
          },
          ...prev.log.slice(0, 49),
        ],
      }))
    }
  }, [])

  /** 继续推关：推进关卡并重开一场战斗 */
  const handleNextStage = useCallback(() => {
    setStage((v) => {
      const next = v + 1
      setBattleSave({
        ...saveRef.current,
        progress: { ...saveRef.current.progress, stage: next, mapStage: ((next - 1) % 50) + 1 },
      })
      return next
    })
    setBattleRun((v) => v + 1)
  }, [])

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
        return (
          <BattleScreen
            key={battleRun}
            save={battleSave}
            stage={stage}
            onBack={() => setScreen('home')}
            onBattleWin={handleBattleWin}
            onBattleLose={handleBattleLose}
            onNextStage={handleNextStage}
            onOpenTreasure={openTreasure}
            onExit={() => setScreen('home')}
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
