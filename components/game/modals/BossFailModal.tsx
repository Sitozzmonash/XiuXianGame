'use client'

import { RotateCw, TrendingUp } from 'lucide-react'
import { GameModal } from '../GameModal'
import { InkButton } from '../primitives'

export function BossFailModal({
  open,
  onClose,
  onRetry,
}: {
  open: boolean
  onClose: () => void
  onRetry: () => void
}) {
  return (
    <GameModal
      open={open}
      onClose={onClose}
      title="挑战失败"
      subtitle="黑风妖狼 剩余 38% 生命"
      footer={
        <>
          <InkButton variant="ghost" size="md" className="flex-1" onClick={onClose}>
            返回
          </InkButton>
          <InkButton variant="primary" size="md" className="flex-1" onClick={onRetry}>
            <RotateCw className="size-3.5" />
            再战
          </InkButton>
        </>
      }
    >
      <p className="text-xs leading-relaxed text-cream-dim">
        道友修为尚浅，未能破其护体妖气。可先提升战力，再行挑战。
      </p>

      <div className="mt-3 flex items-center gap-2 rounded-md border border-gold-300/15 bg-ink-950/60 p-3">
        <TrendingUp className="size-4 shrink-0 text-jade-300" />
        <p className="text-[11px] text-cream-faint">
          建议战力 <span className="text-gold-200">58万</span>，当前战力{' '}
          <span className="text-cream">52.3万</span>
        </p>
      </div>
    </GameModal>
  )
}
