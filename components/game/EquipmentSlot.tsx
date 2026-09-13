'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QUALITY, type EquipmentSlot as Slot } from '@/lib/game-data'
import { GameIcon } from './GameIcon'

export function EquipmentSlot({
  slot,
  onClick,
  className,
}: {
  slot: Slot
  onClick?: (slot: Slot) => void
  className?: string
}) {
  const q = slot.item ? QUALITY[slot.item.quality] : null
  return (
    <button
      type="button"
      onClick={() => onClick?.(slot)}
      aria-label={`${slot.label}${slot.item ? `：${slot.item.name}` : '：空'}`}
      className={cn(
        'group relative flex size-12 items-center justify-center rounded-md',
        'bg-gradient-to-b from-ink-800/90 to-ink-950/95 transition-transform duration-150 active:scale-95',
        className,
      )}
      style={{
        boxShadow: q
          ? `inset 0 0 0 1.5px ${q.ring}, 0 0 10px ${q.glow}`
          : 'inset 0 0 0 1px rgba(232,200,119,0.22)',
      }}
    >
      {slot.item ? (
        <>
          <GameIcon name={slot.item.icon} className="size-6 text-cream" strokeWidth={1.4} />
          <span className="absolute left-0.5 top-0.5 rounded-[3px] bg-ink-950/85 px-1 font-serif text-[9px] leading-[13px] text-gold-200">
            {slot.item.level}
          </span>
        </>
      ) : (
        <Plus className="size-4 text-cream-faint" />
      )}
      <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-serif text-[9px] text-cream-faint">
        {slot.label}
      </span>
    </button>
  )
}
