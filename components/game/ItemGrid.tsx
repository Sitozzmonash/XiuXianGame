'use client'

import { ArrowUp, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QUALITY, type Item } from '@/lib/game-data'
import { GameIcon } from './GameIcon'

export function ItemCard({
  item,
  onClick,
  className,
}: {
  item: Item
  onClick?: (item: Item) => void
  className?: string
}) {
  const q = QUALITY[item.quality]
  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      aria-label={`${item.name} Lv.${item.level}`}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-md',
        'bg-gradient-to-b from-ink-800 to-ink-950 transition-transform duration-150 active:scale-95',
        className,
      )}
      style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}` }}
    >
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 50% 115%, ${q.glow}, transparent 62%)`,
        }}
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <GameIcon name={item.icon} className="size-6 text-cream" strokeWidth={1.4} />
      </span>

      <span className="absolute left-0.5 top-0.5 rounded-[3px] bg-ink-950/85 px-1 font-serif text-[9px] leading-[13px] text-gold-200">
        Lv.{item.level}
      </span>

      {item.enhance ? (
        <span className="absolute right-0.5 top-0.5 rounded-[3px] bg-gold-400/90 px-1 font-serif text-[9px] leading-[13px] font-bold text-ink-950">
          +{item.enhance}
        </span>
      ) : null}

      {item.locked && (
        <span className="absolute bottom-0.5 right-0.5 flex size-4 items-center justify-center rounded-[3px] bg-ink-950/85 text-gold-300">
          <Lock className="size-2.5" />
        </span>
      )}

      {item.upgrade && (
        <span className="absolute bottom-0.5 left-0.5 flex size-4 items-center justify-center rounded-[3px] bg-jade-500 text-ink-950">
          <ArrowUp className="size-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

export function ItemGrid({
  items,
  onSelect,
  className,
}: {
  items: Item[]
  onSelect?: (item: Item) => void
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-5 gap-1.5', className)}>
      {items.map((item) => (
        <ItemCard key={item.id} item={item} onClick={onSelect} />
      ))}
    </div>
  )
}
