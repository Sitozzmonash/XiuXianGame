'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildPlanTabs, buildPlans, QUALITY } from '@/lib/game-data'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { BuildTabs } from '../Tabs'
import { GameIcon } from '../GameIcon'
import { InkButton } from '../primitives'

export function BuildScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<string>(buildPlanTabs[0])
  const [selected, setSelected] = useState('sword')

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="流派方案" onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col gap-3 overflow-hidden px-3 pt-3">
        <BuildTabs
          tabs={buildPlanTabs}
          active={tab}
          onChange={setTab}
          className="shrink-0"
        />

        <div className="flex-1 overflow-y-auto pb-2 no-scrollbar">
          <ul className="flex flex-col gap-2.5">
            {buildPlans.map((plan) => {
              const q = QUALITY[plan.quality]
              const isSelected = plan.id === selected
              return (
                <li key={plan.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(plan.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
                      isSelected
                        ? 'border-gold-300/50 bg-gold-300/10'
                        : 'border-gold-300/15 bg-ink-950/60 hover:border-gold-300/30',
                    )}
                  >
                    <span
                      className="flex size-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-ink-800 to-ink-950"
                      style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}` }}
                    >
                      <GameIcon name={plan.icon} className="size-6 text-cream" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-serif text-sm font-bold text-cream">
                          {plan.name}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-0.5 rounded-[3px] bg-jade-500/20 px-1.5 py-0.5 text-[10px] text-jade-300">
                            <Check className="size-2.5" strokeWidth={3} />
                            当前方案
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block font-serif text-[11px] text-gold-300/80">
                        {plan.tagline}
                      </span>
                      <span className="mt-1 block text-[11px] text-cream-faint">
                        {plan.desc}
                      </span>
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {plan.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-[3px] border border-gold-300/20 px-1.5 py-0.5 text-[10px] text-cream-dim"
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block text-[10px] text-cream-faint">战力</span>
                      <span className="block font-serif text-xs tabular-nums text-gold-200">
                        {(plan.power / 10000).toFixed(1)}万
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <InkButton variant="primary" size="lg" className="shrink-0">
          应用当前方案
        </InkButton>
      </div>
    </ScreenFrame>
  )
}
