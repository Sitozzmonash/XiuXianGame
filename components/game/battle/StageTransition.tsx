'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 关卡过场卡 —— 进入战斗前的水墨标题演出
 * 普通关 ~1.2s，精英 ~1.8s，Boss / 剧情节点 ~2.6s（Boss 多一层朱砂印）
 * ------------------------------------------------------------------ */

export interface StageTransitionProps {
  open: boolean
  /** 章节名，如「第一章 · 青石村」 */
  chapter: string
  /** 关卡名，如「山径·第 12 关」 */
  stageName: string
  /** 关卡类型，决定演出时长与配色 */
  kind: 'normal' | 'elite' | 'boss' | 'event'
  /** 关卡序号展示，如「12 / 50」 */
  index: string
  /** 完成回调（演出结束或点击跳过） */
  onDone: () => void
}

const HOLD: Record<StageTransitionProps['kind'], number> = {
  normal: 1200,
  elite: 1800,
  boss: 2600,
  event: 2000,
}

const KIND_LABEL: Record<StageTransitionProps['kind'], string> = {
  normal: '寻常妖物',
  elite: '精英 · 险',
  boss: '章节首领',
  event: '奇遇',
}

const KIND_ACCENT: Record<StageTransitionProps['kind'], string> = {
  normal: 'text-cream-dim',
  elite: 'text-gold-300',
  boss: 'text-blood-400',
  event: 'text-jade-300',
}

export function StageTransition({
  open,
  chapter,
  stageName,
  kind,
  index,
  onDone,
}: StageTransitionProps) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')

  useEffect(() => {
    if (!open) {
      setPhase('in')
      return
    }
    const hold = HOLD[kind]
    const outTimer = window.setTimeout(() => setPhase('out'), hold)
    const doneTimer = window.setTimeout(onDone, hold + 520)
    return () => {
      window.clearTimeout(outTimer)
      window.clearTimeout(doneTimer)
    }
    // onDone 每次渲染都是新引用，不放进依赖避免演出被反复重置
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind])

  if (!open) return null

  const isBoss = kind === 'boss'

  return (
    <button
      type="button"
      onClick={onDone}
      aria-label="跳过过场"
      className={cn(
        'absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden',
        'bg-ink-950/92 backdrop-blur-[2px] transition-opacity duration-500',
        phase === 'out' ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
    >
      {/* 水墨扩散底纹 */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute size-[130%] rounded-full',
          'bg-[radial-gradient(circle,rgba(242,234,216,0.10)_0%,rgba(7,9,8,0)_62%)]',
          'animate-[stageInk_1.1s_cubic-bezier(0.22,1,0.36,1)_both]',
        )}
      />
      {/* 朱砂印章（仅 Boss / 精英） */}
      {(isBoss || kind === 'elite') && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute size-44 rotate-[-12deg] rounded-sm border-2',
            'animate-[stageSeal_0.9s_cubic-bezier(0.22,1,0.36,1)_both]',
            isBoss ? 'border-blood-500/35' : 'border-gold-400/25',
          )}
        />
      )}

      <div className="relative flex flex-col items-center gap-3 px-10 text-center">
        <p className="animate-[stageRise_0.7s_ease-out_both] font-serif text-[11px] tracking-[0.42em] text-cream-faint">
          {chapter}
        </p>

        <h2
          className={cn(
            'animate-[stageRise_0.7s_ease-out_0.08s_both] font-serif text-3xl tracking-[0.16em]',
            isBoss ? 'text-blood-400 text-glow-blood' : 'text-cream text-glow-gold',
          )}
        >
          {stageName}
        </h2>

        <div className="animate-[stageRise_0.7s_ease-out_0.16s_both] flex items-center gap-2">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold-300/50" />
          <span className={cn('font-serif text-xs tracking-[0.3em]', KIND_ACCENT[kind])}>
            {KIND_LABEL[kind]}
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold-300/50" />
        </div>

        <p className="animate-[stageRise_0.7s_ease-out_0.24s_both] font-serif text-[11px] tracking-[0.3em] text-cream-faint">
          {index}
        </p>
      </div>

      <span className="absolute bottom-8 animate-[pulseGlow_2s_ease-in-out_infinite] font-serif text-[10px] tracking-[0.3em] text-cream-faint/70">
        点击跳过
      </span>
    </button>
  )
}
