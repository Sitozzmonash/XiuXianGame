'use client'

import { useRef, useState } from 'react'
import { ArrowLeftRight, Layers, Plus, Save, Shield, Swords } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QUALITY_ORDER, type TreasureInstance } from '@/lib/game/types'
import { TREASURE_BY_ID } from '@/lib/game/config/treasures'
import { useGameStore } from '@/lib/game/state/store'
import {
  buildScore,
  loadoutName,
  power,
  powerBreakdown,
  schoolName,
  type BuildScore,
} from '@/lib/game/state/selectors'
import { formatNumber } from '@/lib/game/utils'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { GameIcon } from '../GameIcon'
import { InkButton, Panel, QualityBadge, SectionTitle, StatBar } from '../primitives'
import { qualityView, treasureView, type TreasureView } from '../viewModels'

const GRADE_RING: Record<BuildScore['grade'], string> = {
  S: '#e8c877',
  A: '#e0a24a',
  B: '#5b9bd5',
  C: '#8ad9c8',
  D: '#9aa39c',
}

const ORDINAL = ['一', '二', '三', '四', '五']

const POWER_PARTS = [
  { key: 'offense', label: '攻伐', bar: 'from-blood-600 to-blood-400' },
  { key: 'survival', label: '护体', bar: 'from-jade-500 to-jade-300' },
  { key: 'utility', label: '玄机', bar: 'from-gold-500 to-gold-300' },
] as const

function qualityRank(defId: string): number {
  const q = TREASURE_BY_ID[defId]?.quality
  return q ? QUALITY_ORDER.indexOf(q) : -1
}

interface PickerTarget {
  kind: 'active' | 'passive'
  index: number
}

