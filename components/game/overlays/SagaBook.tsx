'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { KARMA_LABEL, type GameSave, type KarmaKey } from '@/lib/game/types'
import { CHAPTERS, NPCS, npcById, relationStage } from '@/lib/game/config/story'
import { SectionTitle, StatBar } from '@/components/game/primitives'

export interface SagaBookProps {
  open: boolean
  onClose: () => void
  save: GameSave
}

type TabId = 'chapter' | 'karma' | 'npc'

const TABS: { id: TabId; label: string }[] = [
  { id: 'chapter', label: '章节' },
  { id: 'karma', label: '因果' },
  { id: 'npc', label: '人物' },
]

/** 因果变量的参照上限，仅用于把进度条画满，不代表硬上限 */
const KARMA_SCALE: Record<KarmaKey, number> = {
  daoHeart: 20,
  demonThought: 20,
  immortalErosion: 20,
  jadeResonance: 20,
  taixuAttention: 20,
  qingxuanFame: 30,
  yaozuFame: 30,
  youmingFame: 30,
  jadeShards: 9,
}

const KARMA_KEYS = Object.keys(KARMA_LABEL) as KarmaKey[]

export function SagaBook({ open, onClose, save }: SagaBookProps) {
  const [tab, setTab] = useState<TabId>('chapter')

  if (!open) return null

  const reachedChapter = Math.max(1, Math.ceil(Math.max(1, save.progress.maxStage) / 50))
  const unlocked = (id: number) =>
    id === 1 || save.story.chapterStage >= id || reachedChapter >= id

  const encountersDone = Math.max(
    save.stats.encountersDone,
    save.story.encounterHistory.length,
  )

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink-950/85 p-3 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="仙途录"
    >
      <div className="ink-vignette pointer-events-none absolute inset-0" />

      <div className="relative flex h-full max-h-[86vh] w-full max-w-[410px] flex-col overflow-hidden rounded-lg panel-ink animate-rise">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/60 to-transparent" />

        <header className="flex items-center justify-between gap-3 border-b border-gold-300/15 px-4 py-3">
          <div>
            <h2 className="font-serif text-base font-bold tracking-[0.3em] text-gold-200 text-glow-gold">
              仙途录
            </h2>
            <p className="mt-0.5 font-serif text-[11px] text-cream-faint">
              已历奇遇 {encountersDone} 次 · 阅历 {save.stats.kills} 战
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-gold-300/25 px-2 py-1 font-serif text-[11px] text-cream-dim transition-colors hover:border-gold-300/60 hover:text-cream"
          >
            收起
          </button>
        </header>

        {/* Tab */}
        <nav className="flex items-center gap-1 px-3 pt-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 rounded-sm border px-2 py-1.5 font-serif text-xs tracking-[0.2em] transition-all',
                tab === t.id
                  ? 'border-gold-300/60 bg-ink-800/80 text-gold-200'
                  : 'border-gold-300/15 text-cream-faint hover:text-cream-dim',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-4 pb-5 pt-4 no-scrollbar">
          {tab === 'chapter' && (
            <div className="flex flex-col gap-3">
              {CHAPTERS.map((c) => {
                const open_ = unlocked(c.id)
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'rounded-md border px-3 py-2.5',
                      open_
                        ? 'border-gold-300/25 bg-ink-850/70'
                        : 'border-gold-300/10 bg-ink-950/60',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-serif text-[11px] tracking-[0.2em]',
                          open_ ? 'text-gold-300/90' : 'text-cream-faint/60',
                        )}
                      >
                        第{c.id}章
                      </span>
                      <h3
                        className={cn(
                          'font-serif text-[13.5px]',
                          open_ ? 'text-cream' : 'text-cream-faint/60',
                        )}
                      >
                        {open_ ? c.name : '尚未踏足'}
                      </h3>
                    </div>
                    {open_ ? (
                      <>
                        <p className="mt-1.5 font-serif text-[12px] italic leading-relaxed text-jade-300/80">
                          {c.poem}
                        </p>
                        <p className="mt-1.5 font-serif text-[12.5px] leading-relaxed text-cream-dim">
                          {c.summary}
                        </p>
                        <p className="mt-1.5 font-serif text-[11px] text-cream-faint">
                          {c.unlockText}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1.5 font-serif text-[12px] text-cream-faint/60">
                        推关至此，方见其名。
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'karma' && (
            <div className="flex flex-col gap-3.5">
              <SectionTitle>因果加身</SectionTitle>
              {KARMA_KEYS.map((k) => {
                const v = save.karma[k] ?? 0
                const scale = KARMA_SCALE[k]
                return (
                  <div key={k}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="font-serif text-[12.5px] text-cream-dim">
                        {KARMA_LABEL[k]}
                      </span>
                      <span
                        className={cn(
                          'font-serif text-xs tabular-nums',
                          v > 0 ? 'text-gold-200' : 'text-cream-faint',
                        )}
                      >
                        {v}
                      </span>
                    </div>
                    <StatBar
                      value={Math.min(1, Math.max(0, v / scale))}
                      barClassName={
                        k === 'demonThought' || k === 'immortalErosion'
                          ? 'bg-gradient-to-r from-blood-600 to-blood-400'
                          : k === 'jadeResonance' || k === 'jadeShards'
                            ? 'bg-gradient-to-r from-gold-500 to-gold-300'
                            : 'bg-gradient-to-r from-jade-500 to-jade-300'
                      }
                    />
                  </div>
                )
              })}
              <p className="mt-1 font-serif text-[11px] leading-relaxed text-cream-faint/70">
                多数选择无关对错，只记代价。部分因果不会在此显形。
              </p>
            </div>
          )}

          {tab === 'npc' && (
            <div className="flex flex-col gap-2.5">
              {NPCS.map((n) => {
                const rec = save.npcs[n.id]
                const relation = rec?.relation ?? n.initialRelation
                const met = rec !== undefined || n.initialRelation > 0
                const alive = rec?.alive !== false
                return (
                  <div
                    key={n.id}
                    className="rounded-md border border-gold-300/15 bg-ink-850/60 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif text-[13px] text-cream">
                        {met ? n.name : '未识之人'}
                      </span>
                      <span className="flex items-center gap-2">
                        {!alive && (
                          <span className="rounded-sm border border-blood-500/50 px-1.5 font-serif text-[10px] text-blood-400">
                            已殁
                          </span>
                        )}
                        <span className="font-serif text-[11px] tracking-[0.15em] text-gold-300/85">
                          {met ? relationStage(npcById(n.id), relation) : '—'}
                        </span>
                      </span>
                    </div>
                    {met && (
                      <>
                        <div className="mt-1.5">
                          <StatBar
                            value={Math.min(1, Math.max(0, (relation + 100) / 200))}
                            height="h-1"
                            barClassName={
                              relation >= 0
                                ? 'bg-gradient-to-r from-jade-600 to-jade-300'
                                : 'bg-gradient-to-r from-blood-600 to-blood-400'
                            }
                          />
                        </div>
                        <p className="mt-1.5 font-serif text-[11.5px] leading-relaxed text-cream-faint">
                          {n.desc}
                        </p>
                        {rec?.state && (
                          <p className="mt-1 font-serif text-[11px] text-jade-300/70">
                            近况：{rec.state}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
