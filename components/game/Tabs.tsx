'use client'

import { cn } from '@/lib/utils'

export function BuildTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: readonly string[]
  active: string
  onChange: (tab: string) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1 rounded-md border border-gold-300/20 bg-ink-950/70 p-1',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab === active
        return (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab)}
            className={cn(
              'flex-1 rounded-sm px-2 py-1.5 font-serif text-xs transition-all duration-200',
              isActive
                ? 'bg-gradient-to-b from-gold-300 to-gold-500 font-bold text-ink-950 shadow-[0_2px_8px_rgba(232,200,119,0.3)]'
                : 'text-cream-faint hover:text-cream-dim',
            )}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}
