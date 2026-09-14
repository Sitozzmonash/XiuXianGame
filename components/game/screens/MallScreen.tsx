'use client'

import { useState } from 'react'
import { Gem, Lock, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MALL_ITEMS, type MallItem, type MallSection, exchangeStone } from '@/lib/game/config/mall'
import { SKIN_BY_ID } from '@/lib/game/config/skins'
import { QUALITY } from '@/lib/game/ui-tokens'
import { useGameStore } from '@/lib/game/state/store'
import { formatNumber } from '@/lib/game/utils'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { GameIcon } from '../GameIcon'
import { BuildTabs } from '../Tabs'
import { InkButton, Panel, QualityBadge, SectionTitle } from '../primitives'

const TABS = ['皮肤', '装备', '兑换'] as const
const SECTION_OF_TAB: Record<(typeof TABS)[number], MallSection> = {
  皮肤: 'skin',
  装备: 'equip',
  兑换: 'exchange',
}

function priceLabel(item: MallItem): string {
  if (item.currency === 'jade') return `${item.price} 仙玉`
  return `${formatNumber(item.price)} 灵石`
}

/** 皮肤卡片：大图预览 + 拥有状态 */
function SkinCard({
  item,
  owned,
  wearing,
  onBuy,
}: {
  item: MallItem
  owned: boolean
  wearing: boolean
  onBuy: (id: string) => void
}) {
  const skin = item.skinId ? SKIN_BY_ID[item.skinId] : undefined
  if (!skin) return null
  const q = QUALITY[item.quality]
  return (
    <li
      className="overflow-hidden rounded-md border border-gold-300/15 bg-ink-950/60"
      style={{ boxShadow: `inset 0 0 0 1px ${q.ring}22` }}
    >
      <div className="relative h-44 bg-gradient-to-b from-ink-800/60 to-ink-950">
        <img
          src={skin.image}
          alt={skin.name}
          className="size-full object-contain object-bottom drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)]"
        />
        {wearing && (
          <span className="absolute left-1.5 top-1.5 rounded-[3px] bg-jade-500/90 px-1.5 font-serif text-[9px] font-bold leading-[15px] text-ink-950">
            穿戴中
          </span>
        )}
        {owned && !wearing && (
          <span className="absolute left-1.5 top-1.5 rounded-[3px] bg-gold-400/90 px-1.5 font-serif text-[9px] font-bold leading-[15px] text-ink-950">
            已拥有
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-2.5 pt-2">
        <span className="truncate font-serif text-xs font-bold text-cream">{skin.name}</span>
        <QualityBadge quality={item.quality} />
      </div>
      <p className="mt-0.5 px-2.5 text-[10px] leading-relaxed text-cream-faint">{skin.desc}</p>
      <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-2">
        <span className="font-serif text-[11px] tabular-nums text-gold-200">{priceLabel(item)}</span>
        {owned ? (
          <span className="font-serif text-[10px] text-cream-faint">在「角色 · 皮肤」中换装</span>
        ) : (
          <InkButton variant="primary" size="sm" className="min-h-8" onClick={() => onBuy(item.id)}>
            购买
          </InkButton>
        )}
      </div>
    </li>
  )
}

/** 装备 / 兑换条目 */
function GoodsRow({
  item,
  maxStage,
  unlocked,
  onBuy,
}: {
  item: MallItem
  maxStage: number
  unlocked: boolean
  onBuy: (id: string) => void
}) {
  const q = QUALITY[item.quality]
  const balance = useGameStore((s) => (item.currency === 'jade' ? s.save.resources.immortalJade : s.save.resources.stone))
  const affordable = unlocked && balance >= item.price
  const stoneOut = item.section === 'exchange' ? exchangeStone(item.stone ?? 0, maxStage) : 0

  return (
    <li
      className={cn(
        'flex items-center gap-2.5 rounded-md border px-3 py-2',
        unlocked ? 'border-gold-300/15 bg-ink-950/60' : 'border-gold-300/10 bg-ink-950/40',
      )}
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-gradient-to-b from-ink-800 to-ink-950"
        style={{ boxShadow: `inset 0 0 0 1.5px ${q.ring}, 0 0 10px ${q.glow}` }}
      >
        <GameIcon name={item.icon} className="size-5 text-cream" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'truncate font-serif text-xs font-bold',
              unlocked ? 'text-cream' : 'text-cream-faint',
            )}
          >
            {item.name}
          </span>
          <QualityBadge quality={item.quality} />
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-cream-faint">{item.desc}</span>
        {unlocked ? (
          <span
            className={cn(
              'mt-1 block font-serif text-[11px] tabular-nums',
              affordable ? 'text-gold-200' : 'text-blood-400',
            )}
          >
            {priceLabel(item)}
            {stoneOut > 0 && (
              <span className="text-cream-faint"> → 灵石 +{formatNumber(stoneOut)}</span>
            )}
          </span>
        ) : (
          <span className="mt-1 flex items-center gap-1 font-serif text-[10px] text-cream-faint/70">
            <Lock className="size-2.5" />
            通关第 {item.unlockStage} 关后上架
          </span>
        )}
      </span>
      {unlocked && (
        <InkButton
          variant={item.currency === 'jade' ? 'primary' : 'ghost'}
          size="sm"
          className="min-h-8 shrink-0"
          disabled={!affordable}
          onClick={() => onBuy(item.id)}
        >
          {item.treasureBox ? '开启' : '购买'}
        </InkButton>
      )}
    </li>
  )
}

