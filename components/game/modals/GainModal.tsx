'use client'

import { useEffect, useState } from 'react'
import { Coins, Gem, Pickaxe, Sparkles, Store, Swords, Timer, FlaskConical } from 'lucide-react'
import { useGameStore } from '@/lib/game/state/store'
import { power } from '@/lib/game/state/selectors'
import { formatDuration, formatNumber } from '@/lib/game/utils'
import { cn } from '@/lib/utils'
import type { Screen } from '@/lib/navigation'
import { GameModal } from '../GameModal'
import { InkButton } from '../primitives'

type GainKind = 'stone' | 'cultivation'

/* 顶部灵石 / 修为的「+」各自打开对应面板：
   两者来源不同、能做的事也不同，所以不再共用一个「挂机收益」弹窗。 */
const SOURCES: Record<GainKind, { icon: typeof Coins; label: string; detail: string; to?: Screen }[]> = {
  stone: [
    { icon: Swords, label: '推关与战斗', detail: '每次通关结算灵石，精英与首领掉落更多' },
    { icon: Timer, label: '离线挂机', detail: '离线期间按关卡与洞府倍率累积，24 小时封顶' },
    { icon: Pickaxe, label: '熔炼装备', detail: '背包里多余的装备可批量熔炼换灵石' },
    { icon: Store, label: '坊市', detail: '用灵石换取丹药与炼器材料', to: 'market' },
  ],
  cultivation: [
    { icon: Timer, label: '离线挂机', detail: '离线期间持续累积修为，24 小时封顶' },
    { icon: Swords, label: '推关与战斗', detail: '通关结算修为，秘境节点另有奖励' },
    { icon: FlaskConical, label: '服用丹药', detail: '修为类丹药可直接转化为修为', to: 'alchemy' },
    { icon: Sparkles, label: '每日签到', detail: '签到与在线奖励都会发放修为', to: 'welfare' },
  ],
}

export function GainModal({
  open,
  kind,
  onClose,
  onNavigate,
}: {
  open: boolean
  kind: GainKind | null
  onClose: () => void
  onNavigate: (screen: Screen) => void
}) {
  const save = useGameStore((s) => s.save)
  const lastIdle = useGameStore((s) => s.lastIdle)
  const claimIdle = useGameStore((s) => s.claimIdle)
  const [claimed, setClaimed] = useState(false)

  /* 打开时结算一次，面板里展示的就是这一刻的收益快照 */
  useEffect(() => {
    if (!open) {
      setClaimed(false)
      return
    }
    claimIdle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!kind) return null

  const isStone = kind === 'stone'
  const gain = isStone ? (lastIdle?.stone ?? 0) : (lastIdle?.cultivation ?? 0)
  const held = isStone ? save.resources.stone : save.profile.cultivation
  const materialCount = lastIdle
    ? Object.values(lastIdle.materials).reduce((a, b) => a + b, 0)
    : 0

  return (
    <GameModal
      open={open}
      onClose={onClose}
      title={isStone ? '灵石' : '修为'}
      subtitle={isStone ? '通用货币 · 坊市与法宝升级都靠它' : '境界成长的根基'}
      footer={
        <InkButton
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => {
            setClaimed(true)
            onClose()
          }}
        >
          {claimed ? '已收取' : '收取挂机收益'}
        </InkButton>
      }
    >
      <div className="mb-3 flex items-center gap-2 rounded-md border border-gold-300/15 bg-ink-950/60 px-3 py-2.5">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            isStone ? 'bg-gold-300/15 text-gold-200' : 'bg-jade-500/15 text-jade-300',
          )}
        >
          {isStone ? <Coins className="size-4" /> : <Sparkles className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[10px] text-cream-faint">当前持有</span>
          <span className="block font-serif text-sm font-bold tabular-nums text-cream">
            {formatNumber(held)}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-serif text-[10px] text-cream-faint">
            本次挂机 {lastIdle ? formatDuration(lastIdle.duration) : '—'}
          </span>
          <span
            className={cn(
              'block font-serif text-sm font-bold tabular-nums',
              isStone ? 'text-gold-200' : 'text-jade-300',
            )}
          >
            +{formatNumber(gain)}
          </span>
        </span>
      </div>

      {isStone ? (
        <p className="mb-3 text-[10px] leading-relaxed text-cream-faint">
          灵石用于坊市购物与法宝升级，不可用于突破。
        </p>
      ) : (
        <p className="mb-3 text-[10px] leading-relaxed text-cream-faint">
          修为积满即可突破；当前战力 {formatNumber(power(save))}。
        </p>
      )}

      {lastIdle && (lastIdle.drops.length > 0 || materialCount > 0) && (
        <p className="mb-3 rounded-md border border-jade-500/25 bg-jade-800/20 px-3 py-2 text-[10px] leading-relaxed text-jade-200">
          本次挂机另获
          {lastIdle.drops.length > 0 ? ` 装备 ${lastIdle.drops.length} 件` : ''}
          {lastIdle.drops.length > 0 && materialCount > 0 ? '、' : ''}
          {materialCount > 0 ? `材料 ${materialCount} 份` : ''}
          ，已悉数入囊（背包可查）。
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {SOURCES[kind].map((s) => (
          <li
            key={s.label}
            className="flex items-start gap-2.5 rounded-md border border-gold-300/12 bg-ink-950/60 px-3 py-2"
          >
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm bg-ink-900 text-cream-faint ring-1 ring-inset ring-gold-300/15">
              <s.icon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-[11px] text-cream-dim">{s.label}</span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-cream-faint">{s.detail}</span>
            </span>
            {s.to && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onNavigate(s.to as Screen)
                }}
                className="shrink-0 self-center rounded-[3px] border border-gold-300/25 px-2 py-1 font-serif text-[10px] text-gold-200 transition-colors hover:border-gold-300/60"
              >
                前往
              </button>
            )}
          </li>
        ))}
      </ul>

      {save.resources.immortalJade > 0 && (
        <p className="mt-3 flex items-center gap-1.5 rounded-md border border-gold-300/15 bg-ink-950/60 px-3 py-2 text-[10px] text-cream-dim">
          <Gem className="size-3 text-gold-300" />
          另有仙玉 {formatNumber(save.resources.immortalJade)}：仅在签到与里程碑发放，后续用于稀有兑换。
        </p>
      )}
    </GameModal>
  )
}
