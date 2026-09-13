'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Combine } from 'lucide-react'
import { QUALITY, techniqueTabs, techniques } from '@/lib/game-data'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { BuildTabs } from '../Tabs'
import { GameIcon } from '../GameIcon'
import { InkButton } from '../primitives'

export function TechniqueScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<string>(techniqueTabs[0])

  const list = useMemo(
    () =>
      tab === '全部'
        ? techniques
        : techniques.filter((t) => t.school === tab),
    [tab],
  )

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="功法" onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col gap-3 overflow-hidden px-3 pt-3">
        <BuildTabs
          tabs={techniqueTabs}
          active={tab}
          onChange={setTab}
          className="shrink-0"
        />

        <div className="flex-1 overflow-y-auto pb-2 no-scrollbar">
          <ul className="flex flex-col gap-2.5">
            {list.map((tech) => {
              const q = QUALITY[tech.quality]
              return (
                <li
                  key={tech.id}
                  className="flex items-start gap-3 rounded-md border border-gold-300/15 bg-ink-950/60 p-3"
                >
                  <span
                    className="flex size-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-ink-800 to-ink-950"
                    style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}` }}
                  >
                    <GameIcon name={tech.icon} className="size-6 text-cream" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-sm font-bold text-cream">
                        {tech.name}
                      </span>
                      <span className="rounded-[3px] bg-ink-800 px-1.5 py-0.5 text-[10px] text-gold-200">
                        Lv.{tech.level}
                      </span>
                      <span
                        className="rounded-[3px] px-1.5 py-0.5 text-[10px]"
                        style={{ color: q.text, background: 'rgba(7,9,8,0.7)' }}
                      >
                        {tech.school}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-cream-faint">{tech.desc}</p>
                    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {tech.effects.map((e) => (
                        <li key={e} className="text-[10px] text-jade-300">
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <InkButton variant="primary" size="sm" className="shrink-0 self-center">
                    升级
                  </InkButton>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <InkButton variant="ghost" size="md" className="flex-1">
            <BookOpen className="size-3.5" />
            功法图鉴
          </InkButton>
          <InkButton variant="jade" size="md" className="flex-1">
            <Combine className="size-3.5" />
            功法合成
          </InkButton>
        </div>
      </div>
    </ScreenFrame>
  )
}
