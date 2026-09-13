'use client'

import Image from 'next/image'
import { Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { player, realms, realmState } from '@/lib/game-data'
import { InkButton, StatBar } from './primitives'

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
  const currentIndex = Math.max(
    0,
    realms.findIndex((r) => realmState.current.startsWith(r)),
  )
  const ratio = realmState.cultivation / realmState.cultivationMax

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="relative aspect-square w-full max-w-[280px]">
        <div className="absolute inset-[12%] rounded-full border border-gold-300/15" />
        <div className="absolute inset-[26%] rounded-full border border-dashed border-gold-300/10" />

        <div className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full ring-2 ring-gold-300/40">
          <Image
            src={player.portrait}
            alt=""
            fill
            sizes="80px"
            className="object-cover object-top opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
        </div>

        {realms.map((name, i) => (
          <RealmNode
            key={name}
            name={name}
            index={i}
            total={realms.length}
            current={i === currentIndex}
            unlocked={i <= currentIndex}
          />
        ))}
      </div>

      <div className="w-full max-w-[280px] text-center">
        <p className="font-serif text-lg font-bold text-gold-200 text-glow-gold">
          {realmState.current}
        </p>
        <p className="mt-0.5 text-[11px] text-cream-faint">
          修为：{realmState.cultivation.toLocaleString()} /{' '}
          {realmState.cultivationMax.toLocaleString()}
        </p>
        <StatBar value={ratio} className="mt-2" height="h-2" />
      </div>

      <div className="w-full max-w-[280px] rounded-md border border-gold-300/15 bg-ink-950/60 p-3">
        <p className="mb-2 font-serif text-xs tracking-widest text-gold-300/80">
          突破条件
        </p>
        <ul className="flex flex-col gap-1.5">
          {realmState.conditions.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded-full',
                  c.met ? 'bg-jade-500 text-ink-950' : 'bg-ink-800 text-cream-faint',
                )}
              >
                {c.met ? <Check className="size-2.5" strokeWidth={3} /> : null}
              </span>
              <span className={c.met ? 'text-cream-dim' : 'text-cream-faint'}>
                {c.label}
              </span>
              <span className="ml-auto tabular-nums text-cream-faint">{c.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <InkButton
        variant="primary"
        size="lg"
        className="w-full max-w-[280px]"
        onClick={onBreakthrough}
      >
        突破
      </InkButton>
    </div>
  )
}
