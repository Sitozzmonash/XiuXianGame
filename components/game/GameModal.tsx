'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function GameModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-[2px] animate-fade-in"
      />
      <div
        className={cn(
          'relative w-full max-w-[340px] animate-rise overflow-hidden rounded-lg panel-ink',
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/60 to-transparent" />
        <header className="flex items-start justify-between gap-3 border-b border-gold-300/15 px-4 py-3">
          <div>
            <h2 className="font-serif text-base font-bold tracking-wide text-gold-200 text-glow-gold">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-cream-faint">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="-mr-1 -mt-1 flex size-7 items-center justify-center rounded-sm text-cream-faint transition-colors hover:bg-ink-800 hover:text-cream"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="max-h-[52vh] overflow-y-auto px-4 py-3 no-scrollbar">
          {children}
        </div>
        {footer && (
          <footer className="flex items-center gap-2 border-t border-gold-300/15 px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
