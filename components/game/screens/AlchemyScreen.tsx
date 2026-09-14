'use client'

import { useMemo, useState } from 'react'
import { FlaskConical, Pill as PillIcon, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PILLS, PILL_BY_ID } from '@/lib/game/config/pills'
import { QUALITY } from '@/lib/game/ui-tokens'
import { QUALITY_ORDER } from '@/lib/game/types'
import { useGameStore } from '@/lib/game/state/store'
import { formatNumber } from '@/lib/game/utils'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { GameIcon } from '../GameIcon'
import { InkButton, Panel, QualityBadge, SectionTitle } from '../primitives'

const CATEGORY_LABEL: Record<string, string> = {
  cultivation: '修为',
  breakthrough: '突破',
  battle: '战斗',
  permanent: '永久',
}

export function AlchemyScreen({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save)
  const usePill = useGameStore((s) => s.usePill)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)

  const owned = useMemo(
    () =>
      Object.entries(save.inventory.pills)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => ({ def: PILL_BY_ID[id], count: n }))
        .filter((x) => x.def)
        .sort(
          (a, b) =>
            QUALITY_ORDER.indexOf(b.def!.quality) - QUALITY_ORDER.indexOf(a.def!.quality) ||
            a.def!.name.localeCompare(b.def!.name),
        ),
    [save.inventory.pills],
  )

  const flash = (ok: boolean, text: string) => {
    setToast({ ok, text })
    window.setTimeout(() => setToast(null), 2400)
  }

  const handleUse = (id: string, name: string) => {
    const ok = usePill(id, 1)
    if (ok) flash(true, `服下 ${name}，修为精进。`)
    else flash(false, `${name} 暂时无法服用（战斗丹在战斗中自动生效，突破丹在突破时消耗）`)
  }

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="丹房" onBack={onBack} />

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-3 pb-6 pt-3">
        <Panel className="mb-3 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <FlaskConical className="size-4 shrink-0 text-jade-300" />
            <span className="font-serif text-[11px] text-cream-dim">
              囊中丹药 {owned.reduce((a, b) => a + b.count, 0)} 颗
            </span>
            <span className="ml-auto font-serif text-[10px] text-cream-faint">{PILLS.length} 种丹方</span>
          </div>
        </Panel>

        {owned.length === 0 ? (
          <Panel className="px-3 py-6 text-center">
            <p className="font-serif text-[11px] leading-relaxed text-cream-faint">
              还没有丹药。击杀精英与首领、探索秘境或在坊市购买都可获得。
            </p>
          </Panel>
        ) : (
          <ul className="flex flex-col gap-2">
            {owned.map(({ def, count }) => {
              const q = QUALITY[def!.quality]
              const usable = def!.category === 'cultivation'
              return (
                <li
                  key={def!.id}
                  className="flex items-center gap-2.5 rounded-md border border-gold-300/15 bg-ink-950/60 px-3 py-2"
                >
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-gradient-to-b from-ink-800 to-ink-950"
                    style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 10px ${q.glow}` }}
                  >
                    <GameIcon name={def!.icon} className="size-5 text-cream" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-serif text-xs font-bold text-cream">{def!.name}</span>
                      <QualityBadge quality={def!.quality} />
                      <span className="shrink-0 rounded-[3px] border border-gold-300/20 px-1.5 py-0.5 font-serif text-[9px] text-cream-faint">
                        {CATEGORY_LABEL[def!.category] ?? def!.category}
                      </span>
                      <span className="ml-auto shrink-0 font-serif text-[11px] tabular-nums text-gold-200">
                        ×{count}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-cream-faint">
                      {def!.desc}
                    </p>
                    {def!.effect.cultivation ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-jade-300">
                        <Sparkles className="size-2.5" />
                        修为 +{formatNumber(def!.effect.cultivation)}
                      </p>
                    ) : null}
                  </div>
                  <InkButton
                    variant={usable ? 'jade' : 'ghost'}
                    size="sm"
                    className="min-h-9 shrink-0"
                    disabled={!usable}
                    onClick={() => handleUse(def!.id, def!.name)}
                  >
                    <PillIcon className="size-3" />
                    服用
                  </InkButton>
                </li>
              )
            })}
          </ul>
        )}

        <SectionTitle className="mb-2 mt-5">丹方一览</SectionTitle>
        <ul className="flex flex-col gap-1.5">
          {PILLS.map((p) => {
            const have = save.inventory.pills[p.id] ?? 0
            const q = QUALITY[p.quality]
            return (
              <li
                key={p.id}
                className={cn(
                  'flex items-center gap-2 rounded-sm border px-2.5 py-1.5',
                  have > 0 ? 'border-gold-300/15 bg-ink-950/60' : 'border-gold-300/8 bg-ink-950/30',
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: q.ring, boxShadow: `0 0 6px ${q.glow}` }}
                />
                <span className={cn('min-w-0 flex-1 truncate font-serif text-[11px]', have > 0 ? 'text-cream-dim' : 'text-cream-faint/70')}>
                  {p.name}
                </span>
                <span className="shrink-0 font-serif text-[10px] text-cream-faint">
                  {CATEGORY_LABEL[p.category] ?? p.category}
                </span>
                <span className="w-10 shrink-0 text-right font-serif text-[10px] tabular-nums text-cream-faint">
                  {have > 0 ? `×${have}` : '—'}
                </span>
              </li>
            )
          })}
        </ul>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-cream-faint/70">
          炼丹房（以丹材自行炼制的玩法）随洞府一起开发中；当前丹药来源为战斗掉落、秘境与坊市。
        </p>

        {toast && (
          <p
            className={cn(
              'mt-3 rounded-sm border px-3 py-2 text-center text-[11px] leading-relaxed',
              toast.ok
                ? 'border-jade-500/30 bg-jade-800/25 text-jade-200'
                : 'border-gold-300/25 bg-ink-950/70 text-cream-dim',
            )}
          >
            {toast.text}
          </p>
        )}
      </div>
    </ScreenFrame>
  )
}
