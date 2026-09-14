'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FastForward, Home, LogOut, Pause, Play, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TREASURE_BY_ID } from '@/lib/game/config/treasures'
import { PET_BY_ID } from '@/lib/game/config/pets'
import { qualityRank } from '@/lib/game/ui-tokens'
import { monsterArt } from '@/lib/game/ui-art'
import { useGameStore } from '@/lib/game/state/store'
import { playBattleEventSfx, playSfx } from '@/lib/game/audio'
import { stageView } from '@/lib/game/state/selectors'
import { formatNumber } from '@/lib/game/utils'
import type { GameSave, Quality } from '@/lib/game/types'
import type { LiveBattle } from '@/lib/game/engine/battle'
import { GameHeader } from '../GameHeader'
import { BattleCanvas } from '../battle/BattleCanvas'
import { BattleHud, type HudTreasure } from '../battle/BattleHud'
import { BattleResultOverlay, type BattleDropView } from '../battle/BattleResultOverlay'
import { StageTransition } from '../battle/StageTransition'
import { useBattleDriver, type BattleResultInfo } from '../battle/useBattleDriver'
import { InkButton } from '../primitives'
import type { EffectBundle } from '@/lib/game/engine/story'
import type { Drop } from '@/lib/game/types'

/* ------------------------------------------------------------------ *
 * 战斗页 —— 编排：过场 → 实时战斗 → 结算
 * 战斗实例由 store.startBattle 提供，结算走 store.finishBattle
 * ------------------------------------------------------------------ */

export interface BattleScreenProps {
  /** store 创建的战斗实例 */
  battle: LiveBattle
  /** 存档快照，用于展示法宝 / 灵兽 / 画质设置 */
  save: GameSave
  /** 战斗结束后由 store 结算，返回掉落等结果 */
  onFinishBattle: (win: boolean, failReason?: string) => BattleFinishView
  /** 结算完成后离开战斗页 */
  onExit: () => void
  /** 点开某个法宝查看详情 */
  onOpenTreasure: (defId: string) => void
}

export interface BattleFinishView {
  win: boolean
  drops: Drop[]
  stone: number
  cultivation: number
  failReason?: string
  storyPending: string[]
  /** 秘境节点奖励 */
  realmBundle?: EffectBundle
}

/** 战斗时长上限：超时判负，避免拉锯战无限僵持 */
const TIME_LIMIT = 90

