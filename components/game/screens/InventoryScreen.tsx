'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Wand2 } from 'lucide-react'
import {
  inventoryCapacity,
  inventoryItems,
  inventoryTabs,
  type Item,
} from '@/lib/game-data'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { BuildTabs } from '../Tabs'
import { ItemGrid } from '../ItemGrid'
import { InkButton, StatBar } from '../primitives'

export function InventoryScreen({
  onBack,
  onSelectItem,
}: {
  onBack: () => void
  onSelectItem: (item: Item) => void
}) {
  const [tab, setTab] = useState<string>(inventoryTabs[0])

  const items = useMemo(
    () =>
      tab === '全部'
        ? inventoryItems
        : inventoryItems.filter((i) => i.category === tab),
    [tab],
  )

  const ratio = inventoryCapacity.used / inventoryCapacity.total

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="背包" onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col gap-3 overflow-hidden px-3 pt-3">
        <BuildTabs
          tabs={inventoryTabs}
          active={tab}
          onChange={setTab}
          className="shrink-0"
        />

        <div className="shrink-0">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-cream-faint">容量</span>
            <span className="tabular-nums text-cream-dim">
              {inventoryCapacity.used} / {inventoryCapacity.total}
            </span>
          </div>
          <StatBar value={ratio} height="h-1.5" />
        </div>

        <div className="flex-1 overflow-y-auto pb-2 no-scrollbar">
          <ItemGrid items={items} onSelect={onSelectItem} />
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-2 border-t border-gold-300/15 bg-ink-950/80 px-3 py-3">
        <InkButton variant="jade" size="md" className="flex-1">
          <Sparkles className="size-3.5" />
          一键穿戴
        </InkButton>
        <InkButton variant="ghost" size="md" className="flex-1">
          <Wand2 className="size-3.5" />
          一键分解
        </InkButton>
      </div>
    </ScreenFrame>
  )
}
