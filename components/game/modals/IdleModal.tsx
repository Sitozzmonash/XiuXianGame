'use client'

import { useCallback, useEffect, useState } from 'react'
import { Coins, Package, Sparkles, Timer } from 'lucide-react'
import { GameModal } from '../GameModal'
import { InkButton } from '../primitives'
import { useGameStore } from '@/lib/game/state/store'
import { formatNumber, formatDuration } from '@/lib/game/utils'


export function IdleModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const lastIdle = useGameStore((s) => s.lastIdle)
  const claimIdle = useGameStore((s) => s.claimIdle)
  const [claimed, setClaimed] = useState(false)

  /* 打开时结算一次挂机收益，作为本次展示的收益快照 */
  useEffect(() => {
    if (!open) {
      setClaimed(false)
      return
    }
    claimIdle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleClaim = useCallback(() => {
    setClaimed(true)
    onClose()
  }, [onClose])

  const materialCount = lastIdle
    ? Object.values(lastIdle.materials).reduce((a, b) => a + b, 0)
    : 0

  const rows = [
    {
      icon: Sparkles,
      label: '修为',
      value: lastIdle ? `+${formatNumber(lastIdle.cultivation)}` : '—',
      color: 'text-jade-300',
    },
    {
      icon: Coins,
      label: '灵石',
      value: lastIdle ? `+${formatNumber(lastIdle.stone)}` : '—',
      color: 'text-gold-200',
    },
    {
      icon: Package,
      label: '装备',
      value: lastIdle ? `${lastIdle.drops.length} 件` : '—',
      color: 'text-cream',
    },
    {
      icon: Package,
      label: '材料',
      value: lastIdle ? `${materialCount} 份` : '—',
      color: 'text-cream',
    },
  ]

  return (
    <GameModal
      open={open}
      onClose={onClose}
      title="挂机收益"
      subtitle="离线期间，道友仍在勤修"
      footer={
        <InkButton variant="primary" size="lg" className="w-full" onClick={handleClaim}>
          {claimed ? '已领取' : '领取全部'}
        </InkButton>
      }
    >
      <div className="mb-3 flex items-center justify-center gap-1.5 rounded-md border border-gold-300/15 bg-ink-950/60 py-2 text-xs text-cream-dim">
        <Timer className="size-3.5 text-gold-300" />
        离线时长 {lastIdle ? formatDuration(lastIdle.duration) : '—'}
        {lastIdle?.capped && <span className="text-blood-400">（已满 24 时辰）</span>}
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex flex-col items-center gap-1 rounded-md border border-gold-300/15 bg-ink-950/60 py-3"
          >
            <r.icon className={`size-4 ${r.color}`} />
            <span className="font-serif text-sm tabular-nums text-cream">
              {r.value}
            </span>
            <span className="text-[10px] text-cream-faint">{r.label}</span>
          </li>
        ))}
      </ul>

      {lastIdle?.hint && (
        <p className="mt-3 rounded-md border border-jade-500/30 bg-jade-800/20 px-3 py-2 text-[11px] leading-relaxed text-jade-200">
          {lastIdle.hint}
        </p>
      )}
    </GameModal>
  )
}
