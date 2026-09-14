'use client'

import { cn } from '@/lib/utils'
import { BOTTOM_TABS, type BottomTab, type Screen } from '@/lib/navigation'
import { GameIcon } from './GameIcon'
import { RedDot } from './primitives'

const TAB_ICON: Record<BottomTab, string> = {
  cave: 'home',
  inventory: 'pouch',
  cultivate: 'lotus',
  alchemy: 'furnace',
  treasure: 'vase',
}

const TAB_RED_DOT: Partial<Record<BottomTab, boolean>> = {
  inventory: true,
  treasure: true,
}

export function BottomNavigation({
  active,
  onNavigate,
  className,
}: {
  active: BottomTab
  onNavigate: (screen: Screen) => void
  className?: string
}) {
  return (
    <nav
      aria-label="主导航"
      className={cn(
        'relative z-20 flex items-stretch justify-around border-t border-gold-300/20',
        'bg-gradient-to-t from-ink-950 via-ink-950/95 to-ink-900/80 px-1 pt-1.5',
        'pb-safe backdrop-blur-sm',
        className,
      )}
    >
      {BOTTOM_TABS.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onNavigate(tab.screen)}
            aria-current={isActive ? 'page' : undefined}
            className="group relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-1"
          >
            <span
              className={cn(
                'relative flex size-9 items-center justify-center rounded-full transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-b from-gold-300/25 to-transparent text-gold-200'
                  : 'text-cream-faint group-hover:text-cream-dim',
              )}
            >
              <GameIcon
                name={TAB_ICON[tab.id]}
                className={cn('size-5', isActive && 'drop-shadow-[0_0_8px_rgba(232,200,119,0.6)]')}
              />
              {TAB_RED_DOT[tab.id] && <RedDot />}
            </span>
            <span
              className={cn(
                'font-serif text-[10px] leading-none transition-colors',
                isActive ? 'text-gold-200' : 'text-cream-faint',
              )}
            >
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute -top-1.5 h-0.5 w-6 rounded-full bg-gold-300 shadow-[0_0_8px_rgba(232,200,119,0.8)]" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
