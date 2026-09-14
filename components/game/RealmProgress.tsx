'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { REALMS } from '@/lib/game/config/realms'
import { canBreakthrough } from '@/lib/game/engine/breakthrough'
import { InkButton, StatBar } from './primitives'
import { useGameStore } from '@/lib/game/state/store'
import { cultivationProgress } from '@/lib/game/state/selectors'
import { formatNumber } from '@/lib/game/utils'

function RealmNode({
  name,
  index,
  total,
  current,
  unlocked,
}: {
  name: string
  index: number
  total: number
  current: boolean
  unlocked: boolean
}) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  const radius = 40
  const x = 50 + Math.cos(angle) * radius
  const y = 50 + Math.sin(angle) * radius

  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-full font-serif text-[11px] transition-all',
          current
            ? 'bg-gradient-to-b from-gold-300 to-gold-500 font-bold text-ink-950 shadow-[0_0_16px_rgba(232,200,119,0.6)]'
            : unlocked
              ? 'bg-ink-800 text-jade-300 ring-1 ring-inset ring-jade-500/50'
              : 'bg-ink-900 text-cream-faint ring-1 ring-inset ring-gold-300/15',
        )}
      >
        {name}
      </span>
      {!unlocked && <Lock className="size-2.5 text-cream-faint" />}
    </div>
  )
}

export function RealmProgress({
  onBreakthrough,
  className,
}: {
  onBreakthrough?: () => void
  className?: string
}) {
  const save = useGameStore((s) => s.save)
  // 必须在 useMemo 里算：canBreakthrough 每次返回新对象，
  // 直接当 selector 会让 useSyncExternalStore 每帧拿到新引用 → 无限重渲染而崩页
  const check = useMemo(() => canBreakthrough(save), [save])
  const prog = cultivationProgress(save)

  const currentIndex = REALMS.findIndex((r) => r.id === save.profile.realmId)
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0
  const ratio = prog.pct

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="relative aspect-square w-full max-w-[280px]">
        <div className="absolute inset-[12%] rounded-full border border-gold-300/15" />
        <div className="absolute inset-[26%] rounded-full border border-dashed border-gold-300/10" />

        <div className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full ring-2 ring-gold-300/40">
          <Image
            src="/images/player-portrait.png"
            alt={save.profile.name}
            fill
            sizes="80px"
            className="object-cover object-top opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
        </div>

        {REALMS.map((r, i) => (
          <RealmNode
            key={r.id}
            name={r.name}
            index={i}
            total={REALMS.length}
            current={i === safeCurrentIndex}
            unlocked={i <= safeCurrentIndex}
          />
        ))}
      </div>

      <div className="w-full max-w-[280px] text-center">
        <p className="font-serif text-lg font-bold text-gold-200 text-glow-gold">
          {prog.stageLabel}
        </p>
        <p className="mt-0.5 text-[11px] text-cream-faint">
          修为：{formatNumber(prog.current)} / {formatNumber(prog.max)}
        </p>
        <StatBar value={ratio} className="mt-2" height="h-2" />
      </div>

      <div className="w-full max-w-[280px] rounded-md border border-gold-300/15 bg-ink-950/60 p-3">
        <p className="mb-2 font-serif text-xs tracking-widest text-gold-300/80">
          突破条件
        </p>
        <ul className="flex flex-col gap-1.5">
          <li className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-full',
                check.cultivationOk ? 'bg-jade-500 text-ink-950' : 'bg-ink-800 text-cream-faint',
              )}
            >
              {check.cultivationOk ? <Check className="size-2.5" strokeWidth={3} /> : null}
            </span>
            <span className={check.cultivationOk ? 'text-cream-dim' : 'text-cream-faint'}>
              修为圆满
            </span>
            <span className="ml-auto tabular-nums text-cream-faint">
              {formatNumber(check.cultivation)} / {formatNumber(check.cultivationMax)}
            </span>
          </li>

          {check.materials.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded-full',
                  m.ok ? 'bg-jade-500 text-ink-950' : 'bg-ink-800 text-cream-faint',
                )}
              >
                {m.ok ? <Check className="size-2.5" strokeWidth={3} /> : null}
              </span>
              <span className={m.ok ? 'text-cream-dim' : 'text-cream-faint'}>
                {m.name}
              </span>
              <span className="ml-auto tabular-nums text-cream-faint">
                {m.have} / {m.need}
              </span>
            </li>
          ))}

          {check.bossName && (
            <li className="flex items-center gap-2 text-xs">
              <span className="flex size-4 items-center justify-center rounded-full bg-ink-800 text-cream-faint" />
              <span className="text-cream-faint">突破试炼：{check.bossName}</span>
            </li>
          )}
        </ul>
      </div>

      <InkButton
        variant={check.can ? 'primary' : 'ghost'}
        size="lg"
        className="w-full max-w-[280px]"
        disabled={!check.can}
        onClick={onBreakthrough}
      >
        {check.can ? '突破境界' : (check.reason ?? '条件未足')}
      </InkButton>
    </div>
  )
}
