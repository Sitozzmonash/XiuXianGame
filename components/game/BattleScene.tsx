'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { player } from '@/lib/game-data'
import { StatBar } from './primitives'

export type DamageNumber = { id: number; value: number; crit?: boolean }

export function BattleScene({
  bossName,
  bossHp,
  playerHp,
  damages,
  className,
}: {
  bossName: string
  bossHp: number
  playerHp: number
  damages: DamageNumber[]
  className?: string
}) {
  return (
    <div className={cn('relative flex-1 overflow-hidden', className)}>
      <Image
        src="/images/bg-battle-ridge.png"
        alt=""
        fill
        priority
        sizes="(max-width: 430px) 100vw, 430px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/40 via-transparent to-ink-950/85" />

      {/* 敌方 */}
      <div className="absolute right-0 top-[16%] w-[62%]">
        <div className="mb-1 flex items-center justify-end gap-2 pr-3">
          <span className="font-serif text-xs font-bold text-blood-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {bossName}
          </span>
        </div>
        <div className="pr-3">
          <StatBar
            value={bossHp}
            height="h-2"
            barClassName="from-blood-600 to-blood-400"
          />
        </div>
        <div className="relative mt-1 h-40">
          <Image
            src="/images/boss-black-wolf.png"
            alt={bossName}
            fill
            sizes="260px"
            className="object-contain object-right drop-shadow-[0_8px_24px_rgba(0,0,0,0.7)]"
          />
        </div>
      </div>

      {/* 伤害数字 */}
      <div className="pointer-events-none absolute right-[26%] top-[30%] flex flex-col items-end gap-0.5">
        {damages.map((d) => (
          <span
            key={d.id}
            className={cn(
              'animate-float-up font-serif font-bold tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
              d.crit ? 'text-lg text-gold-200' : 'text-base text-cream',
            )}
          >
            -{d.value.toLocaleString()}
          </span>
        ))}
      </div>

      {/* 我方 */}
      <div className="absolute bottom-[6%] left-0 w-[58%]">
        <div className="relative h-44">
          <Image
            src="/images/player-swordsman.png"
            alt={player.name}
            fill
            sizes="240px"
            className="object-contain object-left-bottom drop-shadow-[0_8px_24px_rgba(0,0,0,0.7)]"
          />
        </div>
        <div className="mt-1 pl-3 pr-6">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="font-serif text-[11px] text-cream-dim drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              {player.name}
            </span>
          </div>
          <StatBar value={playerHp} height="h-2" />
          <p className="mt-0.5 text-right text-[10px] tabular-nums text-cream-faint">
            5.2万/5.2万
          </p>
        </div>
      </div>
    </div>
  )
}
