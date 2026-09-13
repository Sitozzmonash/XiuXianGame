'use client'

import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GameBackdrop } from './GameBackdrop'
import { ResourceBar } from './GameHeader'

export function ScreenFrame({
  children,
  backdrop = '/images/bg-ink-mountains.png',
  className,
}: {
  children: ReactNode
  backdrop?: string
  className?: string
}) {
  return (
    <div className={cn('relative flex h-full flex-col overflow-hidden', className)}>
      <GameBackdrop src={backdrop} />
      {children}
    </div>
  )
}

export function SubHeader({
  title,
  onBack,
  right,
  className,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'relative z-20 flex items-center gap-2 px-3 pt-3',
        className,
      )}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="返回"
        className="flex size-7 shrink-0 items-center justify-center rounded-full border border-gold-300/25 bg-ink-950/70 text-cream-dim transition-colors hover:text-gold-200"
      >
        <ChevronLeft className="size-4" />
      </button>
      <h1 className="font-serif text-base font-bold tracking-wide text-gold-200 text-glow-gold">
        {title}
      </h1>
      <div className="ml-auto">{right ?? <ResourceBar />}</div>
    </header>
  )
}
