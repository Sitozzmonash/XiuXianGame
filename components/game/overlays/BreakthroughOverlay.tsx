'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { InkButton, SectionTitle } from '@/components/game/primitives'

export interface BreakthroughOverlayProps {
  open: boolean
  /** 突破前的阶段名，如「炼气圆满」 */
  fromLabel: string
  /** 突破后的阶段名；失败时为 null */
  toLabel: string | null
  success: boolean
  /** 突破试炼的 Boss / 心魔名（可为空） */
  bossName?: string | null
  /** 消耗掉的突破材料（BreakthroughOutcome.consumedMaterials 是 {id,count}，父层需换成人读的名字） */
  consumedMaterials?: { name: string; count: number }[]
  /** 新解锁的内容文案（BreakthroughOutcome.unlocked 是原始 flag，父层需换成文案） */
  unlocked?: string[]
  /** 失败时的原因（只提示方向，不给唯一答案） */
  failMessage?: string
  onClose: () => void
}

type Phase = 'gather' | 'crack' | 'rise' | 'reward' | 'done'

/** 周边灵气粒子：角度（deg）与距中心的距离（px），错开延迟避免同步呼吸 */
const PARTICLES: { a: number; d: number; delay: number }[] = [
  { a: -90, d: 156, delay: 0 },
  { a: -45, d: 196, delay: 130 },
  { a: 0, d: 168, delay: 60 },
  { a: 45, d: 204, delay: 190 },
  { a: 90, d: 172, delay: 90 },
  { a: 135, d: 198, delay: 220 },
  { a: 180, d: 160, delay: 40 },
  { a: 225, d: 188, delay: 160 },
]

/**
 * 粒子与冲击波都用 transform 自行居中（左右用 left/top 50%），
 * 不用 Tailwind 的 translate 工具类，避免与 keyframes 的 transform 互相覆盖。
 */
const KEYFRAMES = `
@keyframes btConverge {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--bt-a)) translateY(calc(var(--bt-d) * -1)) scale(1);
  }
  22% { opacity: 1; }
  72% { opacity: 1; }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--bt-a)) translateY(-6px) scale(0.22);
  }
}
@keyframes btShock {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.24);
  }
  26% { opacity: 0.95; }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.9);
  }
}
`

