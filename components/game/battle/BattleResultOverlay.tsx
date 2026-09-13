'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { QUALITY, type Quality } from '@/lib/game-data'
import { GameIcon } from '../GameIcon'
import { InkButton } from '../primitives'

/* ------------------------------------------------------------------ *
 * 战斗结算 —— 爆装期待感的落点
 * 高品质掉落有独立演出：紫光 → 金光 → 血色冲天光柱 + 停顿强调
 * ------------------------------------------------------------------ */

export interface BattleDropView {
  /** 唯一键 */
  id: string
  name: string
  quality: Quality
  icon: string
  /** 数量或说明 */
  detail?: string
  /** 法宝 / 功法 / 灵兽等非装备掉落 */
  kindLabel?: string
}

export interface BattleResultOverlayProps {
  open: boolean
  win: boolean
  /** 关卡名，用于结算标题 */
  stageName: string
  /** 累计伤害 */
  damage: number
  /** 每秒伤害 */
  dps: number
  /** 战斗时长（秒） */
  duration: number
  drops: BattleDropView[]
  /** 修为 / 灵石等资源变化 */
  gains?: { label: string; value: string; icon?: string }[]
  /** 失败原因（PRD 47 章：只提示问题方向，不给唯一答案） */
  failReason?: string
  /** 胜利后继续推关 */
  onContinue: () => void
  /** 失败后重试 */
  onRetry: () => void
  /** 返回主界面 */
  onExit: () => void
}

/** 品质演出的揭示延迟：品质越高，悬念越长 */
const REVEAL_DELAY: Record<Quality, number> = {
  white: 0,
  green: 120,
  blue: 260,
  purple: 520,
  orange: 900,
  red: 1500,
  rainbow: 1900,
}

const HIGH_TIER: Quality[] = ['orange', 'red', 'rainbow']

function isHighTier(q: Quality): boolean {
  return HIGH_TIER.includes(q)
}

export function BattleResultOverlay({
  open,
  win,
  stageName,
  damage,
  dps,
  duration,
  drops,
  gains,
  failReason,
  onContinue,
  onRetry,
  onExit,
}: BattleResultOverlayProps) {
  const [revealed, setRevealed] = useState(0)
  const [shake, setShake] = useState(false)

  const sorted = useMemo(
    () =>
      [...drops].sort(
        (a, b) => qualityRank(b.quality) - qualityRank(a.quality),
      ),
    [drops],
  )

  useEffect(() => {
    if (!open) {
      setRevealed(0)
      setShake(false)
      return
    }
    const timers: number[] = []
    sorted.forEach((drop, i) => {
      const delay = REVEAL_DELAY[drop.quality] + i * 140
      timers.push(window.setTimeout(() => setRevealed(i + 1), delay))
    })
    // 高品质掉落时轻震一次（PRD 19 章：红装掉落带轻震）
    const topTier = sorted[0] && isHighTier(sorted[0].quality)
    if (topTier) {
      timers.push(
        window.setTimeout(() => {
          setShake(true)
          window.setTimeout(() => setShake(false), 420)
        }, REVEAL_DELAY[sorted[0].quality] + 60),
      )
    }
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [open, sorted])

  if (!open) return null

  const best = sorted[0]?.quality
  const topGlow = best ? QUALITY[best].glow : 'rgba(232,200,119,0.4)'

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex flex-col overflow-hidden bg-ink-950/94',
        'animate-[fade-in_0.35s_ease_both]',
        shake && 'animate-[shake_0.4s_ease-in-out]',
      )}
    >
      {/* 顶部光晕：品质越高越亮 */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 size-[420px] -translate-x-1/2 rounded-full animate-[lootGlow_2.6s_ease-in-out_infinite]"
        style={{ background: `radial-gradient(circle, ${topGlow} 0%, rgba(7,9,8,0) 66%)` }}
      />

      <div className="no-scrollbar relative flex-1 overflow-y-auto px-5 pb-4 pt-14">
        {/* 印章裁定 */}
        <div className="relative mx-auto mb-5 flex size-28 items-center justify-center">
          <span
            className={cn(
              'absolute inset-0 rounded-sm border-2',
              win ? 'border-gold-400/60' : 'border-blood-500/60',
            )}
          />
          <span
            className={cn(
              'font-serif text-2xl tracking-[0.14em]',
              win ? 'text-gold-200 text-glow-gold' : 'text-blood-400 text-glow-blood',
            )}
            style={{ animation: 'sealStamp 0.7s cubic-bezier(0.22,1,0.36,1) both' }}
          >
            {win ? '胜' : '败'}
          </span>
        </div>

        <p className="text-center font-serif text-[11px] tracking-[0.4em] text-cream-faint">
          {stageName}
        </p>
        <h3
          className={cn(
            'mt-1.5 text-center font-serif text-xl tracking-[0.18em]',
            win ? 'text-cream' : 'text-cream-dim',
          )}
        >
          {win ? '斩妖毕，收剑' : '力有不逮'}
        </h3>

        {/* 战报三数 */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="总伤害" value={formatShort(damage)} />
          <Stat label="每秒伤害" value={formatShort(dps)} />
          <Stat label="历时" value={`${duration.toFixed(1)}s`} />
        </div>

        {/* 资源收益 */}
        {gains && gains.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {gains.map((g) => (
              <span
                key={g.label}
                className="flex items-center gap-1.5 rounded-full border border-gold-300/25 bg-ink-900/70 px-2.5 py-1 font-serif text-[11px] text-cream-dim"
              >
                {g.icon && <GameIcon name={g.icon} className="size-3 text-jade-300" />}
                {g.label}
                <span className="tabular-nums text-jade-300">{g.value}</span>
              </span>
            ))}
          </div>
        )}

        {/* 掉落 */}
        {win && sorted.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-300/40" />
              <span className="font-serif text-[11px] tracking-[0.3em] text-gold-300/80">
                所得
              </span>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-300/40" />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {sorted.map((drop, i) => (
                <DropCard
                  key={drop.id}
                  drop={drop}
                  shown={i < revealed}
                />
              ))}
            </div>
          </div>
        )}

        {win && sorted.length === 0 && (
          <p className="mt-6 text-center font-serif text-xs tracking-[0.2em] text-cream-faint">
            此番未有所获
          </p>
        )}

        {/* 失败原因：提示方向而非答案 */}
        {!win && failReason && (
          <div className="mt-6 rounded-sm border border-blood-500/30 bg-blood-600/10 px-4 py-3">
            <p className="font-serif text-[11px] tracking-[0.24em] text-blood-400">症结</p>
            <p className="mt-1.5 font-serif text-xs leading-relaxed text-cream-dim">
              {failReason}
            </p>
          </div>
        )}
      </div>

      {/* 操作区 */}
      <div className="relative flex items-center gap-2 border-t border-gold-300/15 px-4 py-3.5">
        {win ? (
          <>
            <InkButton variant="ghost" size="md" className="flex-1" onClick={onExit}>
              返回
            </InkButton>
            <InkButton variant="primary" size="md" className="flex-[1.5]" onClick={onContinue}>
              继续推关
            </InkButton>
          </>
        ) : (
          <>
            <InkButton variant="ghost" size="md" className="flex-1" onClick={onExit}>
              回洞府
            </InkButton>
            <InkButton variant="danger" size="md" className="flex-[1.5]" onClick={onRetry}>
              再战一场
            </InkButton>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-gold-300/18 bg-ink-900/70 px-2 py-2 text-center">
      <p className="font-serif text-[10px] tracking-[0.16em] text-cream-faint">{label}</p>
      <p className="mt-0.5 font-serif text-sm tabular-nums text-cream">{value}</p>
    </div>
  )
}

