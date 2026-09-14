'use client'

import { useState } from 'react'
import { Swords, ScrollText, Radar, Zap } from 'lucide-react'
import type { Screen } from '@/lib/navigation'
import { GameBackdrop } from '../GameBackdrop'
import { GameHeader } from '../GameHeader'
import { ChapterHeader } from '../ChapterHeader'
import { SideMenu } from '../SideMenu'
import { InkButton, Panel } from '../primitives'
import { SweepModal } from '../modals/SweepModal'
import { useGameStore } from '@/lib/game/state/store'
import { useCloudStore } from '@/lib/game/api/cloud'
import { stageView, diagnose } from '@/lib/game/state/selectors'
import { LeftMenu, RightMenu, type MenuEntry } from '../menus'
import { MAPS } from '@/lib/game/config/maps'
import type { SweepResult } from '@/lib/game/engine/battle'

export function MainScreen({
  onNavigate,
  onBattle,
  onOpenProfile,
  onOpenSettings,
  onAdd,
  onOpenSaga,
}: {
  onNavigate: (screen: Screen) => void
  onBattle: () => void
  onOpenProfile: () => void
  onOpenSettings: () => void
  onAdd: (kind: 'stone' | 'cultivation') => void
  onOpenSaga?: () => void
}) {
  const save = useGameStore((s) => s.save)
  const sweepStage = useGameStore((s) => s.sweepStage)
  const isAdmin = useCloudStore((s) => s.isAdmin)
  const view = stageView(save)
  const hint = diagnose(save)
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null)
  const [sweepToast, setSweepToast] = useState<string | null>(null)

  const handleSweep = (times: number) => {
    const res = sweepStage(undefined, times)
    if (!res.ok) {
      setSweepToast(res.reason)
      window.setTimeout(() => setSweepToast(null), 2400)
      return
    }
    setSweepResult(res)
  }

  const backdrop =
    MAPS.find((m) => m.id === view.mapId)?.bg ?? '/images/bg-ink-mountains.png'

  const handleMenu = (item: MenuEntry) => {
    if (item.screen) onNavigate(item.screen)
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <GameBackdrop src={backdrop} />

      <GameHeader
        onOpenProfile={onOpenProfile}
        onOpenSettings={onOpenSettings}
        onAdd={onAdd}
      />

      <ChapterHeader className="mt-3" />

      <div className="relative z-10 mt-3 px-3">
        <Panel className="px-3 py-2">
          <div className="flex items-center gap-2">
            <Radar className="size-3.5 shrink-0 text-jade-300" />
            <span className="truncate font-serif text-xs text-cream-dim">
              {view.isBoss ? '首领关 · ' : view.kind === 'elite' ? '精英关 · ' : ''}
              {view.monsterName ?? view.stageName}
            </span>
            <span className="ml-auto shrink-0 font-serif text-[10px] text-cream-faint">
              {view.cleared ? '已通关' : '未通关'}
            </span>
          </div>
          {!view.cleared && (
            <p className="mt-1 text-[10px] leading-relaxed text-cream-faint">{hint}</p>
          )}
        </Panel>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-between px-2.5">
        <SideMenu items={LeftMenu} side="left" onSelect={handleMenu} />
        <SideMenu items={RightMenu} side="right" onSelect={handleMenu} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-2 pb-4">
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSweep(1)}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-jade-400/50 bg-ink-950/70 px-3 py-1 font-serif text-[11px] text-jade-300 transition-colors hover:text-jade-200"
            >
              <Zap className="size-3" />
              一键扫荡 ×1
            </button>
            <button
              type="button"
              onClick={() => handleSweep(10)}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-jade-400/50 bg-ink-950/70 px-3 py-1 font-serif text-[11px] text-jade-300 transition-colors hover:text-jade-200"
            >
              <Zap className="size-3" />
              一键扫荡 ×10
            </button>
          </div>
        )}
        {sweepToast && (
          <p className="rounded-sm border border-blood-500/35 bg-blood-600/20 px-3 py-1.5 text-[11px] text-blood-400">
            {sweepToast}
          </p>
        )}
        {onOpenSaga && (
          <button
            type="button"
            onClick={onOpenSaga}
            className="flex items-center gap-1.5 rounded-full border border-gold-300/25 bg-ink-950/70 px-3 py-1 font-serif text-[11px] text-cream-dim transition-colors hover:text-gold-200"
          >
            <ScrollText className="size-3" />
            仙途录
          </button>
        )}
        <InkButton
          variant="primary"
          size="lg"
          onClick={onBattle}
          className="px-12 text-lg"
        >
          <Swords className="size-5" />
          {view.cleared ? '再战此关' : '挑战'}
        </InkButton>
      </div>

      <SweepModal
        open={sweepResult !== null}
        result={sweepResult}
        onClose={() => setSweepResult(null)}
      />
    </div>
  )
}
