'use client'

import { useState } from 'react'
import { Coins, Lock, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MARKET_GOODS } from '@/lib/game/config/market'
import { MATERIAL_BY_ID } from '@/lib/game/config/materials'
import { PILL_BY_ID } from '@/lib/game/config/pills'
import { QUALITY } from '@/lib/game/ui-tokens'
import { useGameStore } from '@/lib/game/state/store'
import { formatNumber } from '@/lib/game/utils'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { GameIcon } from '../GameIcon'
import { InkButton, Panel, QualityBadge, SectionTitle } from '../primitives'

function goodName(good: { kind: 'pill' | 'material'; refId: string }): string {
  return good.kind === 'pill'
    ? (PILL_BY_ID[good.refId]?.name ?? good.refId)
    : (MATERIAL_BY_ID[good.refId]?.name ?? good.refId)
}

function goodIcon(good: { kind: 'pill' | 'material'; refId: string }): string {
  return good.kind === 'pill'
    ? (PILL_BY_ID[good.refId]?.icon ?? 'pill')
    : (MATERIAL_BY_ID[good.refId]?.icon ?? 'ore')
}

function goodDesc(good: { kind: 'pill' | 'material'; refId: string }): string {
  return good.kind === 'pill'
    ? (PILL_BY_ID[good.refId]?.desc ?? '')
    : (MATERIAL_BY_ID[good.refId]?.desc ?? '')
}

export function MarketScreen({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save)
  const buyGood = useGameStore((s) => s.buyGood)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)

  const unlocked = MARKET_GOODS.filter((g) => save.progress.maxStage >= g.unlockStage)
  const locked = MARKET_GOODS.filter((g) => save.progress.maxStage < g.unlockStage)

  const handleBuy = (id: string, times: number) => {
    const good = MARKET_GOODS.find((g) => g.id === id)
    const res = buyGood(id, times)
    if (!res.ok) {
      setToast({ ok: false, text: res.reason ?? '购买失败' })
    } else {
      setToast({
        ok: true,
        text: `购得 ${goodName(good!)} ×${res.count}，耗灵石 ${formatNumber(res.cost ?? 0)}`,
      })
    }
    window.setTimeout(() => setToast(null), 2400)
  }

  return (
    <ScreenFrame backdrop="/images/bg-yunze-market.png">
      <SubHeader title="坊市" onBack={onBack} />

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-3 pb-6 pt-3">
        <Panel className="mb-3 flex items-center gap-2 px-3 py-2.5">
          <Coins className="size-4 shrink-0 text-gold-300" />
          <span className="font-serif text-[11px] text-cream-dim">灵石</span>
          <span className="font-serif text-sm font-bold tabular-nums text-gold-200">
            {formatNumber(save.resources.stone)}
          </span>
          <span className="ml-auto font-serif text-[10px] text-cream-faint">
            坊市只收灵石，不出售装备
          </span>
        </Panel>

        <SectionTitle className="mb-2">在售</SectionTitle>
        <ul className="flex flex-col gap-2">
          {unlocked.map((good) => {
            const q = QUALITY[good.quality]
            const affordable = save.resources.stone >= good.price
            return (
              <li
                key={good.id}
                className="flex items-center gap-2.5 rounded-md border border-gold-300/15 bg-ink-950/60 px-3 py-2"
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-gradient-to-b from-ink-800 to-ink-950"
                  style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 10px ${q.glow}` }}
                >
                  <GameIcon name={goodIcon(good)} className="size-5 text-cream" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-serif text-xs font-bold text-cream">
                      {goodName(good)}
                    </span>
                    <QualityBadge quality={good.quality} />
                    <span className="shrink-0 font-serif text-[10px] text-cream-faint">
                      ×{good.bundle}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-cream-faint">
                    {goodDesc(good)}
                  </span>
                  <span
                    className={cn(
                      'mt-1 block font-serif text-[11px] tabular-nums',
                      affordable ? 'text-gold-200' : 'text-blood-400',
                    )}
                  >
                    {formatNumber(good.price)} 灵石
                  </span>
                </span>
                <div className="flex shrink-0 flex-col gap-1">
                  <InkButton
                    variant="primary"
                    size="sm"
                    className="min-h-8"
                    onClick={() => handleBuy(good.id, 1)}
                  >
                    买 1
                  </InkButton>
                  <InkButton variant="ghost" size="sm" className="min-h-8" onClick={() => handleBuy(good.id, 5)}>
                    买 5
                  </InkButton>
                </div>
              </li>
            )
          })}
          {unlocked.length === 0 && (
            <li className="rounded-md border border-dashed border-gold-300/20 px-3 py-6 text-center text-[11px] text-cream-faint">
              坊市还没开张，先去推关吧。
            </li>
          )}
        </ul>

        {locked.length > 0 && (
          <>
            <SectionTitle className="mb-2 mt-5">尚未到货</SectionTitle>
            <ul className="flex flex-col gap-1.5">
              {locked.map((good) => (
                <li
                  key={good.id}
                  className="flex items-center gap-2.5 rounded-md border border-gold-300/10 bg-ink-950/40 px-3 py-2"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-ink-900 text-cream-faint/60">
                    <Lock className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-[11px] text-cream-faint">
                      {goodName(good)} ×{good.bundle}
                    </span>
                    <span className="mt-0.5 block font-serif text-[10px] text-cream-faint/70">
                      通关第 {good.unlockStage} 关后上架
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {toast && (
          <p
            className={cn(
              'mt-3 rounded-sm border px-3 py-2 text-center text-[11px] leading-relaxed',
              toast.ok
                ? 'border-jade-500/30 bg-jade-800/25 text-jade-200'
                : 'border-blood-500/35 bg-blood-600/20 text-blood-400',
            )}
          >
            {toast.text}
          </p>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center font-serif text-[10px] text-cream-faint/70">
          <ShoppingBag className="size-3" />
          声望够高时，坊市还会出现稀罕货（开发中）
        </p>
      </div>
    </ScreenFrame>
  )
}
