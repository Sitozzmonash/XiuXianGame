'use client'

import { ArrowUpCircle, Timer } from 'lucide-react'
import { QUALITY, type Treasure } from '@/lib/game-data'
import { GameModal } from '../GameModal'
import { GameIcon } from '../GameIcon'
import { InkButton, QualityBadge, StatBar } from '../primitives'

export function TreasureModal({
  open,
  onClose,
  treasure,
}: {
  open: boolean
  onClose: () => void
  treasure: Treasure | null
}) {
  if (!treasure) return null
  const q = QUALITY[treasure.quality]

  return (
    <GameModal
      open={open}
      onClose={onClose}
      title={treasure.name}
      subtitle={`${q.label} · ${treasure.type}`}
      footer={
        <>
          <InkButton variant="ghost" size="md" className="flex-1">
            卸下
          </InkButton>
          <InkButton variant="primary" size="md" className="flex-1">
            <ArrowUpCircle className="size-3.5" />
            升级
          </InkButton>
        </>
      }
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-ink-800 to-ink-950"
          style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 16px ${q.glow}` }}
        >
          <GameIcon name={treasure.icon} className="size-8 text-cream" />
        </span>
        <div className="flex flex-col gap-1.5">
          <QualityBadge quality={treasure.quality} />
          <span className="font-serif text-xs text-gold-200">
            Lv.{treasure.level}
          </span>
          <span className="text-[11px] text-cream-faint">
            伤害 {treasure.damage}
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-cream-dim">
        {treasure.desc}
      </p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-cream-faint">
            <Timer className="size-3" />
            冷却 {treasure.cooldown}s
          </span>
          <span className="text-cream-dim">
            {treasure.ready >= 1 ? '已就绪' : '冷却中'}
          </span>
        </div>
        <StatBar
          value={treasure.ready}
          height="h-1.5"
          barClassName={
            treasure.ready >= 1
              ? 'from-jade-500 to-jade-300'
              : 'from-gold-500 to-gold-300'
          }
        />
      </div>
    </GameModal>
  )
}
