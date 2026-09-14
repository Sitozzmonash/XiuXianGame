'use client'

import { BattlePreview } from '@/components/game/battle/preview'
import { AudioPreviewPanel } from '@/components/game/battle/AudioPreviewPanel'

/* 验收页：战斗特效 + 音效试听 */
export default function BattlePreviewPage() {
  return (
    <div className="relative">
      <BattlePreview />
      <AudioPreviewPanel />
    </div>
  )
}
