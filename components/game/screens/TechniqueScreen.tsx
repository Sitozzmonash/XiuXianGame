'use client'

import { useMemo, useState } from 'react'
import { Check, PawPrint } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SCHOOL_LABEL, type School } from '@/lib/game/types'
import { TECHNIQUES } from '@/lib/game/config/techniques'
import { PET_BY_ID } from '@/lib/game/config/pets'
import { useGameStore } from '@/lib/game/state/store'
import { schoolName } from '@/lib/game/state/selectors'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { BuildTabs } from '../Tabs'
import { GameIcon } from '../GameIcon'
import { InkButton, Panel, QualityBadge, SectionTitle } from '../primitives'
import { petView, qualityView, statRows, techniqueView } from '../viewModels'

const SCHOOL_TABS = [
  { label: '全部', school: null },
  { label: '剑诀', school: 'sword' },
  { label: '法术', school: 'spell' },
  { label: '体术', school: 'body' },
  { label: '魔功', school: 'demon' },
] as const satisfies readonly { label: string; school: School | null }[]

const TAB_LABELS: readonly string[] = SCHOOL_TABS.map((t) => t.label)

const ORDINAL = ['一', '二', '三']

export function TechniqueScreen({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save)
  const setMainTechnique = useGameStore((s) => s.setMainTechnique)
  const setSupportTechnique = useGameStore((s) => s.setSupportTechnique)
  const setPet = useGameStore((s) => s.setPet)
  const [tab, setTab] = useState<string>(TAB_LABELS[0])

  const activeSchool = SCHOOL_TABS.find((t) => t.label === tab)?.school ?? null
  const list = useMemo(
    () => TECHNIQUES.filter((t) => activeSchool === null || t.school === activeSchool),
    [activeSchool],
  )

  const levels = new Map(save.combat.techniques.map((t) => [t.defId, t.level]))
  const mainId = save.combat.mainTechnique
  const support = save.combat.supportTechniques
  const freeSupport = support.findIndex((v) => !v)
  const ownedPets = save.combat.ownedPets ?? []

  const mainView = mainId ? techniqueView(mainId, levels.get(mainId) ?? 1, true, null) : null
  const supportViews = support.map((id, index) =>
    id ? techniqueView(id, levels.get(id) ?? 1, false, index) : null,
  )

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="功法" onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col gap-3 overflow-hidden px-3 pt-3">
        <Panel className="shrink-0 px-3 py-3">
          <SectionTitle className="mb-2">本命法位</SectionTitle>
          <div className="flex items-center gap-2 font-serif text-[10px] tracking-widest text-cream-faint">
            <span>本命流派</span>
            <span className="text-gold-200">{schoolName(save)}</span>
            <span className="ml-auto">
              已习得 {save.combat.techniques.length} / {TECHNIQUES.length} 本
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-md border border-gold-300/25 bg-ink-950/60 px-3 py-2">
            <span className="shrink-0 font-serif text-[10px] tracking-widest text-gold-300/80">
              主修
            </span>
            {mainView ? (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-xs font-bold text-cream">
                    {mainView.name}
                  </span>
                  <span className="mt-0.5 block font-serif text-[10px] text-cream-faint">
                    Lv.{mainView.level} / {mainView.maxLevel} · {mainView.schoolLabel}
                  </span>
                </span>
                <QualityBadge quality={mainView.quality} />
              </>
            ) : (
              <span className="font-serif text-xs text-cream-faint">
                尚未立下主修，于下方择一本功法为尊
              </span>
            )}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            {supportViews.map((view, index) => (
              <button
                key={`support-${index}`}
                type="button"
                disabled={!view}
                onClick={() => setSupportTechnique(index, null)}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-md px-1.5 py-2 text-center transition-colors',
                  view
                    ? 'border border-gold-300/25 bg-ink-950/60 hover:border-gold-300/50'
                    : 'border border-dashed border-gold-300/15 bg-ink-950/40',
                )}
              >
                <span className="font-serif text-[9px] tracking-widest text-cream-faint">
                  辅位 {ORDINAL[index] ?? index + 1}
                </span>
                {view ? (
                  <>
                    <span className="w-full truncate font-serif text-[11px] text-cream">
                      {view.name}
                    </span>
                    <span className="font-serif text-[9px] text-gold-200/85">
                      Lv.{view.level} / {view.maxLevel}
                    </span>
                    <span className="text-[9px] text-cream-faint">点按移出</span>
                  </>
                ) : (
                  <span className="font-serif text-[11px] text-cream-faint">虚位待补</span>
                )}
              </button>
            ))}
          </div>
        </Panel>

        <BuildTabs tabs={TAB_LABELS} active={tab} onChange={setTab} className="shrink-0" />

        <div className="flex-1 overflow-y-auto pb-2 no-scrollbar">
          <ul className="flex flex-col gap-2.5">
            {list.map((def) => {
              const level = levels.get(def.id)
              const slot = support.indexOf(def.id)
              const view =
                level === undefined ? null : techniqueView(def.id, level, mainId === def.id, slot >= 0 ? slot : null)
              const q = qualityView(def.quality)
              return (
                <li
                  key={def.id}
                  className={cn(
                    'rounded-md border p-3',
                    view
                      ? 'border-gold-300/15 bg-ink-950/60'
                      : 'border-gold-300/10 bg-ink-950/40 opacity-45 grayscale',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex size-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-ink-800 to-ink-950"
                      style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}` }}
                    >
                      <GameIcon name={def.icon} className="size-6 text-cream" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-serif text-sm font-bold text-cream">{def.name}</span>
                        <QualityBadge quality={def.quality} />
                        {view ? (
                          <span className="rounded-[3px] bg-ink-800 px-1.5 py-0.5 font-serif text-[10px] leading-none text-gold-200">
                            Lv.{view.level}
                            <span className="text-cream-faint"> / {def.maxLevel}</span>
                          </span>
                        ) : (
                          <span className="rounded-[3px] border border-gold-300/20 px-1.5 py-0.5 font-serif text-[10px] leading-none text-cream-faint">
                            未习得
                          </span>
                        )}
                        {mainId === def.id && (
                          <span className="rounded-[3px] bg-jade-500/20 px-1.5 py-0.5 font-serif text-[10px] leading-none text-jade-300">
                            主修
                          </span>
                        )}
                        {slot >= 0 && (
                          <span className="rounded-[3px] bg-jade-500/15 px-1.5 py-0.5 font-serif text-[10px] leading-none text-jade-300">
                            辅位 {ORDINAL[slot] ?? slot + 1}
                          </span>
                        )}
                        <span
                          className="ml-auto rounded-[3px] px-1.5 py-0.5 font-serif text-[10px] leading-none"
                          style={{ color: q.text, background: 'rgba(7,9,8,0.7)' }}
                        >
                          {view?.schoolLabel ?? SCHOOL_LABEL[def.school]}
                        </span>
                      </div>

                      <p className="mt-1 text-[11px] leading-relaxed text-cream-faint">{def.desc}</p>

                      {view && view.effects.length > 0 && (
                        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {view.effects.map((e) => (
                            <li key={e.label} className="font-serif text-[10px] text-jade-300">
                              {e.label} {e.value}
                            </li>
                          ))}
                        </ul>
                      )}

                      {view && (
                        <div className="mt-2 flex items-center gap-2">
                          {def.role === 'main' ? (
                            mainId === def.id ? (
                              <span className="flex items-center gap-1 font-serif text-[11px] text-jade-300">
                                <Check className="size-3" strokeWidth={3} />
                                已立为尊
                              </span>
                            ) : (
                              <InkButton
                                variant="primary"
                                size="sm"
                                className="min-h-10"
                                onClick={() => setMainTechnique(def.id)}
                              >
                                设为主修
                              </InkButton>
                            )
                          ) : slot >= 0 ? (
                            <InkButton
                              variant="ghost"
                              size="sm"
                              className="min-h-10"
                              onClick={() => setSupportTechnique(slot, null)}
                            >
                              移出辅位
                            </InkButton>
                          ) : freeSupport < 0 ? (
                            <span className="font-serif text-[11px] leading-relaxed text-blood-400">
                              三位辅修已满，先移出一本再纳新法
                            </span>
                          ) : (
                            <InkButton
                              variant="jade"
                              size="sm"
                              className="min-h-10"
                              onClick={() => setSupportTechnique(freeSupport, def.id)}
                            >
                              置于辅位
                            </InkButton>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
            {list.length === 0 && (
              <li className="rounded-md border border-gold-300/15 bg-ink-950/60 px-3 py-6 text-center text-[11px] leading-relaxed text-cream-faint">
                {activeSchool ? `${SCHOOL_LABEL[activeSchool]}一脉暂无功法传世。` : '此间暂无功法传世。'}
              </li>
            )}
          </ul>

          <Panel className="mt-3 px-3 py-3">
            <SectionTitle className="mb-2">
              <span className="flex items-center gap-1">
                <PawPrint className="size-3" />
                灵兽 · 随身道友
              </span>
            </SectionTitle>

            {ownedPets.length === 0 ? (
              <p className="py-4 text-center text-[11px] leading-relaxed text-cream-faint">
                尚未与任何灵兽结契，机缘到时自会相逢。
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {ownedPets.map((id) => {
                  const def = PET_BY_ID[id]
                  const view = petView(id, save.combat.pet === id)
                  if (!def || !view) return null
                  const q = qualityView(def.quality)
                  const passiveRows = statRows(def.passive)
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setPet(view.isActive ? null : id)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-md border p-2.5 text-left transition-colors',
                          view.isActive
                            ? 'border-jade-400/40 bg-jade-500/10'
                            : 'border-gold-300/15 bg-ink-950/60 hover:border-gold-300/40',
                        )}
                      >
                        <span
                          className="flex size-11 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-ink-800 to-ink-950"
                          style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 10px ${q.glow}` }}
                        >
                          <GameIcon name={def.icon} className="size-5 text-cream" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="font-serif text-xs font-bold text-cream">{view.name}</span>
                            <QualityBadge quality={def.quality} />
                            {view.isActive && (
                              <span className="rounded-[3px] bg-jade-500/20 px-1.5 py-0.5 font-serif text-[10px] leading-none text-jade-300">
                                出战中
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[10px] leading-relaxed text-cream-faint">
                            {view.desc}
                          </span>
                          <span className="mt-1 block text-[10px] leading-relaxed text-jade-300/90">
                            技 · {view.skillDesc}
                          </span>
                          {passiveRows.length > 0 && (
                            <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                              {passiveRows.map((row) => (
                                <span key={row.label} className="font-serif text-[10px] text-gold-200/85">
                                  {row.label} {row.value}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>

                        <span
                          className={cn(
                            'shrink-0 self-center rounded-[3px] px-2 py-1.5 font-serif text-[10px]',
                            view.isActive
                              ? 'border border-gold-300/25 text-cream-dim'
                              : 'bg-gradient-to-b from-jade-500 to-jade-700 text-cream',
                          )}
                        >
                          {view.isActive ? '召回' : '出战'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </ScreenFrame>
  )
}
