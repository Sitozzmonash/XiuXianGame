'use client'

import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { dungeons, QUALITY, type Dungeon } from '@/lib/game-data'
import { ScreenFrame, SubHeader } from '../ScreenFrame'

export function DungeonScreen({
  onBack,
  onEnter,
}: {
  onBack: () => void
  onEnter: (d: Dungeon) => void
}) {
  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="秘境" onBack={onBack} />

      <div className="relative z-10 flex-1 overflow-y-auto px-3 pt-3 pb-4 no-scrollbar">
        <ul className="flex flex-col gap-3">
          {dungeons.map((d) => {
            const q = QUALITY[d.quality]
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onEnter(d)}
                  className="group relative block h-28 w-full overflow-hidden rounded-md text-left transition-transform duration-200 active:scale-[0.98]"
                  style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}` }}
                >
                  <Image
                    src={d.image}
                    alt=""
                    fill
                    sizes="400px"
                    className="object-cover opacity-60 transition-opacity group-hover:opacity-75"
                  />
                  <span className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/70 to-ink-950/30" />

                  <span className="relative flex h-full flex-col justify-center gap-1 px-4">
                    <span className="font-serif text-base font-bold text-cream">
                      {d.name}
                    </span>
                    <span className="text-[11px] text-gold-300/90">{d.reward}</span>
                    <span className="text-[10px] text-cream-faint">{d.recommend}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[10px] text-jade-300">
                      剩余次数 {d.remaining} / {d.total}
                    </span>
                  </span>

                  <span className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-gold-300/30 bg-ink-950/70 text-gold-200">
                    <ChevronRight className="size-4" />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </ScreenFrame>
  )
}