export function MallScreen({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save)
  const mallBuy = useGameStore((s) => s.mallBuy)
  const [tab, setTab] = useState<(typeof TABS)[number]>('皮肤')
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)

  const section = SECTION_OF_TAB[tab]
  const items = MALL_ITEMS.filter((m) => m.section === section)

  const handleBuy = (id: string) => {
    const res = mallBuy(id)
    setToast({ ok: res.ok, text: res.ok ? (res.text ?? '购买成功') : (res.reason ?? '购买失败') })
    window.setTimeout(() => setToast(null), 2600)
  }

  return (
    <ScreenFrame backdrop="/images/bg-yunze-market.png">
      <SubHeader title="商城" onBack={onBack} />

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-3 pb-6 pt-3">
        <Panel className="mb-3 flex items-center gap-3 px-3 py-2.5">
          <span className="flex items-center gap-1.5">
            <Gem className="size-4 shrink-0 text-jade-300" />
            <span className="font-serif text-[11px] text-cream-dim">仙玉</span>
            <span className="font-serif text-sm font-bold tabular-nums text-jade-200">
              {formatNumber(save.resources.immortalJade)}
            </span>
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="font-serif text-[11px] text-cream-dim">灵石</span>
            <span className="font-serif text-sm font-bold tabular-nums text-gold-200">
              {formatNumber(save.resources.stone)}
            </span>
          </span>
        </Panel>

        <BuildTabs tabs={TABS} active={tab} onChange={(t) => setTab(t as (typeof TABS)[number])} className="mb-3" />

        {tab === '皮肤' ? (
          <ul className="grid grid-cols-2 gap-2.5">
            {items.map((item) => (
              <SkinCard
                key={item.id}
                item={item}
                owned={item.skinId ? save.appearance.ownedSkins.includes(item.skinId) : false}
                wearing={item.skinId === save.appearance.skin}
                onBuy={handleBuy}
              />
            ))}
          </ul>
        ) : (
          <>
            <SectionTitle className="mb-2">
              {tab === '装备' ? '奇珍百货' : '仙玉兑换'}
            </SectionTitle>
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <GoodsRow
                  key={item.id}
                  item={item}
                  maxStage={save.progress.maxStage}
                  unlocked={save.progress.maxStage >= item.unlockStage}
                  onBuy={handleBuy}
                />
              ))}
            </ul>
            {tab === '装备' && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center font-serif text-[10px] text-cream-faint/70">
                <ShoppingBag className="size-3" />
                福匣开出的装备部位随机，丹药材料请移步坊市
              </p>
            )}
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
      </div>
    </ScreenFrame>
  )
}
