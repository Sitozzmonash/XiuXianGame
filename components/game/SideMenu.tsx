'use client'

import { cn } from '@/lib/utils'
import type { MenuItem } from '@/lib/game-data'
import { GameIcon } from './GameIcon'
import { RedDot } from './primitives'

export function SideMenu({
  items,
  side,
  onSelect,
  className,
}: {
  items: MenuItem[]
  side: 'left' | 'right'
  onSelect: (item: MenuItem) => void
  className?: string
}) {
  return (
    <nav
      aria-label={side === 'left' ? '左侧功能' : '右侧功能'}
      className={cn(
        'flex flex-col gap-2.5',
        side === 'left' ? 'items-start' : 'items-end',
        className,
      )}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="group relative flex w-12 flex-col items-center gap-0.5"
        >
          <span
            className={cn(
              'relative flex size-10 items-center justify-center rounded-full',
              'border border-gold-300/30 bg-ink-900/85 text-gold-200',
              'shadow-[0_3px_10px_rgba(0,0,0,0.55)] transition-all duration-200',
              'group-hover:border-gold-300/70 group-hover:text-gold-100 group-active:scale-95',
            )}
          >
            <GameIcon name={item.icon} className="size-5" />
            {item.redDot && <RedDot />}
          </span>
          <span className="font-serif text-[10px] leading-none text-cream-dim drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  )
}
