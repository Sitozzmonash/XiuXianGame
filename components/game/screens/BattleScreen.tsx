'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FastForward, Home, Pause, Play, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStage } from '@/lib/game/config'
import { TREASURE_BY_ID } from '@/lib/game/config/treasures'
import { PET_BY_ID } from '@/lib/game/config/pets'
import { QUALITY, type Treasure } from '@/lib/game-data'
import type { GameSave, Quality } from '@/lib/game/types'
import { GameHeader } from '../GameHeader'
import { BattleCanvas } from '../battle/BattleCanvas'
import { BattleHud, type HudTreasure } from '../battle/BattleHud'
import { BattleResultOverlay, type BattleDropView } from '../battle/BattleResultOverlay'
import { StageTransition } from '../battle/StageTransition'
import { useBattleDriver } from '../battle/useBattleDriver'
import { InkButton } from '../primitives'

/* ------------------------------------------------------------------ *
 * 战斗页 —— 编排：过场 → 实时战斗 → 结算
 * 状态与结算由外部注入，本页只负责表现与交互
 * ------------------------------------------------------------------ */

export interface BattleScreenProps {
  /** 存档快照；为 null 时展示空态提示 */
  save: GameSave | null
  /** 全局关卡序号 */
  stage: number
  onBack: () => void
  /** 战斗胜利结算后，把结果交回状态层 */
  onBattleWin: (info: { drops: BattleDropView[]; damage: number; dps: number }) => void
  onBattleLose: (info: { failReason?: string }) => void
  /** 通关后进入下一关 */
  onNextStage: () => void
  /** 点开某个法宝查看详情 */
  onOpenTreasure: (t: Treasure) => void
  /** 跳转洞府 / 主界面 */
  onExit: () => void
}

/** 战斗时长上限：超时判负，避免拉锯战无限僵持 */
const TIME_LIMIT = 90

