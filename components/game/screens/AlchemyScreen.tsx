'use client'

import { useMemo, useState } from 'react'
import { Flame, FlaskConical, Pill as PillIcon, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PILL_BY_ID } from '@/lib/game/config/pills'
import { RECIPES, type PillRecipe } from '@/lib/game/config/recipes'
import { MATERIAL_BY_ID } from '@/lib/game/config/materials'
import { QUALITY } from '@/lib/game/ui-tokens'
import { QUALITY_ORDER } from '@/lib/game/types'
import { useGameStore } from '@/lib/game/state/store'
import { formatNumber } from '@/lib/game/utils'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { GameIcon } from '../GameIcon'
import { InkButton, Panel, QualityBadge } from '../primitives'
import { BuildTabs } from '../Tabs'

const TABS = ['开炉炼丹', '囊中丹药'] as const

const CATEGORY_LABEL: Record<string, string> = {
  cultivation: '修为',
  breakthrough: '突破',
  battle: '战斗',
  permanent: '永久',
}

export function AlchemyScreen({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save)
  const usePill = useGameStore((s) => s.usePill)
  const brewPill = useGameStore((s) => s.brewPill)

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('开炉炼丹')
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const [brewingId, setBrewingId] = useState<string | null>(null)

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
    window.setTimeout(() => setToast(null), 2500)
  }

  const handleUse = (id: string, name: string) => {
    const ok = usePill(id, 1)
    if (ok) flash(true, `服下 ${name}，修为精进。`)
    else flash(false, `${name} 暂时无法服用（战斗丹在战斗中自动生效，突破丹在突破时消耗）`)
  }

  const handleBrew = (recipe: PillRecipe, count = 1) => {
    setBrewingId(recipe.id)
    window.setTimeout(() => {
      const res = brewPill(recipe.id, count)
      setBrewingId(null)
      if (res.ok) {
        flash(true, `真火淬炼！成功炼得「${res.pillName}」×${res.count} 颗！`)
      } else {
        flash(false, res.reason ?? '炼制失败')
      }
    }, 450)
  }

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="丹房" onBack={onBack} />

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-3 pb-6 pt-3">
        {/* 资产概览 */}
        <Panel className="mb-3 px-3 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FlaskConical className="size-4 shrink-0 text-jade-300" />
              <span className="font-serif text-[11px] text-cream-dim">
                持丹 {owned.reduce((a, b) => a + b.count, 0)} 颗
              </span>
            </div>
            <div className="flex items-center gap-3 font-serif text-[11px] tabular-nums">
              <span className="text-gold-200">灵石 {formatNumber(save.resources.stone)}</span>
              <span className="text-cream-faint">{RECIPES.length} 门丹方</span>
            </div>
          </div>
        </Panel>

        <BuildTabs
          tabs={TABS}
          active={activeTab}
          onChange={(t) => setActiveTab(t as (typeof TABS)[number])}
          className="mb-3"
        />

        {activeTab === '开炉炼丹' ? (
          <ul className="flex flex-col gap-2.5">
            {RECIPES.map((recipe) => {
              const pill = PILL_BY_ID[recipe.pillId]
              const q = QUALITY[recipe.quality]
              const locked = save.progress.maxStage < recipe.unlockStage
              const stoneLack = save.resources.stone < recipe.costStone

              // 检查材料齐备度
              let materialsOk = true
              const matStatus = recipe.materials.map((m) => {
                const matDef = MATERIAL_BY_ID[m.materialId]
                const have = save.inventory.materials[m.materialId] ?? 0
                const ok = have >= m.count
                if (!ok) materialsOk = false
                return { name: matDef?.name ?? m.materialId, have, need: m.count, ok }
              })

              const canBrew = !locked && !stoneLack && materialsOk
              const isBrewing = brewingId === recipe.id

              return (
                <li
                  key={recipe.id}
                  className={cn(
                    'rounded-md border p-3 transition-colors',
                    locked
                      ? 'border-gold-300/10 bg-ink-950/40 opacity-75'
                      : 'border-gold-300/15 bg-ink-950/70',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-gradient-to-b from-ink-800 to-ink-950"
                      style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 10px ${q.glow}` }}
                    >
                      <GameIcon name={pill?.icon ?? 'pill'} className="size-5 text-cream" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-serif text-xs font-bold text-cream">
                          {pill?.name ?? recipe.name}
                        </span>
                        <QualityBadge quality={recipe.quality} />
                        {pill?.category && (
                          <span className="shrink-0 rounded-[3px] border border-gold-300/20 px-1.5 py-0.5 font-serif text-[9px] text-cream-faint">
                            {CATEGORY_LABEL[pill.category] ?? pill.category}
                          </span>
                        )}
                        <span className="ml-auto font-serif text-[10px] text-cream-faint">
                          库存 ×{save.inventory.pills[recipe.pillId] ?? 0}
                        </span>
                      </div>

                      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-cream-faint">
                        {recipe.desc}
                      </p>

                      {/* 丹药效果概览 */}
                      {pill?.effect.cultivation ? (
                        <p className="mt-1 flex items-center gap-1 font-serif text-[10px] text-jade-300">
                          <Sparkles className="size-2.5" />
                          服下获得修为 +{formatNumber(pill.effect.cultivation)}
                        </p>
                      ) : null}

                      {/* 材料需求列表 */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-sm bg-ink-900/60 px-2 py-1.5">
                        <span className="font-serif text-[10px] text-cream-faint">配料：</span>
                        {matStatus.map((m) => (
                          <span
                            key={m.name}
                            className={cn(
                              'rounded-[3px] px-1.5 py-0.5 font-serif text-[9px] tabular-nums',
                              m.ok
                                ? 'bg-jade-950/60 text-jade-300 ring-1 ring-inset ring-jade-500/30'
                                : 'bg-red-950/50 text-red-300 ring-1 ring-inset ring-red-500/30',
                            )}
                          >
                            {m.name} {m.have}/{m.need}
                          </span>
                        ))}
                        <span
                          className={cn(
                            'ml-auto font-serif text-[10px] tabular-nums',
                            stoneLack ? 'text-red-400' : 'text-gold-200',
                          )}
                        >
                          灵石 {formatNumber(recipe.costStone)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-gold-300/10 pt-2">
                    {locked ? (
                      <span className="font-serif text-[10px] text-cream-faint">
                        通关第 {recipe.unlockStage} 关解锁此丹方
                      </span>
                    ) : (
                      <span className="font-serif text-[10px] text-cream-faint">
                        地心真火淬炼 · 必成无损
                      </span>
                    )}

                    <InkButton
                      variant={canBrew ? 'primary' : 'ghost'}
                      size="sm"
                      className="min-h-7 px-3 text-xs"
                      disabled={!canBrew || isBrewing}
                      onClick={() => handleBrew(recipe, 1)}
                    >
                      <Flame className={cn('size-3', isBrewing && 'animate-spin')} />
                      {isBrewing ? '炼制中…' : '起炉炼制'}
                    </InkButton>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          /* 囊中丹药列表 */
          <div>
            {owned.length === 0 ? (
              <Panel className="px-3 py-6 text-center">
                <p className="font-serif text-[11px] leading-relaxed text-cream-faint">
                  囊中暂无存丹。可在【开炉炼丹】自行炼制，或通过坊市与关卡掉落获得。
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
                          <span className="truncate font-serif text-xs font-bold text-cream">
                            {def!.name}
                          </span>
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
          </div>
        )}

        {toast && (
          <p
            className={cn(
              'fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-md border px-4 py-2 text-center font-serif text-xs shadow-lg backdrop-blur-md transition-all',
              toast.ok
                ? 'border-jade-500/40 bg-ink-950/90 text-jade-200 shadow-jade-950/50'
                : 'border-gold-300/40 bg-ink-950/90 text-cream shadow-ink-950/50',
            )}
          >
            {toast.text}
          </p>
        )}
      </div>
    </ScreenFrame>
  )
}