export function BattleScreen({
  battle,
  save,
  onFinishBattle,
  onExit,
  onOpenTreasure,
}: BattleScreenProps) {
  const [auto, setAuto] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [transition, setTransition] = useState(true)
  const [finish, setFinish] = useState<BattleFinishView | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 390, height: 640 })

  const view = useMemo(() => {
    try {
      return stageView(save, battle.state ? save.progress.stage : save.progress.stage)
    } catch {
      return null
    }
  }, [save])

  const handleFinish = useCallback(
    (info: BattleResultInfo) => {
      const result = onFinishBattle(info.win, info.failReason)
      setFinish({ ...result, failReason: info.failReason })
      // 结算前的掉落音：红/彩品质单独给音，这是玩家最想听到的反馈之一
      if (info.win) {
        const best = bestQuality(result.drops)
        if (best === 'red' || best === 'rainbow') playSfx('dropRed')
        else if (best === 'orange') playSfx('dropHigh')
      }
    },
    [onFinishBattle],
  )

  const driver = useBattleDriver({
    battle,
    auto: auto && !transition && !finish,
    speed,
    onFinish: handleFinish,
  })

  /* 战斗音效：driver.events 是累积列表，用游标只消费新增部分 */
  const sfxCursor = useRef(0)
  useEffect(() => {
    const list = driver.events
    if (list.length < sfxCursor.current) sfxCursor.current = 0
    for (let i = sfxCursor.current; i < list.length; i++) {
      const ev = list[i]
      playBattleEventSfx({
        type: ev.type,
        damageType: ev.damageType ?? null,
        crit: ev.crit,
        fx: ev.fx ?? null,
        quality: ev.type === 'drop' ? ((ev.icon as Quality | undefined) ?? null) : null,
      })
    }
    sfxCursor.current = list.length
  }, [driver.events])

  /* 容器尺寸自适应：Canvas 由父层给尺寸，内部按 DPR 适配 */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (!box) return
      setSize({ width: Math.round(box.width), height: Math.round(box.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const treasures = useMemo<HudTreasure[]>(() => {
    const out: HudTreasure[] = []
    save.combat.activeTreasures.forEach((id, slotIndex) => {
      if (!id) return
      const def = TREASURE_BY_ID[id]
      if (!def) return
      out.push({
        id: `${id}#${slotIndex}`,
        name: def.name,
        icon: def.icon,
        cooldown: def.cooldown,
        remaining: driver.state?.skillCds[slotIndex] ?? 0,
        quality: def.quality as Quality,
      })
    })
    return out
  }, [save.combat.activeTreasures, driver.state?.skillCds])

  const passives = useMemo(() => {
    const out: { id: string; name: string; icon: string }[] = []
    for (const id of save.combat.passiveTreasures) {
      if (!id) continue
      const def = TREASURE_BY_ID[id]
      if (def) out.push({ id: def.id, name: def.name, icon: def.icon })
    }
    return out
  }, [save.combat.passiveTreasures])

  const pet = useMemo(() => {
    if (!save.combat.pet) return null
    const def = PET_BY_ID[save.combat.pet]
    if (!def) return null
    return {
      name: def.name,
      icon: def.icon,
      hp: driver.state?.petHp ?? 0,
      maxHp: driver.state?.petMaxHp ?? 0,
      ready: true,
    }
  }, [save.combat.pet, driver.state?.petHp, driver.state?.petMaxHp])

  const enemyView = useMemo(
    () => ({
      name: driver.state ? battle.enemy.name : (view?.monsterName ?? '未知妖物'),
      image: portraitForMonster(battle.enemy.def.id, battle.enemy.def.icon),
      icon: battle.enemy.def.icon,
      isBoss: battle.enemy.def.kind === 'boss',
    }),
    [battle, driver.state, view],
  )

  const timeLeft = driver.state ? Math.max(0, TIME_LIMIT - driver.state.time) : TIME_LIMIT
  const overlayOpen = !transition && finish !== null

  const handleContinue = useCallback(() => {
    setFinish(null)
    onExit()
  }, [onExit])

  const handleRetry = useCallback(() => {
    // 重新挑战：由外部重开战斗实例（onExit 回主界面后再次进入）
    setFinish(null)
    setTransition(true)
    onExit()
  }, [onExit])

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-ink-950">
      <StageTransition
        open={transition}
        chapter={view ? `第${chapterLabel(view.chapter)}章 · ${view.mapName}` : '青石村'}
        stageName={view?.stageName ?? '未知之地'}
        kind={view?.isBoss ? 'boss' : view?.kind === 'elite' ? 'elite' : view?.kind === 'event' ? 'event' : 'normal'}
        index={`${view?.mapStage ?? 1} / 50`}
        onDone={() => setTransition(false)}
      />

      <div className="absolute inset-x-0 top-0 z-30">
        <GameHeader onOpenProfile={onExit} />
      </div>

      {/* 战场 */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <BattleCanvas
          events={driver.events}
          state={driver.state}
          enemy={enemyView}
          player={{
            name: save.profile.name || '无名散修',
            image: '/images/player-swordsman.png',
          }}
          width={size.width}
          height={size.height}
          quality={save.settings.quality}
          finished={driver.settling}
          onTap={driver.skip}
        />

        <BattleHud
          state={driver.state}
          enemy={{ name: enemyView.name, icon: enemyView.icon, isBoss: enemyView.isBoss }}
          player={{ name: save.profile.name || '无名散修' }}
          treasures={treasures}
          passives={passives}
          pet={pet}
          timeLeft={timeLeft}
          onTreasureTap={(t) => onOpenTreasure(t.id.split('#')[0])}
        />
      </div>

      {/* 控制区 */}
      <div className="relative z-30 flex flex-col gap-2 border-t border-gold-300/12 bg-ink-950/95 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAuto((v) => !v)}
              aria-pressed={auto}
              className={cn(
                'flex items-center gap-1 rounded-full border px-2.5 py-1 font-serif text-[11px] transition-colors',
                auto
                  ? 'border-jade-500/60 bg-jade-500/15 text-jade-300'
                  : 'border-gold-300/25 bg-ink-950/70 text-cream-faint',
              )}
            >
              {auto ? <Pause className="size-3" /> : <Play className="size-3" />}
              {auto ? '自动战斗中' : '已暂停'}
            </button>
            <button
              type="button"
              onClick={() => setSpeed((v) => (v >= 3 ? 1 : v + 1))}
              className="flex items-center gap-1 rounded-full border border-gold-300/25 bg-ink-950/70 px-2.5 py-1 font-serif text-[11px] text-cream-dim transition-colors hover:text-gold-200"
            >
              <FastForward className="size-3" />
              {speed}倍
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-serif text-[10px] tabular-nums text-cream-faint">
              DPS {formatNumber(driver.state?.dps ?? 0)}
            </span>
            <button
              type="button"
              onClick={driver.skip}
              className="flex items-center gap-1 rounded-full border border-gold-300/25 bg-ink-950/70 px-2.5 py-1 font-serif text-[11px] text-cream-faint transition-colors hover:text-gold-200"
            >
              <RotateCw className="size-3" />
              跳过
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <InkButton variant="ghost" size="md" className="flex-1" onClick={onExit}>
            <Home className="size-3.5" />
            回洞府
          </InkButton>
          <InkButton
            variant="ghost"
            size="md"
            className="flex-1"
            onClick={() => setAuto(false)}
          >
            <LogOut className="size-3.5" />
            暂停
          </InkButton>
        </div>
      </div>

      <BattleResultOverlay
        open={overlayOpen}
        win={finish?.win ?? false}
        stageName={view?.stageName ?? ''}
        damage={driver.result?.damage ?? 0}
        dps={driver.result?.dps ?? 0}
        duration={driver.result?.duration ?? 0}
        drops={dropsToView(finish?.drops ?? [])}
        gains={
          finish
            ? [
                { label: '修为', value: `+${formatNumber(finish.cultivation)}`, icon: 'spark' },
                { label: '灵石', value: `+${formatNumber(finish.stone)}`, icon: 'token' },
              ]
            : undefined
        }
        failReason={finish?.failReason}
        onContinue={handleContinue}
        onRetry={handleRetry}
        onExit={handleContinue}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * 展示映射
 * ------------------------------------------------------------------ */

const QUALITY_ICON: Record<string, string> = {
  white: 'gem',
  green: 'gem',
  blue: 'gem',
  purple: 'gem',
  orange: 'gem',
  red: 'gem',
  rainbow: 'gem',
}

function dropsToView(drops: Drop[]): BattleDropView[] {
  return drops.map((d, i) => ({
    id: `${d.kind}-${d.id ?? i}`,
    name: d.label,
    quality: (d.quality ?? 'green') as Quality,
    icon: d.icon ?? QUALITY_ICON[d.quality ?? 'green'] ?? 'gem',
    detail: d.count > 1 ? `×${d.count}` : undefined,
    kindLabel: d.kind === 'equipment' ? '装备' : undefined,
  }))
}

function portraitForMonster(id: string, icon: string): string | undefined {
  return monsterArt(id, icon)
}

function chapterLabel(chapter: number): string {
  const names = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  return names[chapter - 1] ?? String(chapter)
}

/** 掉落里最高的品质；没有品质信息时按白色处理 */
function bestQuality(drops: Drop[]): Quality {
  let best: Quality = 'white'
  for (const d of drops) {
    const q = d.quality
    if (q && qualityRank(q) > qualityRank(best)) best = q
  }
  return best
}

