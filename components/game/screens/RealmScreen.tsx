'use client'

import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { RealmProgress } from '../RealmProgress'

export function RealmScreen({
  onBack,
  onBreakthrough,
}: {
  onBack: () => void
  onBreakthrough: () => void
}) {
  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="境界" onBack={onBack} />
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        <RealmProgress onBreakthrough={onBreakthrough} />
      </div>
    </ScreenFrame>
  )
}
