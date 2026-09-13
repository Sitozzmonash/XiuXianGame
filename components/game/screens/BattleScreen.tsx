'use client'

import { useEffect, useRef, useState } from 'react'
import { FastForward, Mountain, RotateCw, Swords } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  activeTreasures,
  battleState,
  passiveTreasures,
  type Treasure,
} from '@/lib/game-data'
import { GameHeader } from '../GameHeader'
import { BattleScene, type DamageNumber } from '../BattleScene'
import { ActiveTreasureBar, PassiveTreasureBar } from '../TreasureBars'
import { InkButton } from '../primitives'

export function BattleScreen({
  onBack,
  onOpenTreasure,
  onOpenIdle,
  onOpenBossFail,
}: {
  onBack: () => void
  onOpenTreasure: (t: Treasure) => void
  onOpenIdle: () => void
  onOpenBossFail: () => void
}) {
  const [bossHp, setBossHp] = useState(battleState.bossHp)
  const [damages, setDamages] = useState<DamageNumber[]>([])
  const [auto, setAuto] = useState(battleState.auto)
  const [speed, setSpeed] = useState(battleState.speed)
  const idRef = useRef(0)

  useEffect(() => {
    if (!auto) return
    const interval = window.setInterval(() => {
      const value = 2000 + Math.floor(Math.random() * 2600)
      const id = ++idRef.current
      setDamages((prev) => [...prev.slice(-3), { id, value, crit: value > 4000 }])
      setBossHp((prev) => {
        const next = prev - 0.06
        return next <= 0 ? 1 : next
      })
    }, 1100 / speed)
    return () => window.clearInterval(interval)
  }, [auto, speed])

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-ink-950">
      <div className="absolute inset-x-0 top-0 z-20">
        <GameHeader onOpenProfile={onBack} />
      </div>

      <BattleScene
        bossName={battleState.bossName}
        bossHp={bossHp}
        playerHp={battleState.playerHp}
        damages={damages}
        className="pt-16"
      />

      <div className="absolute bottom-[38%] right-3 z-20">
        <PassiveTreasureBar treasures={passiveTreasures} onSelect={onOpenTreasure} />
      </div>

      <div className="relative z-20 flex flex-col gap-2.5 px-3 pb-3">
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
              <RotateCw className="size-3" />
              自动
            </button>
            <button
              type="button"
              onClick={() => setSpeed((v) => (v >= 3 ? 1 : v + 1))}
              className="flex items-center gap-1 rounded-full border border-gold-300/25 bg-ink-950/70 px-2.5 py-1 font-serif text-[11px] text-cream-dim transition-colors hover:text-gold-200"
            >
              <FastForward className="size-3" />
              {speed}x
            </button>
          </div>
          <button
            type="button"
            onClick={onOpenBossFail}
            className="rounded-full border border-blood-500/40 bg-blood-600/15 px-2.5 py-1 font-serif text-[11px] text-blood-300"
          >
            挑战失败
          </button>
        </div>

        <ActiveTreasureBar treasures={activeTreasures} onSelect={onOpenTreasure} />

        <div className="flex items-center gap-2">
          <InkButton variant="ghost" size="md" className="flex-1" onClick={onOpenIdle}>
            <RotateCw className="size-3.5" />
            扫荡
          </InkButton>
          <InkButton variant="primary" size="md" className="flex-[1.4]" onClick={onOpenBossFail}>
            <Swords className="size-4" />
            战斗
          </InkButton>
          <InkButton variant="ghost" size="md" className="flex-1" onClick={onOpenIdle}>
            <Mountain className="size-3.5" />
            历练
          </InkButton>
        </div>
      </div>
    </div>
  )
}
