'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, Check, Clock, Coins, Gem, Sparkles, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/lib/game/state/store'
import {
  PLAY_TIME_MILESTONES,
  SIGN_IN_CYCLE,
  signInReward,
  signInState,
  welfareScale,
} from '@/lib/game/config/welfare'
import { QUALITY } from '@/lib/game/ui-tokens'
import { formatNumber, localDayIndex } from '@/lib/game/utils'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { InkButton, Panel, SectionTitle } from '../primitives'

/* 签到按玩家本地自然日判定；首次渲染后再算，避免与服务端时区不一致导致水合不匹配 */
function useToday(): number | null {
  const [today, setToday] = useState<number | null>(null)
  useEffect(() => setToday(localDayIndex()), [])
  return today
}

function RewardIcons({ stone, cultivation, immortalJade }: { stone: number; cultivation: number; immortalJade?: number }) {
  return (
    <span className="flex flex-col items-center gap-0.5 text-[9px] leading-tight">
      {stone > 0 && (
        <span className="flex items-center gap-0.5 text-gold-200">
          <Coins className="size-2.5" />
          {formatNumber(stone)}
        </span>
      )}
      {cultivation > 0 && (
        <span className="flex items-center gap-0.5 text-jade-300">
          <Sparkles className="size-2.5" />
          {formatNumber(cultivation)}
        </span>
      )}
      {!!immortalJade && (
        <span className="flex items-center gap-0.5 text-cream">
          <Gem className="size-2.5" />
          {formatNumber(immortalJade)}
        </span>
      )}
    </span>
  )
}

export function WelfareScreen({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save)
  const signIn = useGameStore((s) => s.signIn)
  const claimPlaytime = useGameStore((s) => s.claimPlaytime)
  const [toast, setToast] = useState<string | null>(null)
  const today = useToday()

  const scale = welfareScale(save.progress.maxStage)
  const state = today === null ? null : signInState(save.welfare, today)
  const scaleOf = (v: number | undefined) => Math.round((v ?? 0) * scale)

  const playSeconds = save.stats.playTime
  const playMinutes = Math.floor(playSeconds / 60)

  const handleSignIn = () => {
    const res = signIn()
    if (!res) {
      setToast('今日已签到，明天再来。')
    } else {
      const parts = [`灵石 +${formatNumber(res.stone)}`, `修为 +${formatNumber(res.cultivation)}`]
      if (res.immortalJade) parts.push(`仙玉 +${res.immortalJade}`)
      setToast(`第 ${res.day} 天签到成功：${parts.join('，')}`)
    }
    window.setTimeout(() => setToast(null), 2600)
  }

  const handleClaim = (minutes: number) => {
    const ok = claimPlaytime(minutes)
    setToast(ok ? '在线奖励已领取。' : '尚未达成或已领取。')
    window.setTimeout(() => setToast(null), 2200)
  }

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="福利" onBack={onBack} />

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-3 pb-6 pt-3">
        <Panel className="px-3 py-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-4 shrink-0 text-jade-300" />
            <span className="font-serif text-xs text-cream-dim">每日签到</span>
            <span className="ml-auto font-serif text-[10px] text-cream-faint">
              连续 {save.welfare.streak} 天 · 累计 {save.welfare.totalSignIns} 次
            </span>
          </div>

          <ul className="mt-2.5 grid grid-cols-4 gap-1.5">
            {SIGN_IN_CYCLE.map((day) => {
              const isToday = state?.day === day.day
              const claimed = !!state && (state.doneToday ? day.day <= state.day : day.day < state.day)
              const q = QUALITY[day.quality]
              return (
                <li
                  key={day.day}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-sm border px-1 py-2',
                    isToday && state?.claimable
                      ? 'border-gold-300/70 bg-gold-300/10'
                      : claimed
                        ? 'border-jade-500/40 bg-jade-800/20'
                        : 'border-gold-300/15 bg-ink-950/60',
                  )}
                  style={isToday ? { boxShadow: `inset 0 0 0 1px ${q.ring}` } : undefined}
                >
                  <span className="font-serif text-[10px] text-cream-faint">
                    {claimed ? '已领' : `第${day.day}天`}
                  </span>
                  {claimed ? (
                    <Check className="size-4 text-jade-300" />
                  ) : (
                    <RewardIcons
                      stone={scaleOf(day.stone)}
                      cultivation={scaleOf(day.cultivation)}
                      immortalJade={day.immortalJade}
                    />
                  )}
                  <span className="text-center text-[8px] leading-tight text-cream-faint/80">{day.note}</span>
                </li>
              )
            })}
          </ul>

          <div className="mt-2.5 rounded-sm border border-gold-300/10 bg-ink-950/50 px-2.5 py-2">
            {state?.claimable ? (
              <p className="text-[11px] leading-relaxed text-cream-dim">
                今日可领：{signInReward(state.day).note}
                <span className="ml-1 text-cream-faint">
                  （关卡加成 ×{scale.toFixed(2)}）
                </span>
              </p>
            ) : (
              <p className="text-[11px] leading-relaxed text-cream-faint">
                今日已签到。明日再来，连续签到第 7 天可得仙玉与凝元丹。
              </p>
            )}
            <InkButton
              variant={state?.claimable ? 'primary' : 'ghost'}
              size="lg"
              className="mt-2 w-full"
              disabled={!state?.claimable}
              onClick={handleSignIn}
            >
              {state?.claimable ? '签到领取' : '今日已签到'}
            </InkButton>
          </div>
        </Panel>

        <Panel className="mt-3 px-3 py-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-gold-300" />
            <span className="font-serif text-xs text-cream-dim">在线时长奖励</span>
            <span className="ml-auto font-serif text-[10px] text-cream-faint">
              已在线 {playMinutes} 分钟
            </span>
          </div>

          <ul className="mt-2.5 flex flex-col gap-1.5">
            {PLAY_TIME_MILESTONES.map((m) => {
              const reached = playSeconds >= m.minutes * 60
              const claimed = save.welfare.claimedPlaytime.includes(m.minutes)
              return (
                <li
                  key={m.minutes}
                  className="flex items-center gap-2 rounded-sm border border-gold-300/12 bg-ink-950/60 px-2.5 py-2"
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full',
                      claimed ? 'bg-jade-500/25 text-jade-300' : 'bg-ink-900 text-cream-faint',
                    )}
                  >
                    {claimed ? <Check className="size-3.5" /> : <Star className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-[11px] text-cream-dim">
                      {m.label} · 累计 {m.minutes >= 60 ? `${m.minutes / 60} 小时` : `${m.minutes} 分钟`}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-cream-faint">
                      灵石 {formatNumber(scaleOf(m.stone))} · 修为 {formatNumber(scaleOf(m.cultivation))}
                      {m.immortalJade ? ` · 仙玉 ${m.immortalJade}` : ''}
                    </span>
                  </span>
                  <InkButton
                    variant={reached && !claimed ? 'jade' : 'ghost'}
                    size="sm"
                    className="min-h-8 shrink-0"
                    disabled={!reached || claimed}
                    onClick={() => handleClaim(m.minutes)}
                  >
                    {claimed ? '已领' : reached ? '领取' : '未达成'}
                  </InkButton>
                </li>
              )
            })}
          </ul>
        </Panel>

        {toast && (
          <p className="mt-3 rounded-sm border border-jade-500/30 bg-jade-800/25 px-3 py-2 text-center text-[11px] leading-relaxed text-jade-200">
            {toast}
          </p>
        )}
      </div>
    </ScreenFrame>
  )
}