export function BattleScreen({
  save,
  stage,
  onBack,
  onBattleWin,
  onBattleLose,
  onNextStage,
  onOpenTreasure,
  onExit,
}: BattleScreenProps) {
  const [auto, setAuto] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [transition, setTransition] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 390, height: 640 })

  const stageInfo = useMemo(() => {
    try {
      const { map, stage: st, monster } = getStage(stage)
      return {
        chapter: `第${chapterLabel(map.chapter)}章 · ${map.name}`,
        stageName: st.name,
        kind: (monster?.kind ?? 'normal') as 'normal' | 'elite' | 'boss',
        index: `${st.index} / ${map.stages.length}`,
      }
    } catch {
      return { chapter: '第一章 · 青石村', stageName: '未知之地', kind: 'normal' as const, index: '1 / 50' }
    }
  }, [stage])

  const handleFinish = useCallback<NonNullable<Parameters<typeof useBattleDriver>[0]['onFinish']>>(
    (info) => {
      if (info.win) {
        onBattleWin({
          drops: dropsFromEvents(info.drops),
          damage: info.damage,
          dps: info.dps,
        })
      } else {
        onBattleLose({ failReason: info.failReason })
      }
    },
    [onBattleWin, onBattleLose],
  )

  const driver = useBattleDriver({
    save,
    stage,
    auto: auto && !transition,
    speed,
    onFinish: handleFinish,
  })

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

  /* 进入关卡时先播过场，过场结束再开打 */
  useEffect(() => {
    setTransition(true)
  }, [stage])

  const treasures = useMemo<HudTreasure[]>(() => {
    if (!save) return []
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
  }, [save, driver.state?.skillCds])

  const passives = useMemo(() => {
    if (!save) return []
    const out: { id: string; name: string; icon: string }[] = []
    for (const id of save.combat.passiveTreasures) {
      if (!id) continue
      const def = TREASURE_BY_ID[id]
      if (def) out.push({ id: def.id, name: def.name, icon: def.icon })
    }
    return out
  }, [save])

  const pet = useMemo(() => {
    if (!save?.combat.pet) return null
    const def = PET_BY_ID[save.combat.pet]
    if (!def) return null
    return {
      name: def.name,
      icon: def.icon,
      hp: driver.state?.petHp ?? 0,
      maxHp: driver.state?.petMaxHp ?? 0,
      ready: true,
    }
  }, [save?.combat.pet, driver.state?.petHp, driver.state?.petMaxHp])

  const openTreasureByHud = useCallback(
    (t: HudTreasure) => {
      const defId = t.id.split('#')[0]
      const def = TREASURE_BY_ID[defId]
      if (!def) return
      const owned = save?.combat.ownedTreasures.find((x) => x.defId === defId)
      onOpenTreasure({
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
    [save?.combat.ownedTreasures, onOpenTreasure],
  )

  const timeLeft = driver.state ? Math.max(0, TIME_LIMIT - driver.state.time) : TIME_LIMIT
  const overlayOpen = !transition && driver.result !== null

  if (!save) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-ink-950 px-8">
        <p className="font-serif text-sm tracking-[0.24em] text-cream-faint">
          尚未开辟仙途
        </p>
        <InkButton variant="primary" size="md" onClick={onExit}>
          回到主界面
        </InkButton>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-ink-950">
      <StageTransition
        open={transition}
        chapter={stageInfo.chapter}
        stageName={stageInfo.stageName}
        kind={stageInfo.kind}
        index={stageInfo.index}
        onDone={() => setTransition(false)}
      />

      <div className="absolute inset-x-0 top-0 z-30">
        <GameHeader onOpenProfile={onBack} />
      </div>

      {/* 战场 */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <BattleCanvas
          events={driver.events}
          state={driver.state}
          enemy={{
            name: driver.enemy.name,
            image: driver.enemy.image,
            icon: driver.enemy.icon,
            isBoss: driver.enemy.isBoss,
          }}
          player={{
            name: save.profile.name || '凡尘散人',
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
          enemy={{ name: driver.enemy.name, icon: driver.enemy.icon, isBoss: driver.enemy.isBoss }}
          player={{ name: save.profile.name || '凡尘散人' }}
          treasures={treasures}
          passives={passives}
          pet={pet}
          timeLeft={timeLeft}
          onTreasureTap={openTreasureByHud}
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

          <button
            type="button"
            onClick={driver.skip}
            className="flex items-center gap-1 rounded-full border border-gold-300/25 bg-ink-950/70 px-2.5 py-1 font-serif text-[11px] text-cream-faint transition-colors hover:text-gold-200"
          >
            <RotateCw className="size-3" />
            跳过战斗
          </button>
        </div>

        <div className="flex items-center gap-2">
          <InkButton variant="ghost" size="md" className="flex-1" onClick={onExit}>
            <Home className="size-3.5" />
            回洞府
          </InkButton>
          <InkButton
            variant="primary"
            size="md"
            className="flex-[1.6]"
            onClick={driver.start}
            disabled={driver.running}
          >
            {driver.running ? '激战中…' : '重新挑战'}
          </InkButton>
        </div>
      </div>

      <BattleResultOverlay
        open={overlayOpen}
        win={driver.result?.win ?? false}
        stageName={stageInfo.stageName}
        damage={driver.result?.damage ?? 0}
        dps={driver.result?.dps ?? 0}
        duration={driver.result?.duration ?? 0}
        drops={driver.result?.drops ? dropsFromEvents(driver.result.drops) : []}
        failReason={driver.result?.failReason}
        onContinue={onNextStage}
        onRetry={() => driver.start()}
        onExit={onExit}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * 掉落事件 → 结算展示
 * 当前引擎只给出掉落类别，具体装备实例由状态层结算后回填。
 * 这里保证即使只有类别也能看到一个像样的结算画面。
 * ------------------------------------------------------------------ */

const FALLBACK_ICON: Record<string, string> = {
  装备: 'sword',
  法宝碎片: 'vase',
  炼器材料: 'ore',
  丹药: 'pill',
}

function dropsFromEvents(events: { label?: string; quality?: Quality; icon?: string; value?: number }[]): BattleDropView[] {
  return events.map((e, i) => {
    const label = e.label ?? '所得'
    const quality = e.quality ?? 'green'
    return {
      id: `${label}-${i}`,
      name: label,
      quality,
      icon: e.icon ?? FALLBACK_ICON[label] ?? 'gem',
      kindLabel: QUALITY[quality].label,
    }
  })
}

function chapterLabel(chapter: number): string {
  const names = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  return names[chapter - 1] ?? String(chapter)
}
