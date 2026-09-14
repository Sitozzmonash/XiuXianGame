'use client'

/* ------------------------------------------------------------------ *
 * 未开放功能页
 *
 * 洞府 / 宗门 / 排行榜属于后续阶段，配置与状态层都还没有对应数据。
 * 与其显示假数字，这里明确告知玩家功能未开放与它在开发计划里的位置，
 * 并把已经真实生效的机制列出来（例如洞府倍率）。
 * ------------------------------------------------------------------ */

import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GameIcon } from '../GameIcon'
import { InkButton, Panel, SectionTitle } from '../primitives'

export interface ComingSoonItem {
  icon: string
  name: string
  desc: string
}

export function ComingSoon({
  title,
  backdrop,
  chapter,
  summary,
  items,
  /** 已经真实生效、可以现在告诉玩家的机制 */
  activeNote,
  onBack,
}: {
  title: string
  backdrop: string
  /** 该功能在 PRD 开发阶段里的位置，例如「Phase 5 · 长期养成」 */
  chapter: string
  summary: string
  items: ComingSoonItem[]
  activeNote?: ReactNode
  onBack: () => void
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="absolute inset-0">
        <img src={backdrop} alt="" className="size-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/85 to-ink-950" />
      </div>

      <header className="relative z-20 flex items-center gap-2 px-3 pt-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="返回"
          className="relative flex size-7 shrink-0 items-center justify-center rounded-full border border-gold-300/25 bg-ink-950/70 text-cream-dim transition-colors after:absolute after:-inset-1.5 after:content-[''] hover:text-gold-200"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h1 className="font-serif text-base font-bold tracking-wide text-gold-200 text-glow-gold">
          {title}
        </h1>
        <span className="ml-auto font-serif text-[10px] tracking-[0.2em] text-cream-faint">
          {chapter}
        </span>
      </header>

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-3 pb-4 pt-4">
        <Panel className="px-4 py-4 text-center">
          <p className="font-serif text-sm leading-relaxed text-cream-dim">{summary}</p>
        </Panel>

        {activeNote && (
          <Panel className="mt-3 px-4 py-3">
            <p className="mb-2 font-serif text-[11px] tracking-[0.24em] text-jade-300">
              已生效
            </p>
            <div className="text-xs leading-relaxed text-cream-dim">{activeNote}</div>
          </Panel>
        )}

        <SectionTitle className="mt-5">开发计划</SectionTitle>

        <ul className="mt-3 flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.name}
              className={cn(
                'flex items-start gap-3 rounded-sm border border-gold-300/15 px-3 py-2.5',
                'bg-ink-950/60',
              )}
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm bg-ink-900 text-cream-faint ring-1 ring-inset ring-gold-300/15">
                <GameIcon name={it.icon} className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-xs text-cream-dim">{it.name}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-cream-faint">
                  {it.desc}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-center">
          <InkButton variant="ghost" size="md" onClick={onBack}>
            返回
          </InkButton>
        </div>
      </div>
    </div>
  )
}
