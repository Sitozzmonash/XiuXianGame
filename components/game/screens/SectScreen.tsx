'use client'

import { sect } from '@/lib/game-data'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { GameIcon } from '../GameIcon'
import { InkButton, StatBar } from '../primitives'

export function SectScreen({ onBack }: { onBack: () => void }) {
  const ratio = sect.contribution / sect.contributionMax

  return (
    <ScreenFrame backdrop="/images/sect-gate.png">
      <SubHeader title="宗门" onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col gap-3 overflow-y-auto px-3 pt-3 pb-4 no-scrollbar">
        <div className="flex items-center gap-3 rounded-md border border-gold-300/20 bg-ink-950/70 p-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-md border border-gold-300/40 bg-gradient-to-b from-ink-800 to-ink-950 text-gold-200">
            <GameIcon name="lotus" className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg font-bold text-gold-200 text-glow-gold">
              {sect.name}
            </p>
            <p className="mt-0.5 text-[11px] text-cream-faint">
              宗门等级：{sect.level} 级
            </p>
            <p className="text-[11px] text-cream-faint">
              宗门成员：{sect.members} / {sect.membersMax}
            </p>
            <p className="text-[11px] text-jade-300">我的职位：{sect.role}</p>
          </div>
        </div>

        <div className="rounded-md border border-gold-300/15 bg-ink-950/60 p-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="text-cream-faint">宗门贡献</span>
            <span className="tabular-nums text-cream-dim">
              {sect.contribution} / {sect.contributionMax}
            </span>
          </div>
          <StatBar value={ratio} height="h-1.5" />
        </div>

        <ul className="grid grid-cols-4 gap-2">
          {sect.functions.map((fn) => (
            <li key={fn.id}>
              <button
                type="button"
                className="flex w-full flex-col items-center gap-1.5 rounded-md border border-gold-300/15 bg-ink-950/60 py-3 transition-colors hover:border-gold-300/40"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-ink-800 text-gold-200">
                  <GameIcon name={fn.icon} className="size-4.5" />
                </span>
                <span className="font-serif text-[10px] text-cream-dim">
                  {fn.label}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-md border border-gold-300/15 bg-ink-950/60 p-3">
          <p className="mb-1.5 font-serif text-xs tracking-widest text-gold-300/80">
            宗门公告
          </p>
          <p className="text-[11px] leading-relaxed text-cream-dim">{sect.notice}</p>
        </div>

        <InkButton variant="primary" size="lg" className="mt-auto">
          进入宗门
        </InkButton>
      </div>
    </ScreenFrame>
  )
}