function DropCard({ drop, shown }: { drop: BattleDropView; shown: boolean }) {
  const q = QUALITY[drop.quality]
  const high = isHighTier(drop.quality)

  return (
    <div
      className="relative flex flex-col items-center gap-1.5 rounded-sm border px-1.5 py-2.5"
      style={{
        borderColor: q.ring,
        background: `linear-gradient(180deg, rgba(19,25,23,0.95), rgba(7,9,8,0.98))`,
        boxShadow: high && shown ? `0 0 20px ${q.glow}, inset 0 0 14px ${q.glow}` : undefined,
        opacity: shown ? 1 : 0,
        animation: shown ? 'lootRise 0.42s cubic-bezier(0.22,1,0.36,1) both' : undefined,
      }}
    >
      {/* 高品质光柱 */}
      {high && shown && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-2 left-1/2 h-16 w-3 -translate-x-1/2 animate-[beamFade_1.1s_ease-out_both]"
          style={{
            background: `linear-gradient(180deg, ${q.ring}, transparent)`,
            filter: 'blur(2px)',
          }}
        />
      )}

      <span
        className="relative flex size-9 items-center justify-center rounded-sm"
        style={{ background: 'rgba(7,9,8,0.7)', boxShadow: `inset 0 0 0 1px ${q.ring}` }}
      >
        <span style={{ color: q.text }}>
          <GameIcon name={drop.icon} className="size-4" />
        </span>
      </span>

      <span
        className="w-full truncate text-center font-serif text-[10px] leading-tight"
        style={{ color: q.text }}
        title={drop.name}
      >
        {drop.name}
      </span>

      <span className="font-serif text-[9px] leading-none" style={{ color: q.ring }}>
        {drop.kindLabel ?? q.label}
        {drop.detail ? ` · ${drop.detail}` : ''}
      </span>
    </div>
  )
}

function qualityRank(q: Quality): number {
  return [
    'white',
    'green',
    'blue',
    'purple',
    'orange',
    'red',
    'rainbow',
  ].indexOf(q)
}

function formatShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e8) return `${(n / 1e8).toFixed(2)}亿`
  if (abs >= 1e4) return `${(n / 1e4).toFixed(1)}万`
  return Math.round(n).toLocaleString('zh-CN')
}
