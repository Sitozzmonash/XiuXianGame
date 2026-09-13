'use client'

import { cn } from '@/lib/utils'
import { QUALITY, type Quality } from '@/lib/game-data'
import { formatDuration, formatNumber } from '@/lib/game/utils'
import type { LiveBattleState } from '@/lib/game/types'
import { GameIcon } from '../GameIcon'

export interface HudTreasure {
  id: string
  name: string
  icon: string
  /** 冷却总时长（秒） */
  cooldown: number
  /** 剩余冷却（秒），<= 0 表示可用 */
  remaining: number
  quality?: Quality
}

export interface BattleHudProps {
  state: LiveBattleState | null
  enemy: { name: string; icon?: string; isBoss: boolean }
  player: { name: string; icon?: string }
  /** 5 个主动法宝槽，缺省项渲染为空槽 */
  treasures: HudTreasure[]
  /** 2 个被动标记 */
  passives?: { id: string; name: string; icon: string }[]
  /** 灵兽头像位 */
  pet?: { name: string; icon?: string; hp: number; maxHp: number; ready?: boolean } | null
  /** 剩余时间（秒），null = 不限时 */
  timeLeft?: number | null
  onTreasureTap?: (t: HudTreasure) => void
  className?: string
}

const ACTIVE_SLOTS = 5
const PASSIVE_SLOTS = 2

function ratio(value: number, max: number): number {
  if (!(max > 0)) return 0
  return Math.min(1, Math.max(0, value / max))
}

function HpBar({
  value,
  max,
  shield,
  barClassName,
  height = 'h-2.5',
}: {
  value: number
  max: number
  shield?: number
  barClassName?: string
  height?: string
}) {
  const pct = ratio(value, max)
  const shieldPct = shield && shield > 0 ? Math.min(100 - pct * 100, ratio(shield, max) * 100) : 0
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-full bg-ink-950/85 ring-1 ring-inset ring-gold-300/20',
        height,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r transition-[width] duration-200 ease-out',
          barClassName,
        )}
        style={{ width: `${pct * 100}%` }}
      />
      {shieldPct > 0 && (
        <div
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-gold-400/70 to-gold-200/85 shadow-[0_0_8px_rgba(232,200,119,0.7)] transition-[left,width] duration-200 ease-out"
          style={{ left: `${pct * 100}%`, width: `${shieldPct}%` }}
        />
      )}
    </div>
  )
}

