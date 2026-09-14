'use client'

import { ChevronLeft, ChevronRight, Skull } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/lib/game/state/store'
import { stageView, mapProgressList } from '@/lib/game/state/selectors'

export function StageProgress({
  progress,
  total,
  className,
}: {
  progress: number
  total: number
  className?: string
}) {
  const nodes = 5
  const filled = Math.round((progress / Math.max(1, total)) * nodes)
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {Array.from({ length: nodes }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'size-2 rounded-full transition-colors',
            i < filled
              ? 'bg-jade-300 shadow-[0_0_6px_rgba(138,217,200,0.7)]'
              : 'bg-ink-700 ring-1 ring-inset ring-gold-300/20',
          )}
        />
      ))}
      <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-blood-500/90 text-cream">
        <Skull className="size-3" />
      </span>
    </div>
  )
}

export function ChapterHeader({
  onPrev,
  onNext,
  className,
}: {
  onPrev?: () => void
  onNext?: () => void
  className?: string
}) {
  const save = useGameStore((s) => s.save)
  const view = stageView(save)
  const maps = mapProgressList(save)
  const currentMap = maps.find((m) => m.id === view.mapId)
  const totalStages = currentMap?.total ?? 50

  return (
    <div className={cn('relative z-20 flex flex-col items-center gap-1.5', className)}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          aria-label="上一章"
          className="flex size-6 items-center justify-center rounded-full border border-gold-300/25 bg-ink-950/70 text-cream-dim transition-colors hover:text-gold-200"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <div className="relative rounded-sm border border-gold-300/40 bg-gradient-to-b from-ink-800/95 to-ink-950/95 px-4 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.6)]">
          <span className="font-serif text-sm font-bold tracking-wide text-gold-200 text-glow-gold">
            第{String(view.chapter).padStart(2, '0')}章 {view.mapName}
          </span>
        </div>
        <button
          type="button"
          onClick={onNext}
          aria-label="下一章"
          className="flex size-6 items-center justify-center rounded-full border border-gold-300/25 bg-ink-950/70 text-cream-dim transition-colors hover:text-gold-200"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <StageProgress progress={view.mapStage} total={totalStages} />
        <span className="font-serif text-[11px] text-cream-dim">
          关卡进度 {view.mapStage}/{totalStages}
        </span>
      </div>

      <p className="font-serif text-[11px] tracking-widest text-cream-faint">
        {currentMap?.poem ?? ''}
      </p>

      <div className="mt-0.5 flex items-center gap-1.5">
        {maps.map((m) => (
          <span
            key={m.id}
            className={cn(
              'h-0.5 w-5 rounded-full',
              m.id === view.mapId
                ? 'bg-gold-300'
                : m.cleared
                  ? 'bg-jade-500/70'
                  : 'bg-ink-700',
            )}
          />
        ))}
      </div>
    </div>
  )
}
