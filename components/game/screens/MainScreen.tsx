'use client'

import { Swords } from 'lucide-react'
import { leftMenu, rightMenu, type MenuItem } from '@/lib/game-data'
import type { Screen } from '@/lib/navigation'
import { GameBackdrop } from '../GameBackdrop'
import { GameHeader } from '../GameHeader'
import { ChapterHeader } from '../ChapterHeader'
import { SideMenu } from '../SideMenu'
import { InkButton } from '../primitives'

export function MainScreen({
  onNavigate,
  onBattle,
  onOpenProfile,
  onOpenSettings,
  onAdd,
}: {
  onNavigate: (screen: Screen) => void
  onBattle: () => void
  onOpenProfile: () => void
  onOpenSettings: () => void
  onAdd: (kind: 'stone' | 'cultivation') => void
}) {
  const handleMenu = (item: MenuItem) => onNavigate(item.screen)

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <GameBackdrop src="/images/bg-ink-mountains.png" />

      <GameHeader
        onOpenProfile={onOpenProfile}
        onOpenSettings={onOpenSettings}
        onAdd={onAdd}
      />

      <ChapterHeader className="mt-3" />

      <div className="relative z-10 flex flex-1 items-center justify-between px-2.5">
        <SideMenu items={leftMenu} side="left" onSelect={handleMenu} />
        <SideMenu items={rightMenu} side="right" onSelect={handleMenu} />
      </div>

      <div className="relative z-10 flex justify-center pb-4">
        <InkButton
          variant="primary"
          size="lg"
          onClick={onBattle}
          className="px-12 text-lg"
        >
          <Swords className="size-5" />
          挑战
        </InkButton>
      </div>
    </div>
  )
}
