'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  equipmentSlots,
  player,
  playerAttributes,
  type EquipmentSlot as Slot,
} from '@/lib/game-data'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { BuildTabs } from '../Tabs'
import { EquipmentSlot } from '../EquipmentSlot'
import { GameIcon } from '../GameIcon'

const TABS = ['属性', '流派', '灵根', '功法'] as const

export function CharacterScreen({
  onBack,
  onSelectSlot,
}: {
  onBack: () => void
  onSelectSlot: (slot: Slot) => void
}) {
  const [tab, setTab] = useState<string>(TABS[0])

  const left = equipmentSlots.slice(0, 5)
  const right = equipmentSlots.slice(5)

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="角色" onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col gap-3 overflow-hidden px-3 pt-3">
        <div className="relative flex shrink-0 items-center justify-between">
          <div className="flex flex-col gap-6">
            {left.map((slot) => (
              <EquipmentSlot key={slot.id} slot={slot} onClick={onSelectSlot} />
            ))}
          </div>

          <div className="relative h-56 flex-1">
            <Image
              src={player.avatar}
              alt={player.name}
              fill
              sizes="220px"
              className="object-contain object-bottom drop-shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
            />
          </div>

          <div className="flex flex-col gap-6">
            {right.map((slot) => (
              <EquipmentSlot key={slot.id} slot={slot} onClick={onSelectSlot} />
            ))}
          </div>
        </div>

        <div className="shrink-0 text-center">
          <p className="font-serif text-base font-bold text-cream">{player.name}</p>
          <p className="text-[11px] text-gold-300/90">
            {player.realm} · 战力 52.3万
          </p>
        </div>

        <BuildTabs tabs={TABS} active={tab} onChange={setTab} className="shrink-0" />

        <div className="flex-1 overflow-y-auto pb-2 no-scrollbar">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {playerAttributes.map((attr) => (
              <li
                key={attr.key}
                className="flex items-center gap-2 rounded-sm border border-gold-300/10 bg-ink-950/50 px-2.5 py-1.5"
              >
                <GameIcon name={attr.icon} className="size-3.5 text-jade-300" />
                <span className="text-[11px] text-cream-faint">{attr.key}</span>
                <span className="ml-auto font-serif text-xs tabular-nums text-cream">
                  {attr.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ScreenFrame>
  )
}
