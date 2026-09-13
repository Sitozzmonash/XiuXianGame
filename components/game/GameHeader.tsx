'use client'

import Image from 'next/image'
import { Coins, Settings, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { player } from '@/lib/game-data'
import { ResourceValue } from './primitives'

export function ResourceBar({
  className,
  onAdd,
}: {
  className?: string
  onAdd?: (kind: 'stone' | 'cultivation') => void
}) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <ResourceValue
        icon={<Coins className="size-3" />}
        value="12.6万"
        onAdd={() => onAdd?.('stone')}
      />
      <ResourceValue
        icon={<Sparkles className="size-3" />}
        value="324.8万"
        onAdd={() => onAdd?.('cultivation')}
      />
    </div>
  )
}

export function PlayerProfile({
  className,
  onClick,
}: {
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex items-center gap-2 text-left', className)}
    >
      <span className="relative size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-gold-300/50">
        <Image
          src={player.portrait}
          alt={player.name}
          fill
          sizes="44px"
          className="object-cover object-top"
        />
        <span className="absolute inset-x-0 bottom-0 bg-ink-950/85 text-center font-serif text-[9px] leading-[13px] text-gold-200">
          {player.level}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block truncate font-serif text-sm font-bold text-cream">
          {player.name}
        </span>
        <span className="block text-[10px] text-jade-300">
          {player.realm} · Lv.{player.level}
        </span>
        <span className="block text-[10px] text-gold-300/90">
          战力 52.3万
        </span>
      </span>
    </button>
  )
}

export function GameHeader({
  onOpenProfile,
  onOpenSettings,
  onAdd,
  className,
}: {
  onOpenProfile?: () => void
  onOpenSettings?: () => void
  onAdd?: (kind: 'stone' | 'cultivation') => void
  className?: string
}) {
  return (
    <header
      className={cn(
        'relative z-20 flex items-center justify-between gap-2 px-3 pt-3',
        className,
      )}
    >
      <PlayerProfile onClick={onOpenProfile} />
      <div className="flex items-center gap-1.5">
        <ResourceBar onAdd={onAdd} />
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="设置"
          className="flex size-7 items-center justify-center rounded-full border border-gold-300/25 bg-ink-950/70 text-cream-dim transition-colors hover:text-gold-200"
        >
          <Settings className="size-3.5" />
        </button>
      </div>
    </header>
  )
}
