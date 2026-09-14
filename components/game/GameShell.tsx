'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BottomTab, ModalKind, Screen } from '@/lib/navigation'
import type { TreasureDetail } from '@/lib/game/ui-tokens'
import type { LiveBattle } from '@/lib/game/engine/battle'
import { BottomNavigation } from './BottomNavigation'
import { LoginScreen } from './screens/LoginScreen'
import { MainScreen } from './screens/MainScreen'
import { BattleScreen, type BattleFinishView } from './screens/BattleScreen'
import { InventoryScreen } from './screens/InventoryScreen'
import { CharacterScreen } from './screens/CharacterScreen'
import { BuildScreen } from './screens/BuildScreen'
import { RealmScreen } from './screens/RealmScreen'
import { TechniqueScreen } from './screens/TechniqueScreen'
import { AlchemyScreen } from './screens/AlchemyScreen'
import { TreasureScreen } from './screens/TreasureScreen'
import { CaveScreen } from './screens/CaveScreen'
import { SectScreen } from './screens/SectScreen'
import { DungeonScreen } from './screens/DungeonScreen'
import { RankingScreen } from './screens/RankingScreen'
import { WelfareScreen } from './screens/WelfareScreen'
import { MapScreen } from './screens/MapScreen'
import { MarketScreen } from './screens/MarketScreen'
import { MallScreen } from './screens/MallScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SecretRealmFlow } from './screens/SecretRealmFlow'
import { EquipmentModal } from './modals/EquipmentModal'
import { TreasureModal } from './modals/TreasureModal'
import { GainModal } from './modals/GainModal'
import { useGameStore } from '@/lib/game/state/store'
import { TREASURE_BY_ID } from '@/lib/game/config/treasures'
import { MATERIAL_BY_ID } from '@/lib/game/config/materials'
import { playSfx, setSfxEnabled, unlockAudio } from '@/lib/game/audio'
import { StoryFlow } from './overlays/StoryFlow'
import { SagaBook } from './overlays/SagaBook'
import { BreakthroughOverlay } from './overlays/BreakthroughOverlay'
import { OnboardingToast } from './OnboardingToast'
import { CloudSyncBadge } from './CloudSyncBadge'
import { bootstrapCloud, useCloudStore } from '@/lib/game/api/cloud'
import { trackEvent } from '@/lib/game/api/analytics'

