'use client'

import { Coins, Package, Sparkles, Timer } from 'lucide-react'
import { idleReward } from '@/lib/game-data'
import { GameModal } from '../GameModal'
import { InkButton } from '../primitives'

const REWARDS = [
  { icon: Sparkles, label: '修为', value: idleReward.cultivation, color: 'text-jade-300' },
  { icon: Coins, label: '灵石', value: idleReward.spiritStone, color: 'text-gold-200' },
  { icon: Package, label: '装备', value: `${idleReward.equipment} 件`, color: 'text-cream' },
  { icon: Package, label: '材料', value: `${idleReward.material} 份`, color: 'text-cream' },
]

export function IdleModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <GameModal
      open={open}
      onClose={onClose}
      title="挂机收益"
      subtitle="离线期间，道友仍在勤修"
      footer={
        <InkButton variant="primary" size="lg" className="w-full" onClick={onClose}>
          领取全部
        </InkButton>
      }
    >
      <div className="mb-3 flex items-center justify-center gap-1.5 rounded-md border border-gold-300/15 bg-ink-950/60 py-2 text-xs text-cream-dim">
        <Timer className="size-3.5 text-gold-300" />
        离线时长 {idleReward.offline}
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {REWARDS.map((r) => (
          <li
            key={r.label}
            className="flex flex-col items-center gap-1 rounded-md border border-gold-300/15 bg-ink-950/60 py-3"
          >
            <r.icon className={`size-4 ${r.color}`} />
            <span className="font-serif text-sm tabular-nums text-cream">
              {r.value}
            </span>
            <span className="text-[10px] text-cream-faint">{r.label}</span>
          </li>
        ))}
      </ul>
    </GameModal>
  )
}
