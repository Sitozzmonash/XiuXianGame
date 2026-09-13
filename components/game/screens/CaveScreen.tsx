'use client'

import { caveBuildings, type Building } from '@/lib/game-data'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { GameIcon } from '../GameIcon'
import { RedDot } from '../primitives'

export function CaveScreen({
  onBack,
  onSelectBuilding,
}: {
  onBack: () => void
  onSelectBuilding: (b: Building) => void
}) {
  return (
    <ScreenFrame backdrop="/images/cave-dwelling.png">
      <SubHeader title="洞府" onBack={onBack} />

      <div className="relative z-10 flex-1">
        {caveBuildings.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelectBuilding(b)}
            className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          >
            <span className="relative flex size-12 items-center justify-center rounded-md border border-gold-300/35 bg-ink-950/80 text-gold-200 shadow-[0_4px_14px_rgba(0,0,0,0.6)] transition-all duration-200 group-hover:border-gold-300/70 group-active:scale-95">
              <GameIcon name={b.icon} className="size-6" />
              {b.claimable && <RedDot />}
            </span>
            <span className="rounded-[3px] bg-ink-950/80 px-1.5 py-0.5 font-serif text-[10px] leading-none text-cream-dim">
              {b.name}
            </span>
            <span className="font-serif text-[9px] leading-none text-gold-300/80">
              Lv.{b.level}
            </span>
          </button>
        ))}
      </div>
    </ScreenFrame>
  )
}