export function BreakthroughOverlay({
  open,
  fromLabel,
  toLabel,
  success,
  bossName,
  consumedMaterials,
  unlocked,
  failMessage,
  onClose,
}: BreakthroughOverlayProps) {
  const [phase, setPhase] = useState<Phase>('gather')
  const timers = useRef<number[]>([])

  useEffect(() => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
    if (!open) {
      setPhase('gather')
      return
    }
    setPhase('gather')
    // 失败时聚气与收束都更快：没有新境界要立，重在立刻给出「无惩罚」的安抚
    const timeline: { phase: Phase; ms: number }[] = success
      ? [
          { phase: 'crack', ms: 1200 },
          { phase: 'rise', ms: 800 },
          { phase: 'reward', ms: 1600 },
          { phase: 'done', ms: 1000 },
        ]
      : [
          { phase: 'crack', ms: 900 },
          { phase: 'rise', ms: 800 },
          { phase: 'reward', ms: 1400 },
          { phase: 'done', ms: 900 },
        ]
    let acc = 0
    for (const step of timeline) {
      acc += step.ms
      timers.current.push(window.setTimeout(() => setPhase(step.phase), acc))
    }
    return () => {
      for (const t of timers.current) window.clearTimeout(t)
      timers.current = []
    }
  }, [open, success])

  if (!open) return null

  const newLabel = toLabel ?? fromLabel
  const rewards = consumedMaterials ?? []
  const unlocks = unlocked ?? []
  const skip = () => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
    setPhase('done')
  }

  return (
    <div
      className="absolute inset-0 z-[60] overflow-hidden bg-ink-950/92 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={success ? '境界突破' : '突破未成'}
    >
      <style>{KEYFRAMES}</style>
      <div className="ink-vignette pointer-events-none absolute inset-0" />

      {/* 压暗：聚气阶段缓慢收拢视野，裂境后维持住 */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-700',
          success
            ? 'bg-[radial-gradient(circle_at_center,transparent_8%,rgba(7,9,8,0.86)_72%)]'
            : 'bg-[radial-gradient(circle_at_center,transparent_6%,rgba(20,6,4,0.9)_70%)]',
          phase === 'gather' ? 'animate-[fade-in_1.1s_ease-out_both]' : 'opacity-100',
        )}
      />

      {phase !== 'done' && (
        <button
          type="button"
          onClick={skip}
          className="absolute right-3 top-3 z-20 flex min-h-10 min-w-[56px] items-center justify-center rounded-sm border border-gold-300/25 bg-ink-950/70 px-3 font-serif text-[11px] text-cream-dim transition-colors hover:border-gold-300/60 hover:text-cream"
        >
          跳过
        </button>
      )}

      <div className="absolute inset-0 overflow-y-auto no-scrollbar">
        <div className="flex min-h-full flex-col items-center justify-center px-5 py-12">
          {/* 水墨场：施法范围限在中心一块，避免横屏 / 大屏时特效散得太开 */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {/* 聚气：水墨自中心向外扩散 */}
              {phase === 'gather' && (
                <span
                  className={cn(
                    'block size-[240px] rounded-full animate-[stageInk_1.2s_ease-out_both]',
                    success
                      ? 'bg-[radial-gradient(circle,rgba(232,200,119,0.24),rgba(7,9,8,0.85)_62%,transparent_76%)]'
                      : 'bg-[radial-gradient(circle,rgba(176,54,38,0.28),rgba(7,9,8,0.9)_62%,transparent_76%)]',
                  )}
                />
              )}
              {/* 裂境：中心炸开一圈冲击波（与聚气反向，由内向外扩张） */}
              {(phase === 'crack' || phase === 'rise') && (
                <span
                  className={cn(
                    'block size-[190px] rounded-full border animate-[btShock_0.8s_cubic-bezier(0.16,1,0.3,1)_both]',
                    success
                      ? 'border-gold-200/80 bg-[radial-gradient(circle,rgba(246,230,184,0.32),transparent_66%)]'
                      : 'border-blood-400/80 bg-[radial-gradient(circle,rgba(210,75,58,0.3),transparent_66%)]',
                  )}
                />
              )}
            </span>

            {/* 灵气粒子向中心汇聚 */}
            <span className="absolute inset-0">
              {PARTICLES.map((p) => (
                <span
                  key={`${p.a}-${p.d}`}
                  className={cn(
                    'absolute left-1/2 top-1/2 block size-1.5 rounded-full animate-[btConverge_1.1s_ease-in_both]',
                    success ? 'bg-gold-200 shadow-[0_0_8px_rgba(246,230,184,0.85)]' : 'bg-blood-400',
                  )}
                  style={
                    {
                      animationDelay: `${p.delay}ms`,
                      '--bt-a': `${p.a}deg`,
                      '--bt-d': `${p.d}px`,
                    } as CSSProperties
                  }
                />
              ))}
            </span>
          </div>

          <div
            className={cn(
              'relative flex w-full max-w-[400px] flex-col items-center text-center',
              phase === 'crack' && 'animate-[shake_0.5s_ease-in-out_both]',
            )}
          >
            {bossName && (phase === 'gather' || phase === 'crack') && (
              <p className="mb-5 font-serif text-[11.5px] tracking-[0.2em] text-cream-faint animate-[stageRise_0.6s_ease-out_both]">
                {success ? '试炼' : '心魔'} · {bossName}
              </p>
            )}

            {phase === 'gather' && (
              <p className="font-serif text-[13px] tracking-[0.35em] text-cream-dim/80">
                灵气归拢，气机将发
              </p>
            )}

            {/* 境界文字 */}
            {phase !== 'gather' && phase !== 'crack' && (
              <div className="animate-[stageRise_1.6s_cubic-bezier(0.22,1,0.36,1)_both]">
                <h2
                  className={cn(
                    'font-serif text-[34px] font-bold leading-tight tracking-[0.1em]',
                    success ? 'text-gold-200 text-glow-gold' : 'text-blood-400 text-glow-blood',
                  )}
                >
                  {success ? newLabel : '道途受阻'}
                </h2>
                <p className="mt-3 font-serif text-[12.5px] tracking-[0.14em]">
                  <span className="text-cream-faint/70">{fromLabel}</span>
                  <span
                    className={cn(
                      'mx-2',
                      success ? 'text-gold-300/80' : 'text-blood-500/80',
                    )}
                  >
                    →
                  </span>
                  <span className={success ? 'text-gold-200' : 'text-blood-400/90'}>
                    {success ? newLabel : '未逾此关'}
                  </span>
                </p>
                {!success && (
                  <p className="mt-4 font-serif text-[13px] leading-relaxed text-cream-dim">
                    {failMessage ?? '气机未能贯通，此关暂不可越。'}
                  </p>
                )}
              </div>
            )}

            {/* 收益 / 安抚 */}
            {phase !== 'gather' && phase !== 'crack' && phase !== 'rise' && (
              <div className="mt-8 flex w-full flex-col gap-3">
                {success ? (
                  <>
                    {rewards.length > 0 && (
                      <div className="w-full animate-[lootRise_0.5s_cubic-bezier(0.22,1,0.36,1)_both]">
                        <SectionTitle>折损之物</SectionTitle>
                        <ul className="mt-2.5 flex flex-col gap-1.5">
                          {rewards.map((m, i) => (
                            <li
                              key={`${m.name}-${i}`}
                              className="flex items-center justify-between rounded-sm border border-gold-300/15 bg-ink-900/70 px-3 py-2 font-serif text-[12.5px] animate-[lootRise_0.5s_cubic-bezier(0.22,1,0.36,1)_both]"
                              style={{ animationDelay: `${140 + i * 110}ms` }}
                            >
                              <span className="text-cream-dim">{m.name}</span>
                              <span className="tabular-nums text-blood-400">-{m.count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {unlocks.length > 0 && (
                      <div
                        className="w-full animate-[lootRise_0.5s_cubic-bezier(0.22,1,0.36,1)_both]"
                        style={{ animationDelay: `${140 + rewards.length * 110}ms` }}
                      >
                        <SectionTitle>新启之门</SectionTitle>
                        <ul className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                          {unlocks.map((u, i) => (
                            <li
                              key={u}
                              className="rounded-[3px] border border-gold-300/35 bg-ink-950/70 px-2.5 py-1.5 font-serif text-[12px] text-gold-200 animate-[lootRise_0.5s_cubic-bezier(0.22,1,0.36,1)_both]"
                              style={{
                                animationDelay: `${280 + (rewards.length + i) * 110}ms`,
                              }}
                            >
                              {u}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rewards.length === 0 && unlocks.length === 0 && (
                      <p className="font-serif text-[12.5px] leading-relaxed text-cream-faint animate-[lootRise_0.5s_ease-out_both]">
                        境界自成，此关不假外物。
                      </p>
                    )}
                  </>
                ) : (
                  <div
                    className="w-full animate-[lootRise_0.5s_cubic-bezier(0.22,1,0.36,1)_both]"
                    style={{ animationDelay: '120ms' }}
                  >
                    <div className="rounded-sm border border-jade-500/35 bg-ink-900/75 px-3 py-3">
                      <p className="font-serif text-[13px] tracking-[0.08em] text-jade-300">
                        境界未失 · 修为未散 · 装备无损
                      </p>
                      <p className="mt-2 font-serif text-[11.5px] leading-relaxed text-cream-faint">
                        此关只折一时气力，不夺既得之物。调息片刻，再来叩关。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {phase === 'done' && (
              <div className="mt-9 flex w-full justify-center animate-[stageRise_0.5s_ease-out_both]">
                <InkButton
                  variant={success ? 'primary' : 'danger'}
                  size="lg"
                  onClick={onClose}
                  className="min-h-12 w-full max-w-[280px]"
                >
                  {success ? '稳固境界' : '再候时机'}
                </InkButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
