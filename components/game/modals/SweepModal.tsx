'use client'

import { Coins, Sparkles, Swords } from 'lucide-react'
import type { SweepResult } from '@/lib/game/engine/battle'
import { formatNumber } from '@/lib/game/utils'
import { cn } from '@/lib/utils'
import { GameModal } from '../GameModal'
import { InkButton } from '../primitives'

/* 一键扫荡的结算弹窗：展示胜场与收益（引擎 sweep 的结果） */
export function SweepModal({
  open,
  result,
  onClose,
}: {
  open: boolean
  result: SweepResult | null
  onClose: () => void
}) {
  return (
    <GameModal
      open={open}
      onClose={onClose}
      title="一键扫荡"
      subtitle={result ? `第 ${result.stage} 关 × ${result.times}` : undefined}
      footer={
        <InkButton variant="primary" size="lg" className="w-full" onClick={onClose}>
          收下
        </InkButton>
      }
    >
      {result && (
        <>
          <div className="mb-3 flex items-center gap-2 rounded-md border border-gold-300/15 bg-ink-950/60 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blood-500/15 text-blood-400">
              <Swords className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-[10px] text-cream-faint">胜场</span>
              <span className="block font-serif text-sm font-bold tabular-nums text-cream">
                {result.wins} / {result.times}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-serif text-[10px] text-cream-faint">折合战斗时长</span>
              <span className="block font-serif text-sm font-bold tabular-nums text-cream-dim">
                {Math.round(result.duration)} 秒
              </span>
            </span>
          </div>

          <div className="mb-3 flex gap-2">
            <span className="flex flex-1 items-center gap-2 rounded-md border border-gold-300/15 bg-ink-950/60 px-3 py-2">
              <Coins className="size-4 shrink-0 text-gold-300" />
              <span className="min-w-0">
                <span className="block font-serif text-[10px] text-cream-faint">灵石</span>
                <span className="block font-serif text-sm font-bold tabular-nums text-gold-200">
                  +{formatNumber(result.stone)}
                </span>
              </span>
            </span>
            <span className="flex flex-1 items-center gap-2 rounded-md border border-gold-300/15 bg-ink-950/60 px-3 py-2">
              <Sparkles className="size-4 shrink-0 text-jade-300" />
              <span className="min-w-0">
                <span className="block font-serif text-[10px] text-cream-faint">修为</span>
                <span className="block font-serif text-sm font-bold tabular-nums text-jade-300">
                  +{formatNumber(result.cultivation)}
                </span>
              </span>
            </span>
          </div>

          {result.drops.length > 0 ? (
            <div className="rounded-md border border-gold-300/12 bg-ink-950/60 px-3 py-2.5">
              <p className="mb-2 font-serif text-[10px] text-cream-faint">掉落已入囊</p>
              <ul className="flex flex-col gap-1.5">
                {result.drops.slice(0, 10).map((d, i) => (
                  <li
                    key={`${d.kind}-${d.id ?? i}`}
                    className="flex items-center gap-2 text-[11px] text-cream-dim"
                  >
                    <span className="size-1 shrink-0 rounded-full bg-gold-300/60" />
                    <span className="truncate font-serif">{d.label}</span>
                    {d.count > 1 && (
                      <span className="ml-auto shrink-0 font-serif text-[10px] text-cream-faint">
                        ×{d.count}
                      </span>
                    )}
                  </li>
                ))}
                {result.drops.length > 10 && (
                  <li className="text-[10px] text-cream-faint">
                    …另有 {result.drops.length - 10} 项
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <p
              className={cn(
                'rounded-md border px-3 py-2 text-[11px] leading-relaxed',
                result.wins > 0
                  ? 'border-gold-300/12 bg-ink-950/60 text-cream-faint'
                  : 'border-blood-500/30 bg-blood-600/15 text-blood-400',
              )}
            >
              {result.wins > 0
                ? '本次扫荡没有掉落，再扫一次试试。'
                : '扫荡全败：当前战力不足以快速碾过这一关，去提升修为或换一身装备吧。'}
            </p>
          )}
        </>
      )}
    </GameModal>
  )
}