function CooldownRing({
  slot,
  onTap,
}: {
  slot: HudTreasure | null
  onTap?: (t: HudTreasure) => void
}) {
  if (!slot) {
    return (
      <div className="flex size-12 items-center justify-center rounded-md border border-dashed border-gold-300/15 bg-ink-950/60 text-[10px] text-cream-faint">
        空
      </div>
    )
  }
  const q = QUALITY[slot.quality ?? 'green']
  const total = Math.max(0.001, slot.cooldown)
  const remain = Math.max(0, slot.remaining)
  const ready = remain <= 0
  const progress = ready ? 1 : 1 - remain / total
  const R = 21
  const C = 2 * Math.PI * R
  return (
    <button
      type="button"
      onClick={() => onTap?.(slot)}
      aria-label={`${slot.name}${ready ? '就绪' : `冷却 ${remain.toFixed(1)} 秒`}`}
      className="pointer-events-auto relative flex size-12 items-center justify-center rounded-md bg-gradient-to-b from-ink-800 to-ink-950 transition-transform duration-150 active:scale-95"
      style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 10px ${q.glow}` }}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
        <circle cx="24" cy="24" r={R} fill="none" stroke="rgba(7,9,8,0.75)" strokeWidth="3" />
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke={ready ? '#8ad9c8' : q.ring}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 140ms linear' }}
        />
      </svg>
      <GameIcon
        name={slot.icon}
        className={cn('size-5', ready ? 'text-cream' : 'text-cream-faint')}
        strokeWidth={1.4}
      />
      {!ready && (
        <span className="absolute inset-0 flex items-center justify-center rounded-md bg-ink-950/45 font-serif text-[11px] tabular-nums text-cream-dim">
          {remain >= 10 ? Math.ceil(remain) : remain.toFixed(1)}
        </span>
      )}
      {ready && (
        <span className="absolute inset-x-1.5 bottom-0.5 h-0.5 rounded-full bg-jade-300 shadow-[0_0_8px_rgba(138,217,200,0.9)]" />
      )}
    </button>
  )
}

export function BattleHud({
  state,
  enemy,
  player,
  treasures,
  passives = [],
  pet = null,
  timeLeft = null,
  onTreasureTap,
  className,
}: BattleHudProps) {
  const enemyHp = state?.enemyHp ?? 0
  const enemyMax = state?.enemyMaxHp ?? 1
  const playerHp = state?.playerHp ?? 0
  const playerMax = state?.playerMaxHp ?? 1
  const slots: (HudTreasure | null)[] = Array.from(
    { length: ACTIVE_SLOTS },
    (_, i) => treasures[i] ?? null,
  )

  return (
    <div className={cn('pointer-events-none absolute inset-0 select-none', className)}>
      {/* 顶部：敌方名牌 */}
      <div className="absolute inset-x-0 top-0 px-3 pt-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-sm border bg-ink-950/80',
              enemy.isBoss ? 'border-blood-500/60 text-blood-400' : 'border-gold-300/25 text-cream-dim',
            )}
          >
            <GameIcon name={enemy.icon ?? 'beast'} className="size-4" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-serif text-sm font-bold text-cream drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                {enemy.name}
                {enemy.isBoss && (
                  <span className="ml-1.5 rounded-[3px] border border-blood-500/50 px-1 text-[9px] font-normal text-blood-400">
                    Boss
                  </span>
                )}
              </span>
              <span className="shrink-0 font-serif text-[10px] tabular-nums text-cream-faint">
                {formatNumber(enemyHp)} / {formatNumber(enemyMax)}
              </span>
            </div>
            <div className="mt-1">
              <HpBar
                value={enemyHp}
                max={enemyMax}
                shield={state?.enemyShield ?? 0}
                barClassName={
                  enemy.isBoss ? 'from-blood-600 to-blood-400' : 'from-gold-500 to-blood-400'
                }
              />
            </div>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-end gap-2 font-serif text-[10px] tabular-nums">
          {timeLeft !== null && (
            <span className="rounded-full border border-gold-300/25 bg-ink-950/70 px-2 py-0.5 text-gold-200">
              {formatDuration(timeLeft)}
            </span>
          )}
          <span className="rounded-full border border-jade-500/30 bg-ink-950/70 px-2 py-0.5 text-jade-300">
            DPS {formatNumber(state?.dps ?? 0)}
          </span>
        </div>
      </div>

      {/* 底部：玩家状态 */}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
        <div className="flex items-end gap-2.5">
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-md border border-jade-500/40 bg-ink-950/80 text-jade-300">
            <GameIcon name={player.icon ?? 'user'} className="size-6" strokeWidth={1.4} />
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-[3px] bg-ink-950/90 px-1 font-serif text-[9px] leading-[12px] text-cream-dim">
              {player.name.slice(0, 4)}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <HpBar
              value={playerHp}
              max={playerMax}
              shield={state?.playerShield ?? 0}
              barClassName="from-jade-600 to-jade-300"
            />
            <div className="mt-1 flex items-center justify-between font-serif text-[10px] tabular-nums text-cream-faint">
              <span>
                {formatNumber(playerHp)} / {formatNumber(playerMax)}
              </span>
              <span className="flex items-center gap-1.5">
                {passives.slice(0, PASSIVE_SLOTS).map((p) => (
                  <span
                    key={p.id}
                    title={p.name}
                    className="flex size-5 items-center justify-center rounded-[3px] border border-gold-300/25 bg-ink-900/80 text-gold-300"
                  >
                    <GameIcon name={p.icon} className="size-3" strokeWidth={1.6} />
                  </span>
                ))}
                {pet && (
                  <span className="flex items-center gap-1 rounded-[3px] border border-jade-500/30 bg-ink-900/80 px-1 py-0.5">
                    <GameIcon name={pet.icon ?? 'beast'} className="size-3 text-jade-300" strokeWidth={1.6} />
                    <span className="tabular-nums text-jade-300">
                      {Math.round(ratio(pet.hp, pet.maxHp) * 100)}%
                    </span>
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-1.5">
          {slots.map((slot, i) => (
            <CooldownRing key={slot?.id ?? `empty-${i}`} slot={slot} onTap={onTreasureTap} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default BattleHud