function TreasureSlotRow({
  label,
  view,
  onPick,
  onUnequip,
}: {
  label: string
  view: TreasureView | null
  onPick: () => void
  onUnequip: () => void
}) {
  const timer = useRef<number | null>(null)
  const longPressed = useRef(false)

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  if (!view) {
    return (
      <button
        type="button"
        onClick={onPick}
        className="flex min-h-14 w-full items-center gap-2 rounded-md border border-dashed border-gold-300/30 bg-ink-950/50 px-3 py-2 text-left transition-colors hover:border-gold-300/60 hover:bg-ink-900/60"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-gold-300/25 text-gold-300/70">
          <Plus className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[10px] tracking-widest text-cream-faint">{label}</span>
          <span className="mt-0.5 block font-serif text-xs text-cream-dim">＋ 装备法宝</span>
        </span>
      </button>
    )
  }

  const q = qualityView(view.quality)

  return (
    <div className="flex min-h-14 w-full items-center gap-2 rounded-md border border-gold-300/20 bg-ink-950/60 px-3 py-2">
      <button
        type="button"
        onPointerDown={() => {
          longPressed.current = false
          clearTimer()
          timer.current = window.setTimeout(() => {
            longPressed.current = true
            onUnequip()
          }, 520)
        }}
        onPointerUp={clearTimer}
        onPointerLeave={clearTimer}
        onPointerCancel={clearTimer}
        onClick={() => {
          if (longPressed.current) {
            longPressed.current = false
            return
          }
          onPick()
        }}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-gradient-to-b from-ink-800 to-ink-950"
          style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 10px ${q.glow}` }}
        >
          <GameIcon name={view.icon} className="size-5 text-cream" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-serif text-xs font-bold text-cream">{view.name}</span>
            <QualityBadge quality={view.quality} />
          </span>
          <span className="mt-0.5 block font-serif text-[10px] text-cream-faint">
            {label} · Lv.{view.level} · {view.tier} 阶 ·{' '}
            {view.cooldown > 0 ? `冷却 ${view.cooldown} 息` : '常驻'}
          </span>
        </span>
      </button>
      <InkButton variant="ghost" size="sm" className="min-h-10 shrink-0" onClick={onUnequip}>
        卸下
      </InkButton>
    </div>
  )
}

export function BuildScreen({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save)
  const equipTreasure = useGameStore((s) => s.equipTreasure)
  const unequipTreasure = useGameStore((s) => s.unequipTreasure)
  const saveLoadoutB = useGameStore((s) => s.saveLoadoutB)
  const switchLoadout = useGameStore((s) => s.switchLoadout)
  const [picking, setPicking] = useState<PickerTarget | null>(null)

  const score = buildScore(save)
  const breakdown = powerBreakdown(save)
  const totalPower = power(save)
  const loadout = loadoutName(save)
  const school = schoolName(save)
  const hasBackup = save.combat.loadoutB !== null

  const activeViews = save.combat.activeTreasures.map((defId, index) => {
    if (!defId) return null
    const inst = save.combat.ownedTreasures.find((t) => t.defId === defId)
    return treasureView(defId, index, inst?.level ?? 1, inst?.tier ?? 0)
  })
  const passiveViews = save.combat.passiveTreasures.map((defId, index) => {
    if (!defId) return null
    const inst = save.combat.ownedTreasures.find((t) => t.defId === defId)
    return treasureView(defId, index, inst?.level ?? 1, inst?.tier ?? 0)
  })

  const equippedIds = new Set(
    [...save.combat.activeTreasures, ...save.combat.passiveTreasures].filter(Boolean) as string[],
  )

  const candidates: TreasureInstance[] = picking
    ? save.combat.ownedTreasures
        .filter((t) => TREASURE_BY_ID[t.defId]?.kind === picking.kind)
        .sort(
          (a, b) => qualityRank(b.defId) - qualityRank(a.defId) || b.level - a.level || b.tier - a.tier,
        )
    : []

  const pickerKindLabel = picking?.kind === 'passive' ? '被动' : '主动'

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="流派方案" onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col gap-3 overflow-hidden px-3 pt-3">
        <div className="flex-1 overflow-y-auto pb-1 no-scrollbar">
          <div className="flex flex-col gap-3">
            <Panel className="px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded-[3px] border border-gold-300/35 bg-gold-300/10 px-1.5 py-0.5 font-serif text-[11px] text-gold-200">
                  {loadout}
                </span>
                <span className="font-serif text-[11px] text-cream-dim">{school}</span>
                <span className="ml-auto font-serif text-[10px] text-cream-faint">
                  {hasBackup ? '已备下方案 B' : '尚无备用方案'}
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="flex items-center gap-1 text-[10px] text-cream-faint">
                    <Swords className="size-3 text-gold-300/80" />
                    战力
                  </span>
                  <span className="font-serif text-lg font-bold tabular-nums text-gold-200 text-glow-gold">
                    {formatNumber(totalPower)}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span
                    className="flex size-11 items-center justify-center rounded-full bg-ink-950/80 font-serif text-lg font-bold"
                    style={{
                      color: GRADE_RING[score.grade],
                      boxShadow: `inset 0 0 0 1.5px ${GRADE_RING[score.grade]}`,
                    }}
                  >
                    {score.grade}
                  </span>
                  <span className="flex flex-col text-right">
                    <span className="text-[10px] text-cream-faint">Build 评分</span>
                    <span className="font-serif text-sm tabular-nums text-cream">
                      {formatNumber(score.score)}
                    </span>
                  </span>
                </div>
              </div>

              <ul className="mt-2.5 flex flex-col gap-1 border-t border-gold-300/10 pt-2">
                {score.notes.map((note) => (
                  <li key={note} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-cream-faint">
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-gold-300/60" />
                    {note}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel className="px-3 py-3">
              <SectionTitle className="mb-2">战力构成</SectionTitle>
              <div className="flex flex-col gap-2.5">
                {POWER_PARTS.map((part) => {
                  const value = breakdown[part.key]
                  const pct = breakdown.total > 0 ? (value / breakdown.total) * 100 : 0
                  return (
                    <div key={part.key} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between font-serif text-[11px]">
                        <span className="text-cream-dim">{part.label}</span>
                        <span className="tabular-nums text-cream-faint">
                          {formatNumber(value)}
                          <span className="ml-1.5 text-gold-200/80">{pct.toFixed(1)}%</span>
                        </span>
                      </div>
                      <StatBar value={pct / 100} height="h-2" barClassName={part.bar} />
                    </div>
                  )
                })}
              </div>
            </Panel>

            <Panel className="px-3 py-3">
              <SectionTitle className="mb-2">主动法宝 · 五蕴法坛</SectionTitle>
              <div className="flex flex-col gap-2">
                {activeViews.map((view, index) => (
                  <TreasureSlotRow
                    key={`active-${index}`}
                    label={`主动 · ${ORDINAL[index] ?? index + 1}`}
                    view={view}
                    onPick={() => setPicking({ kind: 'active', index })}
                    onUnequip={() => unequipTreasure(index)}
                  />
                ))}
              </div>
            </Panel>

            <Panel className="px-3 py-3">
              <SectionTitle className="mb-2">被动法宝 · 双壁</SectionTitle>
              <div className="flex flex-col gap-2">
                {passiveViews.map((view, index) => (
                  <TreasureSlotRow
                    key={`passive-${index}`}
                    label={`被动 · ${ORDINAL[index] ?? index + 1}`}
                    view={view}
                    onPick={() => setPicking({ kind: 'passive', index })}
                    onUnequip={() => unequipTreasure(index)}
                  />
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-cream-faint">
                轻触槽位可换宝，长按槽位或点「卸下」收回囊中。
              </p>
            </Panel>
          </div>
        </div>

        <Panel className="shrink-0 px-3 py-2.5">
          <div className="flex items-center justify-between font-serif text-[11px]">
            <span className="flex items-center gap-1 text-cream-faint">
              <Layers className="size-3 text-gold-300/80" />
              当前方案
              <span className="text-gold-200">{loadout}</span>
            </span>
            <span className={cn(hasBackup ? 'text-jade-300' : 'text-cream-faint')}>
              {hasBackup ? '已备下方案 B' : '尚无备用方案'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <InkButton
              variant="jade"
              size="md"
              className="min-h-10 flex-1"
              onClick={() => saveLoadoutB()}
            >
              <Save className="size-3.5" />
              保存为方案二
            </InkButton>
            <InkButton
              variant="primary"
              size="md"
              className="min-h-10 flex-1"
              disabled={!hasBackup}
              onClick={() => switchLoadout()}
            >
              <ArrowLeftRight className="size-3.5" />
              切换方案
            </InkButton>
          </div>
          {!hasBackup && (
            <p className="mt-1.5 text-[10px] leading-relaxed text-cream-faint">
              先把当前法宝、功法与灵兽存为方案二，之后才能在两套构筑间自如切换。
            </p>
          )}
        </Panel>
      </div>

      {picking && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end bg-ink-950/85">
          <button
            type="button"
            aria-label="关闭择宝"
            className="min-h-6 flex-1"
            onClick={() => setPicking(null)}
          />
          <div className="animate-rise overflow-hidden rounded-t-lg panel-ink">
            <header className="flex items-center gap-2 border-b border-gold-300/15 px-4 py-3">
              <Shield className="size-4 shrink-0 text-gold-300/80" />
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-sm font-bold text-gold-200 text-glow-gold">
                  择宝入坛
                </h2>
                <p className="mt-0.5 text-[10px] text-cream-faint">
                  {`${pickerKindLabel}法坛 · ${ORDINAL[picking.index] ?? picking.index + 1} · ${
                    picking.kind === 'active' ? '主动法宝' : '被动法宝'
                  }`}
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setPicking(null)}
                className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-gold-300/20 text-cream-faint transition-colors hover:text-cream"
              >
                ✕
              </button>
            </header>
            <div className="max-h-[46vh] overflow-y-auto px-3 py-3 no-scrollbar">
              {candidates.length === 0 ? (
                <p className="py-6 text-center text-[11px] leading-relaxed text-cream-faint">
                  囊中并无可用{pickerKindLabel}法宝，且去历练寻宝，或往坊市碰碰机缘。
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {candidates.map((inst) => {
                    const view = treasureView(inst.defId, null, inst.level, inst.tier)
                    if (!view) return null
                    const q = qualityView(view.quality)
                    const inPlace = equippedIds.has(inst.defId)
                    return (
                      <li key={inst.uid}>
                        <button
                          type="button"
                          onClick={() => {
                            equipTreasure(picking.index, inst.defId)
                            setPicking(null)
                          }}
                          className="flex min-h-14 w-full items-center gap-2.5 rounded-md border border-gold-300/15 bg-ink-950/60 px-3 py-2 text-left transition-colors hover:border-gold-300/45"
                        >
                          <span
                            className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-gradient-to-b from-ink-800 to-ink-950"
                            style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 10px ${q.glow}` }}
                          >
                            <GameIcon name={view.icon} className="size-5 text-cream" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate font-serif text-xs font-bold text-cream">
                                {view.name}
                              </span>
                              <QualityBadge quality={view.quality} />
                            </span>
                            <span className="mt-0.5 block font-serif text-[10px] text-cream-faint">
                              Lv.{view.level} · {view.tier} 阶 ·{' '}
                              {view.cooldown > 0 ? `冷却 ${view.cooldown} 息` : '常驻'}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'shrink-0 rounded-[3px] px-2 py-1 font-serif text-[10px]',
                              inPlace
                                ? 'bg-jade-500/15 text-jade-300'
                                : 'border border-gold-300/25 text-gold-200',
                            )}
                          >
                            {inPlace ? '已列阵' : '入阵'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </ScreenFrame>
  )
}
