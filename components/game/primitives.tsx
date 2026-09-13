import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { QUALITY, type Quality } from '@/lib/game-data'

/* ------------------------------------------------------------------ */
/* 红点                                                                */
/* ------------------------------------------------------------------ */

export function RedDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute -right-0.5 -top-0.5 z-10 size-2.5 rounded-full',
        'bg-blood-400 ring-2 ring-ink-950/80',
        className,
      )}
      aria-hidden="true"
    />
  )
}

/* ------------------------------------------------------------------ */
/* 面板                                                                */
/* ------------------------------------------------------------------ */

export function Panel({
  children,
  className,
  variant = 'ink',
}: {
  children: ReactNode
  className?: string
  variant?: 'ink' | 'parchment'
}) {
  return (
    <div
      className={cn(
        'relative rounded-md',
        variant === 'ink' ? 'panel-ink' : 'panel-parchment',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 古风按钮                                                            */
/* ------------------------------------------------------------------ */

type InkButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'jade' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function InkButton({
  variant = 'ghost',
  size = 'md',
  className,
  children,
  ...props
}: InkButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex items-center justify-center gap-1.5 rounded-sm font-serif font-semibold tracking-wide',
        'transition-all duration-200 active:scale-[0.97] disabled:opacity-40',
        'before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[2px] before:border before:border-current/20',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        variant === 'primary' &&
          'bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 shadow-[0_4px_14px_rgba(232,200,119,0.28)] hover:from-gold-200 hover:to-gold-400',
        variant === 'jade' &&
          'bg-gradient-to-b from-jade-500 to-jade-700 text-cream shadow-[0_4px_14px_rgba(58,157,139,0.3)] hover:from-jade-400 hover:to-jade-600',
        variant === 'ghost' &&
          'border border-gold-300/30 bg-ink-800/70 text-cream-dim hover:border-gold-300/60 hover:text-cream',
        variant === 'danger' &&
          'bg-gradient-to-b from-blood-400 to-blood-600 text-cream shadow-[0_4px_14px_rgba(176,54,38,0.3)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* 标题                                                                */
/* ------------------------------------------------------------------ */

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-300/40" />
      <span className="font-serif text-xs tracking-[0.3em] text-gold-300/80">
        {children}
      </span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-300/40" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 进度条                                                              */
/* ------------------------------------------------------------------ */

export function StatBar({
  value,
  className,
  barClassName,
  height = 'h-1.5',
}: {
  value: number
  className?: string
  barClassName?: string
  height?: string
}) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-full bg-ink-950/80 ring-1 ring-inset ring-gold-300/15',
        height,
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r from-jade-500 to-jade-300 transition-[width] duration-500',
          barClassName,
        )}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 品质徽记                                                            */
/* ------------------------------------------------------------------ */

export function QualityBadge({
  quality,
  className,
}: {
  quality: Quality
  className?: string
}) {
  const q = QUALITY[quality]
  return (
    <span
      className={cn(
        'rounded-[3px] px-1.5 py-0.5 font-serif text-[10px] leading-none',
        className,
      )}
      style={{
        color: q.text,
        background: 'rgba(7,9,8,0.7)',
        boxShadow: `inset 0 0 0 1px ${q.ring}`,
      }}
    >
      {q.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* 资源数值                                                            */
/* ------------------------------------------------------------------ */

export function ResourceValue({
  icon,
  value,
  onAdd,
  className,
}: {
  icon: ReactNode
  value: string
  onAdd?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border border-gold-300/20 bg-ink-950/70 py-0.5 pl-1 pr-1.5',
        className,
      )}
    >
      <span className="flex size-5 items-center justify-center rounded-full bg-ink-800 text-jade-300">
        {icon}
      </span>
      <span className="font-serif text-xs tabular-nums text-cream">{value}</span>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label="获取更多"
          className="flex size-4 items-center justify-center rounded-full bg-gold-400/90 text-[11px] font-bold leading-none text-ink-950"
        >
          +
        </button>
      )}
    </div>
  )
}
