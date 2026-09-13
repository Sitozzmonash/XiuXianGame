'use client'

import { cn } from '@/lib/utils'
import { QUALITY, type Treasure } from '@/lib/game-data'
import { GameIcon } from './GameIcon'

function TreasureTile({
  treasure,
  onClick,
  size = 'md',
}: {
  treasure: Treasure
  onClick?: (t: Treasure) => void
  size?: 'md' | 'sm'
}) {
  const q = QUALITY[treasure.quality]
  const ready = treasure.ready >= 1
  const dim = size === 'sm'

  return (
    <button
      type="button"
      onClick={() => onClick?.(treasure)}
      className="group flex flex-col items-center gap-1"
    >
      <span
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-md',
          dim ? 'size-11' : 'size-14',
          'bg-gradient-to-b from-ink-800 to-ink-950 transition-transform duration-200 group-active:scale-95',
        )}
        style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 12px ${q.glow}` }}
      >
        <GameIcon
          name={treasure.icon}
          className={cn(dim ? 'size-5' : 'size-7')}
          strokeWidth={1.4}
        />
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(120% 90% at 50% 120%, ${q.glow}, transparent 60%)`,
          }}
        />
        {!dim && (
          <span className="absolute left-0.5 top-0.5 rounded-[3px] bg-ink-950/85 px-1 font-serif text-[9px] leading-[13px] text-gold-200">
            Lv.{treasure.level}
          </span>
        )}
        {!ready && (
          <span
            className="absolute inset-x-0 bottom-0 bg-ink-950/80"
            style={{ height: `${(1 - treasure.ready) * 100}%` }}
          />
        )}
        {ready && !dim && (
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-jade-300 shadow-[0_0_8px_rgba(138,217,200,0.9)]" />
        )}
      </span>
      {!dim && (
        <span className="font-serif text-[10px] leading-none text-cream-dim">
          {treasure.name}
        </span>
      )}
    </button>
  )
}

export function ActiveTreasureBar({
  treasures,
  onSelect,
  className,
}: {
  treasures: Treasure[]
  onSelect?: (t: Treasure) => void
  className?: string
}) {
  return (
    <div className={cn('flex items-end justify-between gap-1.5', className)}>
      {treasures.map((t) => (
        <TreasureTile key={t.id} treasure={t} onClick={onSelect} />
      ))}
    </div>
  )
}

export function PassiveTreasureBar({
  treasures,
  onSelect,
  className,
}: {
  treasures: Treasure[]
  onSelect?: (t: Treasure) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <span className="font-serif text-[9px] tracking-widest text-cream-faint">
        被动法宝
      </span>
      <div className="flex gap-1.5">
        {treasures.map((t) => (
          <TreasureTile key={t.id} treasure={t} onClick={onSelect} size="sm" />
        ))}
      </div>
    </div>
  )
}
