'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { npcById, npcName } from '@/lib/game/config/story'
import type { NpcDef, StoryLine, StoryNode } from '@/lib/game/types'

const TYPE_MS = 30
const AUTO_DELAY = 1500

type Mood = NonNullable<StoryLine['mood']>

export interface StoryOverlayProps {
  open: boolean
  node: StoryNode | null
  onClose: () => void
  onChoose: (choiceId: string) => void
  getChoiceState: (choiceId: string) => { enabled: boolean; reason?: string }
}

/* ------------------------------------------------------------------ */
/* 立绘：图片缺失时回退为水墨剪影，不出现破图                            */
/* ------------------------------------------------------------------ */

function Silhouette({ name, glow }: { name: string; glow: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end">
      <div
        className="relative h-[72%] w-[86%] rounded-t-[46%] opacity-90"
        style={{
          background:
            'radial-gradient(60% 70% at 50% 88%, rgba(19,25,23,0.98) 0%, rgba(13,17,16,0.92) 55%, rgba(7,9,8,0.2) 100%)',
          boxShadow: glow
            ? 'inset 0 0 40px rgba(232,200,119,0.18), 0 0 26px rgba(232,200,119,0.12)'
            : 'inset 0 0 30px rgba(0,0,0,0.6)',
        }}
      />
      <span className="absolute bottom-5 font-serif text-[15px] tracking-[0.4em] text-cream-dim/80">
        {name}
      </span>
    </div>
  )
}

