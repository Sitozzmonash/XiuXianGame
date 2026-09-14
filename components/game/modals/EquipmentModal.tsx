'use client'

import { useEffect, useMemo, useState } from 'react'
import { Coins, Hammer, Lock, Sparkles, Trash2 } from 'lucide-react'
import {
  EQUIP_SLOTS,
  type EquipInstance,
  type EquipSlotId,
} from '@/lib/game/types'
import { useGameStore } from '@/lib/game/state/store'
import { equipArt } from '@/lib/game/ui-art'
import { formatNumber } from '@/lib/game/utils'
import { GameModal } from '../GameModal'
import { GameIcon } from '../GameIcon'
import { InkButton, Panel, QualityBadge } from '../primitives'
import { equipmentView, qualityView } from '../viewModels'

/** 与 store.enhanceEquip 保持一致：强化上限与下一级祭炼所需灵石 */
const MAX_ENHANCE = 15

function enhanceCost(item: EquipInstance): number {
  return Math.round(24 * (item.enhance + 1) ** 1.55 + item.level * 3)
}

interface EquipMatch {
  item: EquipInstance
  slot: EquipSlotId | null
}

export function EquipmentModal({
  open,
  onClose,
  name,
}: {
  open: boolean
  onClose: () => void
  name?: string
}) {
  const [note, setNote] = useState<string | null>(null)

  const save = useGameStore((s) => s.save)
  const equip = useGameStore((s) => s.equip)
  const unequip = useGameStore((s) => s.unequip)
  const salvage = useGameStore((s) => s.salvage)
  const enhanceEquip = useGameStore((s) => s.enhanceEquip)

  /* 换一件装备或重新开窗，上一次操作的话别留在屏上 */
  useEffect(() => {
    setNote(null)
  }, [open, name])

  /**
   * 弹窗只拿得到装备名，行囊与已装备的槽位都要找：
   * 行囊优先，兼顾「同一名字的行囊副本才是可穿戴的那一件」。
   */
  const match = useMemo<EquipMatch | null>(() => {
    if (!name) return null
    const inBag = save.inventory.items.find((i) => i.name === name)
    if (inBag) return { item: inBag, slot: null }
    for (const slot of EQUIP_SLOTS) {
      const worn = save.combat.equipment[slot]
      if (worn && worn.name === name) return { item: worn, slot }
    }
    return null
  }, [name, save.inventory.items, save.combat.equipment])

  if (!open) return null

  if (!match) {
    return (
      <GameModal
        open={open}
        onClose={onClose}
        title={name ?? '装备详情'}
        subtitle="此物已不在行囊之中"
        footer={
          <InkButton variant="ghost" size="md" className="min-h-[40px] w-full" onClick={onClose}>
            收起
          </InkButton>
        }
      >
        <div className="flex flex-col items-center gap-3 py-6">
          <span className="flex size-16 items-center justify-center rounded-full border border-gold-300/20 bg-ink-950/60">
            <Sparkles className="size-6 text-cream-faint" />
          </span>
          <p className="text-center text-[11px] leading-relaxed text-cream-faint">
            缘法已散，此物或被分解，或已易主
          </p>
        </div>
      </GameModal>
    )
  }

  const view = equipmentView(match.item)
  const q = qualityView(view.quality)
  const stone = save.resources.stone
  const isWorn = match.slot !== null
  const cost = enhanceCost(match.item)
  const maxed = match.item.enhance >= MAX_ENHANCE
  const affordable = stone >= cost

  const handleWear = () => {
    if (isWorn && match.slot) {
      const ok = unequip(match.slot)
      setNote(ok ? '已卸下，收入行囊' : '行囊已满，卸下不得')
      return
    }
    const ok = equip(match.item.uid)
    setNote(ok ? '已着此物于身' : '穿戴未成')
  }

  const handleEnhance = () => {
    const ok = enhanceEquip(match.item.uid)
    setNote(ok ? '祭炼有成，其威更盛' : '灵石不足，祭炼未成')
  }

  const handleSalvage = () => {
    if (!window.confirm(`分解「${view.name}」，可得灵石若干（依品质与等级折算）。是否继续？`)) return
    const gain = salvage(match.item.uid)
    if (gain <= 0) {
      setNote('此物已锁或不可分解')
      return
    }
    onClose()
  }

  return (
    <GameModal
      open={open}
      onClose={onClose}
      title={view.name}
      subtitle={`${q.label} · ${view.slotLabel}`}
      footer={
        <>
          <InkButton
            variant="ghost"
            size="md"
            className="min-h-[40px] flex-1"
            disabled={isWorn || view.locked}
            onClick={handleSalvage}
          >
            <Trash2 className="size-3.5" />
            分解
          </InkButton>
          <InkButton
            variant="jade"
            size="md"
            className="min-h-[40px] flex-1"
            disabled={maxed || !affordable}
            onClick={handleEnhance}
          >
            <Hammer className="size-3.5" />
            强化
          </InkButton>
          <InkButton
            variant="primary"
            size="md"
            className="min-h-[40px] flex-1"
            onClick={handleWear}
          >
            {isWorn ? '卸下' : '穿戴'}
          </InkButton>
        </>
      }
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-ink-800 to-ink-950"
          style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 16px ${q.glow}` }}
        >
          {equipArt(view.icon) ? (
            <img src={equipArt(view.icon)} alt="" className="size-14 object-contain p-0.5" />
          ) : (
            <GameIcon name={view.icon} className="size-8 text-cream" />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <QualityBadge quality={view.quality} />
            {view.locked && (
              <span className="flex items-center gap-1 rounded-[3px] bg-ink-950/70 px-1.5 py-0.5 font-serif text-[10px] leading-none text-gold-300 ring-1 ring-inset ring-gold-300/40">
                <Lock className="size-2.5" />
                已锁
              </span>
            )}
          </div>
          <p className="mt-1.5 font-serif text-xs text-gold-200">
            Lv.{view.level}
            {view.enhance > 0 && <span className="ml-1.5 text-gold-300">+{view.enhance}</span>}
          </p>
          <p className="mt-0.5 text-[10px] text-cream-faint">
            {view.slotLabel} · {isWorn ? '已着于身' : '置于行囊'}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 font-serif text-xs tracking-widest text-gold-300/80">主属性</p>
        <ul className="flex flex-col gap-1">
          {view.mainStats.map((s) => (
            <li key={s.label} className="flex items-baseline gap-2 text-xs">
              <span className="text-cream-faint">{s.label}</span>
              <span className="ml-auto font-serif tabular-nums text-cream">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 flex items-center gap-1 font-serif text-xs tracking-widest text-gold-300/80">
          <Sparkles className="size-3" />
          附加词条
        </p>
        <ul className="flex flex-col gap-1">
          {view.affixes.map((a, i) => (
            <li
              key={`${a.label}-${i}`}
              className={
                a.legendary
                  ? 'flex items-center gap-1.5 text-xs text-gold-200'
                  : 'text-xs text-jade-300'
              }
            >
              {a.legendary && <Sparkles className="size-3 shrink-0 text-gold-300" />}
              {a.label}
            </li>
          ))}
          {view.affixes.length === 0 && (
            <li className="text-xs text-cream-faint">此物无附加词条</li>
          )}
        </ul>
      </div>

      <Panel className="mt-4 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px]">
          <Hammer className="size-3.5 shrink-0 text-jade-300" />
          <span className="text-cream-faint">祭炼</span>
          <span className="font-serif tabular-nums text-cream">
            {view.enhance} / {MAX_ENHANCE}
          </span>
          <span className="ml-auto flex items-center gap-1 text-gold-200">
            <Coins className="size-3" />
            {maxed ? '已至极致' : formatNumber(cost)}
          </span>
        </div>
        {!maxed && (
          <p className="mt-1.5 text-[10px] text-cream-faint">
            {affordable ? `下一级需灵石 ${formatNumber(cost)}` : `灵石不足，尚缺 ${formatNumber(cost - stone)}`}
          </p>
        )}
      </Panel>

      {note && (
        <p className="mt-3 rounded-sm border border-jade-500/25 bg-jade-800/20 px-2.5 py-1.5 text-[11px] leading-relaxed text-jade-200">
          {note}
        </p>
      )}
    </GameModal>
  )
}