const SCREEN_TAB: Partial<Record<Screen, BottomTab>> = {
  cave: 'cave',
  inventory: 'inventory',
  realm: 'cultivate',
  alchemy: 'alchemy',
  treasures: 'treasure',
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

  const authed = useCloudStore((s) => s.authed)

  /**
   * 结算后 store 会把 battle 置空，但此时战斗页还要展示结算弹窗。
   * 因此本地留一份战斗实例引用，直到玩家真正离开战斗页才释放。
   */
  const [heldBattle, setHeldBattle] = useState<LiveBattle | null>(null)
  const activeBattle = battle ?? heldBattle

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
    trackEvent('realm_breakthrough', {
      from: res.outcome.fromLabel,
      to: res.outcome.success ? res.outcome.toLabel : null,
      success: res.outcome.success,
    })
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

  /* 启动：确认身份（游客 / 账号 / 未登录） */
  useEffect(() => {
    void bootstrapCloud()
  }, [])

  /* 身份就绪后离开登录页；登出（authed 变 false）时回到登录页 */
  useEffect(() => {
    if (authed === true) setScreen((s) => (s === 'login' ? 'home' : s))
    else if (authed === false) setScreen('login')
  }, [authed])

  /* 进入游戏后结算一次挂机收益 */
  useEffect(() => {
    if (authed !== true) return
    const t = window.setTimeout(() => {
      const res = useGameStore.getState().claimIdle()
      if (res.stone > 0 || res.cultivation > 0) {
        trackEvent('idle_claim', {
          stone: res.stone,
          cultivation: res.cultivation,
          duration: res.duration,
          capped: res.capped,
        })
        if (res.duration >= 300) {
          trackEvent('offline_duration', { duration: res.duration, capped: res.capped })
        }
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [authed])

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

  /* 切后台时记录最后停留页面（PRD 49） */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        trackEvent('last_page_before_leave', { screen })
      }
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => document.removeEventListener('visibilitychange', onHidden)
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
    const g = useGameStore.getState()
    setHeldBattle(g.battle)
    trackEvent('stage_start', { stage: g.battleStage, kind: g.battleKind })
    setScreen('battle')
  }, [startBattle])

  const exitBattle = useCallback(() => {
    setHeldBattle(null)
    setScreen('home')
  }, [])

  const handleFinishBattle = useCallback(
    (win: boolean, failReason?: string): BattleFinishView => {
      const g = useGameStore.getState()
      const stage = g.battleStage
      trackEvent('stage_end', { stage, win, kind: g.battleKind })
      if (!win && g.battleKind === 'stage' && stage % 50 === 0) {
        trackEvent('boss_fail', { stage, reason: failReason ?? null })
      }
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

  const showNav = authed === true && !NAV_SCREENS.includes(screen) && realmId === null
  const activeTab = SCREEN_TAB[screen] ?? 'cave'

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return (
          <MainScreen
            onNavigate={setScreen}
            onBattle={beginBattle}
            onOpenProfile={() => setScreen('character')}
            onOpenSettings={() => setScreen('settings')}
            onAdd={(kind) => setModal(kind === 'stone' ? 'gainStone' : 'gainCultivation')}
            onOpenSaga={() => setSagaOpen(true)}
          />
        )
      case 'battle':
        if (!activeBattle) {
          return (
            <div className="flex h-full items-center justify-center bg-ink-950">
              <button
                type="button"
                onClick={exitBattle}
                className="font-serif text-sm text-cream-faint"
              >
                战斗已结束 · 点击返回
              </button>
            </div>
          )
        }
        return (
          <BattleScreen
            battle={activeBattle}
            save={save}
            onFinishBattle={handleFinishBattle}
            onExit={exitBattle}
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
            onOpenBuild={() => setScreen('build')}
            onOpenMall={() => setScreen('mall')}
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
      case 'alchemy':
        return <AlchemyScreen onBack={() => setScreen('home')} />
      case 'treasures':
        return (
          <TreasureScreen onBack={() => setScreen('home')} onOpenBuild={() => setScreen('build')} />
        )
      case 'cave':
        return <CaveScreen onBack={() => setScreen('home')} />
      case 'sect':
        return <SectScreen onBack={() => setScreen('home')} />
      case 'welfare':
        return <WelfareScreen onBack={() => setScreen('home')} />
      case 'map':
        return <MapScreen onBack={() => setScreen('home')} />
      case 'market':
        return <MarketScreen onBack={() => setScreen('home')} />
      case 'mall':
        return <MallScreen onBack={() => setScreen('home')} />
      case 'settings':
        return <SettingsScreen onBack={() => setScreen('home')} />
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
            ) : authed === true ? (
              renderScreen()
            ) : authed === false ? (
              <LoginScreen onLogin={() => setScreen('home')} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-ink-950">
                <span className="animate-pulse font-serif text-2xl tracking-[0.3em] text-gold-300/80">
                  修仙诀
                </span>
                <span className="font-serif text-[10px] tracking-[0.3em] text-cream-faint">正在入山…</span>
              </div>
            )}
          </div>
          {showNav && (
            <BottomNavigation active={activeTab} onNavigate={setScreen} />
          )}
          {authed === true && screen !== 'battle' && realmId === null && <CloudSyncBadge />}
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
        <GainModal
          open={modal === 'gainStone' || modal === 'gainCultivation'}
          kind={modal === 'gainStone' ? 'stone' : modal === 'gainCultivation' ? 'cultivation' : null}
          onClose={closeModal}
          onNavigate={setScreen}
        />
        <OnboardingToast
          enabled={authed === true && screen !== 'battle' && modal === null}
        />
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
            enabled={authed === true && screen !== 'battle' && modal === null}
            onResolved={() => setModal(null)}
          />
        </div>
      </div>
    </div>
  )
}
