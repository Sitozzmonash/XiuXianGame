'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { npcName } from '@/lib/game/config/story'
import type { StoryNode } from '@/lib/game/types'

export interface EncounterOverlayProps {
  open: boolean
  node: StoryNode | null
  onChoose: (choiceId: string) => void
  getChoiceState: (choiceId: string) => { enabled: boolean; reason?: string }
  onClose: () => void
}

/** 朱砂印章：奇遇的一眼可辨标识 */
function Seal({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        'flex size-11 rotate-[-6deg] items-center justify-center rounded-[4px] font-serif text-[15px] font-bold tracking-tight',
        'text-cream shadow-[0_2px_10px_rgba(0,0,0,0.5)]',
        className,
      )}
      style={{
        background: 'linear-gradient(160deg, rgba(210,75,58,0.95), rgba(125,36,24,0.95))',
        boxShadow: 'inset 0 0 0 1.5px rgba(242,234,216,0.55), 0 2px 12px rgba(0,0,0,0.55)',
      }}
      aria-hidden="true"
    >
      {text}
    </span>
  )
}

export function EncounterOverlay({
  open,
  node,
  onChoose,
  getChoiceState,
  onClose,
}: EncounterOverlayProps) {
  const [visibleLines, setVisibleLines] = useState(1)

  useEffect(() => {
    setVisibleLines(1)
  }, [node?.id])

  useEffect(() => {
    if (!open || !node || visibleLines >= node.lines.length) return
    const t = window.setTimeout(() => setVisibleLines((n) => n + 1), 420)
    return () => window.clearTimeout(t)
  }, [open, node, visibleLines])

  if (!open || !node) return null

  const lines = node.lines.slice(0, visibleLines)
  const choices = node.choices ?? []
  const ready = visibleLines >= node.lines.length

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink-950/85 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={node.title}
    >
      <div className="ink-vignette pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-[400px] animate-rise">
        {/* 卷轴木牌 */}
        <div className="relative rounded-md border border-gold-500/40 bg-[linear-gradient(180deg,rgba(242,234,216,0.97),rgba(206,193,166,0.95))] px-4 pb-4 pt-6 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          <span className="pointer-events-none absolute inset-x-2 top-2 h-px bg-gold-600/25" />
          <span className="pointer-events-none absolute inset-x-2 bottom-2 h-px bg-gold-600/25" />

          <div className="absolute -left-2 -top-5">
            <Seal text="奇遇" className="text-[12px]" />
          </div>

          <div className="flex items-start justify-between gap-3 pl-10">
            <h2 className="font-serif text-[17px] font-bold tracking-[0.15em] text-ink-900">
              {node.title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="暂离"
              className="shrink-0 rounded-sm border border-gold-600/40 px-1.5 py-0.5 font-serif text-[10px] text-gold-600 transition-colors hover:bg-gold-600/10"
            >
              暂离
            </button>
          </div>

          <ul className="mt-3 flex flex-col gap-1.5 pl-1">
            {lines.map((l, i) => (
              <li
                key={`${i}-${l.speaker}`}
                className={cn(
                  'font-serif text-[13.5px] leading-relaxed animate-rise',
                  l.speaker === 'narration' ? 'text-gold-600/90 italic' : 'text-ink-800',
                )}
              >
                {l.speaker !== 'narration' && l.speaker !== 'player' && (
                  <span className="mr-1 text-gold-600">{npcName(l.speaker)}：</span>
                )}
                {l.speaker === 'player' && (
                  <span className="mr-1 text-jade-700">你：</span>
                )}
                {l.text}
              </li>
            ))}
          </ul>
        </div>

        {/* 选择 */}
        {ready && choices.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {choices.map((c, idx) => {
              const st = getChoiceState(c.id)
              const req = c.requirements?.length
                ? `${c.requirements.length} 项条件`
                : undefined
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!st.enabled}
                  onClick={() => st.enabled && onChoose(c.id)}
                  className={cn(
                    'group relative w-full overflow-hidden rounded-sm px-3 py-2.5 text-left transition-all duration-200',
                    'border border-gold-300/30 bg-[linear-gradient(180deg,rgba(26,34,31,0.96),rgba(9,12,11,0.98))]',
                    'hover:border-gold-300/70 active:scale-[0.99]',
                    !st.enabled && 'opacity-55',
                  )}
                >
                  <span className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-blood-500/80" />
                  <span className="flex items-center gap-2 pl-2.5">
                    <span className="font-serif text-[12px] text-gold-300/70">
                      {['甲', '乙', '丙', '丁'][idx] ?? '·'}
                    </span>
                    <span className="flex-1 font-serif text-[13.5px] tracking-wide text-cream">
                      {c.text}
                    </span>
                  </span>
                  {(req || (!st.enabled && st.reason)) && (
                    <span
                      className={cn(
                        'mt-1 block pl-2.5 font-serif text-[11px]',
                        st.enabled ? 'text-cream-faint/70' : 'text-blood-400/90',
                      )}
                    >
                      {st.enabled ? `需满足：${req}` : st.reason}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
