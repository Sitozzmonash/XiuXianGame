'use client'

import { useMemo, useState } from 'react'
import { ArrowUpCircle, Layers, Plus, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TREASURES, TREASURE_BY_ID } from '@/lib/game/config/treasures'
import { QUALITY } from '@/lib/game/ui-tokens'
import { QUALITY_ORDER, type Quality, type TreasureInstance } from '@/lib/game/types'
import { TREASURE_MAX_LEVEL, treasureUpgradeCost, useGameStore } from '@/lib/game/state/store'
import { treasureArt } from '@/lib/game/ui-art'
import { formatNumber } from '@/lib/game/utils'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { GameIcon } from '../GameIcon'
import { InkButton, Panel, QualityBadge, SectionTitle } from '../primitives'

const ORDINAL = ['一', '二', '三', '四', '五']

function TreasureArt({
  icon,
  quality,
  className,
  iconClassName,
}: {
  icon: string
  quality: Quality
  className?: string
  iconClassName?: string
}) {
  const art = treasureArt(icon)
  const q = QUALITY[quality]
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-gradient-to-b from-ink-800 to-ink-950',
        className,
      )}
      style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 10px ${q.glow}` }}
    >
      {art ? (
        <img src={art} alt="" className="size-full object-contain p-0.5" />
      ) : (
        <GameIcon name={icon} className={cn('size-5 text-cream', iconClassName)} />
      )}
    </span>
  )
}

function qualityRankOf(defId: string): number {
  const q = TREASURE_BY_ID[defId]?.quality
  return q ? QUALITY_ORDER.indexOf(q) : -1
}

export function TreasureScreen({
  onBack,
  onOpenBuild,
}: {
  onBack: () => void
  onOpenBuild: () => void
}) {
  const save = useGameStore((s) => s.save)
  const equipTreasure = useGameStore((s) => s.equipTreasure)
  const unequipTreasure = useGameStore((s) => s.unequipTreasure)
  const upgradeTreasure = useGameStore((s) => s.upgradeTreasure)

  const [picking, setPicking] = useState<{ kind: 'active' | 'passive'; index: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const owned = save.combat.ownedTreasures
  const equippedIds = useMemo(
    () => new Set([...save.combat.activeTreasures, ...save.combat.passiveTreasures].filter(Boolean) as string[]),
    [save.combat.activeTreasures, save.combat.passiveTreasures],
  )

  const list = useMemo(
    () =>
      [...owned].sort(
        (a, b) =>
          qualityRankOf(b.defId) - qualityRankOf(a.defId) ||
          b.level - a.level ||
          b.tier - a.tier ||
          a.defId.localeCompare(b.defId),
      ),
    [owned],
  )

  const flash = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(null), 2000)
  }

  const handleUpgrade = (inst: TreasureInstance) => {
    const def = TREASURE_BY_ID[inst.defId]
    if (!def) return
    if (inst.level >= TREASURE_MAX_LEVEL) {
      flash(`${def.name} 已至满级。`)
      return
    }
    const cost = treasureUpgradeCost(inst.level)
    if (save.resources.stone < cost) {
      flash(`灵石不足（需 ${formatNumber(cost)}）`)
      return
    }
    flash(upgradeTreasure(inst.defId) ? `${def.name} 升至 Lv.${inst.level + 1}` : '升级失败')
  }

  const candidates = picking
    ? owned
        .filter((t) => TREASURE_BY_ID[t.defId]?.kind === picking.kind)
        .sort((a, b) => qualityRankOf(b.defId) - qualityRankOf(a.defId) || b.level - a.level)
    : []

  const renderSlots = (kind: 'active' | 'passive') => {
    const arr = kind === 'active' ? save.combat.activeTreasures : save.combat.passiveTreasures
    return (
      <ul className="grid grid-cols-5 gap-1.5">
        {arr.map((defId, index) => {
          const def = defId ? TREASURE_BY_ID[defId] : null
          const inst = defId ? owned.find((t) => t.defId === defId) : null
          return (
            <li key={`${kind}-${index}`}>
              <button
                type="button"
                onClick={() =>
                  defId ? unequipTreasure(index, kind) : setPicking({ kind, index })
                }
                className={cn(
                  'flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-sm border p-0.5',
                  defId
                    ? 'border-gold-300/25 bg-ink-950/70'
                    : 'border-dashed border-gold-300/25 bg-ink-950/40',
                )}
                title={def ? `${def.name}（点按卸下）` : '空槽（点按装备）'}
              >
                {def ? (
                  <>
                    <TreasureArt icon={def.icon} quality={def.quality} className="size-9" />
                    <span className="w-full truncate text-center font-serif text-[8px] leading-none text-cream-faint">
                      Lv.{inst?.level ?? 1}
                    </span>
                  </>
                ) : (
                  <Plus className="size-3.5 text-gold-300/50" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="法宝" onBack={onBack} />

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-3 pb-6 pt-3">
        <Panel className="px-3 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-jade-300" />
            <span className="font-serif text-xs text-cream-dim">
              已藏 {owned.length} / {TREASURES.length} 件
            </span>
            <button
              type="button"
              onClick={onOpenBuild}
              className="ml-auto flex items-center gap-1 rounded-full border border-gold-300/25 bg-ink-950/70 px-2.5 py-1 font-serif text-[10px] text-cream-dim transition-colors hover:text-gold-200"
            >
              <Layers className="size-3" />
              流派方案
            </button>
          </div>

          <SectionTitle className="mb-2 mt-3">主动 · 五蕴法坛</SectionTitle>
          {renderSlots('active')}

          <SectionTitle className="mb-2 mt-3.5">被动 · 双壁</SectionTitle>
          {renderSlots('passive')}

          <p className="mt-2.5 text-[10px] leading-relaxed text-cream-faint">
            点空槽入阵，点已装备的槽位收回囊中；同件法宝不会同时占两处。
          </p>
        </Panel>

        <SectionTitle className="mb-2 mt-5">囊中法宝</SectionTitle>
        {list.length === 0 ? (
          <Panel className="px-3 py-6 text-center">
            <p className="font-serif text-[11px] leading-relaxed text-cream-faint">
              尚无法宝。推关、开宝箱或往坊市碰碰机缘，都可能得到法宝。
            </p>
          </Panel>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((inst) => {
              const def = TREASURE_BY_ID[inst.defId]
              if (!def) return null
              const inPlace = equippedIds.has(inst.defId)
              const cost = treasureUpgradeCost(inst.level)
              const maxed = inst.level >= TREASURE_MAX_LEVEL
              return (
                <li
                  key={inst.uid}
                  className="flex items-center gap-2.5 rounded-md border border-gold-300/15 bg-ink-950/60 px-3 py-2"
                >
                  <TreasureArt icon={def.icon} quality={def.quality} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-serif text-xs font-bold text-cream">{def.name}</span>
                      <QualityBadge quality={def.quality} />
                      {inPlace && (
                        <span className="shrink-0 rounded-[3px] bg-jade-500/15 px-1.5 py-0.5 font-serif text-[9px] text-jade-300">
                          已列阵
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-cream-faint">
                      {def.desc}
                    </p>
                    <p className="mt-1 font-serif text-[10px] text-cream-faint">
                      {def.kind === 'active' ? '主动' : '被动'} · Lv.{inst.level} · {inst.tier} 阶 ·{' '}
                      {def.cooldown > 0 ? `冷却 ${def.cooldown} 息` : '常驻'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <InkButton
                      variant={inPlace ? 'ghost' : 'jade'}
                      size="sm"
                      className="min-h-8"
                      onClick={() => {
                        if (inPlace) {
                          const idx =
                            def.kind === 'active'
                              ? save.combat.activeTreasures.indexOf(def.id)
                              : save.combat.passiveTreasures.indexOf(def.id)
                          unequipTreasure(idx < 0 ? 0 : idx, def.kind)
                          flash(`${def.name} 已收回囊中`)
                          return
                        }
                        const arr =
                          def.kind === 'active' ? save.combat.activeTreasures : save.combat.passiveTreasures
                        const free = arr.findIndex((v) => !v)
                        const slot = free >= 0 ? free : 0
                        equipTreasure(slot, def.id)
                        flash(`${def.name} 入阵（${ORDINAL[slot] ?? slot + 1}）`)
                      }}
                    >
                      {inPlace ? '卸下' : '入阵'}
                    </InkButton>
                    <InkButton
                      variant="primary"
                      size="sm"
                      className="min-h-8"
                      disabled={maxed || save.resources.stone < cost}
                      onClick={() => handleUpgrade(inst)}
                    >
                      <ArrowUpCircle className="size-3" />
                      {maxed ? '满级' : formatNumber(cost)}
                    </InkButton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {toast && (
          <p className="mt-3 rounded-sm border border-gold-300/25 bg-ink-950/70 px-3 py-2 text-center text-[11px] text-cream-dim">
            {toast}
          </p>
        )}
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
              <span className="min-w-0 flex-1">
                <h2 className="font-serif text-sm font-bold text-gold-200 text-glow-gold">择宝入坛</h2>
                <p className="mt-0.5 text-[10px] text-cream-faint">
                  {picking.kind === 'active' ? '主动' : '被动'}法坛 ·{' '}
                  {ORDINAL[picking.index] ?? picking.index + 1}
                </p>
              </span>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setPicking(null)}
                className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-gold-300/20 text-cream-faint transition-colors hover:text-cream"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="no-scrollbar max-h-[46vh] overflow-y-auto px-3 py-3">
              {candidates.length === 0 ? (
                <p className="py-6 text-center text-[11px] leading-relaxed text-cream-faint">
                  囊中并无{picking.kind === 'active' ? '主动' : '被动'}法宝可用。
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {candidates.map((inst) => {
                    const def = TREASURE_BY_ID[inst.defId]
                    if (!def) return null
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
                          <TreasureArt icon={def.icon} quality={def.quality} className="size-10" />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate font-serif text-xs font-bold text-cream">
                                {def.name}
                              </span>
                              <QualityBadge quality={def.quality} />
                            </span>
                            <span className="mt-0.5 block font-serif text-[10px] text-cream-faint">
                              Lv.{inst.level} · {inst.tier} 阶 ·{' '}
                              {def.cooldown > 0 ? `冷却 ${def.cooldown} 息` : '常驻'}
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