function Portrait({
  npc,
  mood,
  active,
  side,
}: {
  npc: NpcDef
  mood: Mood
  active: boolean
  side: 'left' | 'right'
}) {
  const [broken, setBroken] = useState(false)
  const src = npc.moods?.[mood] ?? npc.portrait

  useEffect(() => {
    setBroken(false)
  }, [src])

  return (
    <div
      className={cn(
        'relative h-full w-1/2 transition-all duration-500 ease-out',
        active ? 'opacity-100 saturate-100' : 'opacity-55 saturate-[0.6]',
        active ? 'translate-y-0' : 'translate-y-2',
        side === 'right' && 'scale-x-[-1]',
      )}
    >
      {broken || !src ? (
        <Silhouette name={npc.name} glow={active} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={npc.name}
          onError={() => setBroken(true)}
          className={cn(
            'absolute inset-0 size-full object-contain object-bottom',
            active
              ? 'drop-shadow-[0_0_20px_rgba(232,200,119,0.25)]'
              : 'drop-shadow-[0_0_12px_rgba(0,0,0,0.7)]',
          )}
        />
      )}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background: 'linear-gradient(to top, rgba(7,9,8,0.95), transparent)',
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 剧情对话 Overlay                                                     */
/* ------------------------------------------------------------------ */

export function StoryOverlay({
  open,
  node,
  onClose,
  onChoose,
  getChoiceState,
}: StoryOverlayProps) {
  const [lineIndex, setLineIndex] = useState(0)
  const [typed, setTyped] = useState(0)
  const [auto, setAuto] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [readLines, setReadLines] = useState<StoryLine[]>([])
  // 打字机定时器存 ref：避免定时器本身进入依赖导致反复重建
  const timerRef = useRef<number | null>(null)

  const lines = node?.lines ?? []
  const line = lines[Math.min(lineIndex, Math.max(0, lines.length - 1))] as StoryLine | undefined
  const text = line?.text ?? ''
  const typing = typed < text.length
  const isLastLine = lineIndex >= lines.length - 1

  useEffect(() => {
    setLineIndex(0)
    setTyped(0)
    setReadLines([])
    setHistoryOpen(false)
  }, [node?.id])

  useEffect(() => {
    if (!open || !line) return
    setTyped(0)
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      setTyped((n) => {
        if (n >= line.text.length) {
          if (timerRef.current) window.clearInterval(timerRef.current)
          return n
        }
        return n + 1
      })
    }, TYPE_MS)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [open, line])

  useEffect(() => {
    if (!line || typing) return
    setReadLines((prev) => (prev[prev.length - 1] === line ? prev : [...prev, line]))
  }, [line, typing])

  const advance = useCallback(() => {
    if (!node || !line) return
    if (typing) {
      setTyped(line.text.length)
      return
    }
    if (!isLastLine) {
      setLineIndex((i) => i + 1)
      return
    }
    if (!node.choices || node.choices.length === 0) onClose()
  }, [node, line, typing, isLastLine, onClose])

  useEffect(() => {
    if (!auto || !node || !line || typing) return
    if (isLastLine && node.choices && node.choices.length > 0) return
    const t = window.setTimeout(advance, AUTO_DELAY)
    return () => window.clearTimeout(t)
  }, [auto, node, line, typing, isLastLine, advance])

  const leftNpc = useMemo(() => {
    if (!node) return undefined
    if (node.npc) return npcById(node.npc)
    const speaker = lines.find(
      (l) => l.speaker !== 'player' && l.speaker !== 'narration',
    )?.speaker
    return speaker ? npcById(speaker) : undefined
  }, [node, lines])

  const speakerIsNpc =
    !!line && line.speaker !== 'player' && line.speaker !== 'narration'
  const mood: Mood = line?.mood ?? 'normal'

  const choices = node?.choices ?? []
  const showChoices = !typing && isLastLine && choices.length > 0 && !historyOpen

  if (!open || !node) return null

  return (
    <div
      className="absolute inset-0 z-50 overflow-hidden bg-ink-950/85 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={node.title}
    >
      <div className="ink-vignette pointer-events-none absolute inset-0 opacity-80" />

      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col">
        {/* 顶部信息与操作 */}
        <header className="flex items-center gap-2 px-4 pt-4">
          <span className="rounded-sm border border-gold-300/25 bg-ink-950/70 px-2 py-0.5 font-serif text-[10px] tracking-[0.2em] text-gold-300/80">
            第 {node.chapter} 章
          </span>
          <h2 className="flex-1 truncate font-serif text-sm tracking-[0.15em] text-cream-dim">
            {node.title}
          </h2>
          <button
            type="button"
            onClick={() => setAuto((v) => !v)}
            className={cn(
              'rounded-sm border px-2 py-0.5 font-serif text-[11px] transition-colors',
              auto
                ? 'border-jade-400/60 bg-jade-800/50 text-jade-200'
                : 'border-gold-300/25 text-cream-faint hover:text-cream',
            )}
          >
            自动{auto ? '·开' : '·关'}
          </button>
          <button
            type="button"
            onClick={() => {
              setLineIndex(Math.max(0, lines.length - 1))
              setTyped(Number.MAX_SAFE_INTEGER)
            }}
            className="rounded-sm border border-gold-300/25 px-2 py-0.5 font-serif text-[11px] text-cream-faint transition-colors hover:text-cream"
          >
            跳过
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className={cn(
              'rounded-sm border px-2 py-0.5 font-serif text-[11px] transition-colors',
              historyOpen
                ? 'border-jade-400/60 text-jade-200'
                : 'border-gold-300/25 text-cream-faint hover:text-cream',
            )}
          >
            史
          </button>
        </header>

        {/* 立绘舞台 */}
        <div className="relative flex flex-1 items-end justify-between gap-1 overflow-hidden px-1">
          {leftNpc ? (
            <Portrait npc={leftNpc} mood={mood} active={speakerIsNpc} side="left" />
          ) : (
            <div className="h-full w-1/2" />
          )}
          <div
            className={cn(
              'relative h-full w-1/2 transition-opacity duration-500',
              line?.speaker === 'player' ? 'opacity-100' : 'opacity-45',
            )}
          >
            <Silhouette name="你" glow={line?.speaker === 'player'} />
          </div>
        </div>

        {/* 历史记录 */}
        {historyOpen && (
          <div className="absolute inset-x-0 bottom-0 top-14 z-20 mx-3 mb-3 overflow-y-auto rounded-md panel-parchment px-4 py-3 no-scrollbar animate-rise">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-serif text-xs tracking-[0.3em] text-gold-600">
                已读对话
              </span>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="font-serif text-xs text-gold-600/80"
              >
                收起
              </button>
            </div>
            {readLines.length === 0 && (
              <p className="font-serif text-xs text-gold-600/70">尚未读到任何一句。</p>
            )}
            <ul className="flex flex-col gap-2">
              {readLines.map((l, i) => (
                <li key={`${i}-${l.speaker}`} className="font-serif text-[13px] leading-relaxed">
                  {l.speaker !== 'narration' && (
                    <span className="mr-1 text-gold-600">
                      {npcName(l.speaker) || l.speaker}：
                    </span>
                  )}
                  <span className={l.speaker === 'narration' ? 'text-gold-600/80 italic' : 'text-ink-900'}>
                    {l.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 选择 */}
        {showChoices && (
          <div className="relative z-10 flex flex-col gap-2 px-4 pb-2 animate-rise">
            {choices.map((c) => {
              const st = getChoiceState(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!st.enabled}
                  onClick={() => st.enabled && onChoose(c.id)}
                  className={cn(
                    'group relative w-full overflow-hidden rounded-sm px-3 py-2.5 text-left transition-all duration-200',
                    'panel-ink hover:border-gold-300/60 active:scale-[0.99]',
                    !st.enabled && 'opacity-55',
                  )}
                >
                  <span className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-blood-400/80 to-gold-500/70" />
                  <span className="flex items-center justify-between gap-2 pl-2">
                    <span className="font-serif text-[13px] tracking-wide text-cream">
                      {c.text}
                    </span>
                    {!st.enabled && st.reason && (
                      <span className="shrink-0 font-serif text-[11px] text-blood-400/90">
                        {st.reason}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* 对话框 */}
        <div
          className="relative z-10 m-3 cursor-pointer rounded-md panel-ink px-4 pb-4 pt-5 animate-rise"
          onClick={advance}
          role="presentation"
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/50 to-transparent" />
          {line && line.speaker !== 'narration' && (
            <span className="absolute -top-3 left-3 rounded-sm border border-gold-400/50 bg-gradient-to-b from-ink-800 to-ink-950 px-2.5 py-0.5 font-serif text-xs tracking-[0.2em] text-gold-200 text-glow-gold">
              {npcName(line.speaker) || line.speaker}
            </span>
          )}
          <p
            className={cn(
              'min-h-[3.6rem] font-serif text-[14px] leading-[1.9]',
              line?.speaker === 'narration'
                ? 'italic text-cream-faint'
                : 'text-cream',
            )}
          >
            {text.slice(0, Math.min(typed, text.length))}
            {typing && <span className="ml-0.5 animate-pulse-glow text-gold-300">▎</span>}
          </p>

          <div className="mt-2 flex items-center justify-between">
            <span className="font-serif text-[10px] tracking-[0.2em] text-cream-faint/70">
              {lineIndex + 1} / {Math.max(1, lines.length)}
            </span>
            {!typing && (
              <span className="font-serif text-[11px] text-gold-300/80">
                {showChoices
                  ? '请择其一'
                  : isLastLine
                    ? '点击结束'
                    : '点击继续 ▸'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
