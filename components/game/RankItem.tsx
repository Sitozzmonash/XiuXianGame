'use client'

import { cn } from '@/lib/utils'
import type { RankEntry } from '@/lib/game-data'

const MEDAL: Record<number, { ring: string; text: string; label: string }> = {
  1: { ring: '#e8c877', text: '#f6e6b8', label: '金' },
  2: { ring: '#c8cdd2', text: '#e6eaee', label: '银' },
  3: { ring: '#c98a4b', text: '#e8b98a', label: '铜' },
}

export function RankItem({
  entry,
  highlight,
  className,
}: {
  entry: RankEntry
  highlight?: boolean
  className?: string
}) {
  const medal = MEDAL[entry.rank]
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2',
        highlight
          ? 'border border-gold-300/40 bg-gold-300/10'
          : 'border border-transparent bg-ink-900/60',
        className,
      )}
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-full font-serif text-xs font-bold"
        style={{
          color: medal ? medal.text : '#c8bfa8',
          boxShadow: medal
            ? `inset 0 0 0 1.5px ${medal.ring}, 0 0 10px ${medal.ring}55`
            : 'inset 0 0 0 1px rgba(232,200,119,0.2)',
          background: 'rgba(7,9,8,0.7)',
        }}
      >
        {entry.rank}
      </span>

      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-800 font-serif text-xs text-jade-300 ring-1 ring-inset ring-gold-300/20">
        {entry.name.slice(0, 1)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-serif text-sm text-cream">
          {entry.name}
        </span>
        <span className="block text-[10px] text-cream-faint">
          {entry.realm} · {entry.stage}
        </span>
      </span>

      <span className="shrink-0 font-serif text-sm tabular-nums text-gold-200">
        {entry.value}
      </span>
    </div>
  )
}
