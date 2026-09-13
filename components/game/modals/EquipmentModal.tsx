'use client'

import { Hammer, Sparkles, Trash2 } from 'lucide-react'
import { equipmentDetail, QUALITY } from '@/lib/game-data'
import { GameModal } from '../GameModal'
import { GameIcon } from '../GameIcon'
import { InkButton, QualityBadge } from '../primitives'

export function EquipmentModal({
  open,
  onClose,
  name,
}: {
  open: boolean
  onClose: () => void
  name?: string
}) {
  const q = QUALITY[equipmentDetail.quality]

  return (
    <GameModal
      open={open}
      onClose={onClose}
      title={name ?? equipmentDetail.name}
      subtitle={equipmentDetail.tier}
      footer={
        <>
          <InkButton variant="ghost" size="md" className="flex-1">
            <Trash2 className="size-3.5" />
            分解
          </InkButton>
          <InkButton variant="jade" size="md" className="flex-1">
            <Hammer className="size-3.5" />
            强化
          </InkButton>
          <InkButton variant="primary" size="md" className="flex-1">
            装备
          </InkButton>
        </>
      }
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-ink-800 to-ink-950"
          style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 16px ${q.glow}` }}
        >
          <GameIcon name="robe" className="size-8 text-cream" />
        </span>
        <div>
          <QualityBadge quality={equipmentDetail.quality} />
          <p className="mt-1.5 text-[11px] text-cream-faint">
            装备后战力 +1.2万
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 font-serif text-xs tracking-widest text-gold-300/80">
          基础属性
        </p>
        <ul className="flex flex-col gap-1">
          {equipmentDetail.mainStats.map((s) => (
            <li key={s} className="text-xs text-cream">
              {s}
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
          {equipmentDetail.affixes.map((a) => (
            <li key={a} className="text-xs text-jade-300">
              {a}
            </li>
          ))}
        </ul>
      </div>
    </GameModal>
  )
}
