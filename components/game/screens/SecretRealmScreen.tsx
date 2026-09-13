'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Crown,
  Gem,
  Gift,
  Mountain,
  RotateCw,
  ScrollText,
  Skull,
  Swords,
} from 'lucide-react'
import type { RealmNode, RealmRun, SecretRealmDef } from '@/lib/game/types'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { InkButton, Panel, SectionTitle, StatBar } from '../primitives'
import { effectLabelsFor } from '../overlays/RealmRouteOverlay'

export interface RealmBattleOutcome {
  win: boolean
  damage: number
  dps: number
  failReason?: string
}

export interface SecretRealmScreenProps {
  realm: SecretRealmDef
  node: RealmNode
  run: RealmRun
  /** 战斗结果回报给父层；父层用 outcome 回填以展示失败保护 */
  onBattleDone: (win: boolean, info: { damage: number; dps: number; failReason?: string }) => void
  onEventDone: () => void
  onLeave: () => void
  /** 由父层注入真实战斗画面 */
  battleSlot?: ReactNode
  /** 父层最近一次战斗结果 */
  outcome?: RealmBattleOutcome | null
  /** 「继续挑战」= 重开当前节点战斗 */
  onRetry?: () => void
}

const NODE_ICON = {
  battle: Swords,
  elite: Skull,
  boss: Crown,
  treasure: Gift,
  heritage: Gem,
  encounter: ScrollText,
  entry: Mountain,
} as const

/** PRD 47：只提示问题方向，不给唯一答案 */
const FAIL_HINTS = ['生存不足', '爆发不足', '护甲过高', '属性克制', '控制抗性不足']

export function SecretRealmScreen({
  realm,
  node,
  run,
  onBattleDone,
  onEventDone,
  onLeave,
  battleSlot,
  outcome,
  onRetry,
}: SecretRealmScreenProps) {
  const [losses, setLosses] = useState(0)

  useEffect(() => {
    setLosses(0)
  }, [node.id])

  useEffect(() => {
    if (outcome && !outcome.win) setLosses((n) => n + 1)
  }, [outcome])

  const Icon = NODE_ICON[node.kind]
  const isCombat = node.kind === 'battle' || node.kind === 'elite' || node.kind === 'boss'
  const progress = run.visited.length / realm.nodes.length
  const rewardLabels = effectLabelsFor(node.reward)
  const failed = Boolean(outcome && !outcome.win)

  return (
    <ScreenFrame backdrop={realm.bg}>
      <SubHeader title={realm.name} onBack={onLeave} />

      <div className="relative z-10 flex-1 overflow-y-auto px-3 pt-3 pb-4 no-scrollbar">
        <Panel className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-gold-300/35 bg-ink-950/70 text-gold-200">
              <Icon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate font-serif text-sm font-bold text-cream">
              {node.name}
            </span>
            <span className="font-serif text-[11px] tabular-nums text-cream-faint">
              {run.visited.length} / {realm.nodes.length}
            </span>
          </div>
          <StatBar value={progress} className="mt-2" />
        </Panel>

        {isCombat && (
          <div className="relative mt-3 overflow-hidden rounded-md border border-gold-300/20 bg-ink-950/70">
            {battleSlot ?? (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                <span className="flex size-14 items-center justify-center rounded-full border border-blood-400/50 bg-blood-600/15 text-blood-400">
                  <Icon className="size-6" />
                </span>
                <p className="font-serif text-[13px] leading-relaxed text-cream-dim">
                  {node.desc}
                </p>
              </div>
            )}
          </div>
        )}

        {node.kind === 'treasure' && (
          <Panel className="relative mt-3 overflow-hidden px-4 py-7">
            <span className="pointer-events-none absolute left-1/2 top-1/2 size-52 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse-glow bg-[radial-gradient(circle,rgba(7,9,8,0.92),rgba(7,9,8,0)_72%)]" />
            <span className="pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse-glow bg-[radial-gradient(circle,rgba(232,200,119,0.35),transparent_68%)]" />
            <span className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-gold-300/50 animate-spin-slow" />
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="pointer-events-none absolute bottom-6 size-1 rounded-full bg-gold-200 animate-float-up"
                style={{ left: `${28 + i * 15}%`, animationDelay: `${i * 0.28}s` }}
              />
            ))}
            <div className="relative flex flex-col items-center gap-3 text-center">
              <span className="flex size-14 items-center justify-center rounded-full border border-gold-300/60 bg-ink-950/80 text-gold-200">
                <Gift className="size-6" />
              </span>
              <h2 className="font-serif text-base font-bold text-gold-200 text-glow-gold">
                {node.name}
              </h2>
              <p className="font-serif text-[12px] leading-relaxed text-cream-dim">
                {node.desc}
              </p>
            </div>
          </Panel>
        )}

        {node.kind === 'heritage' && (
          <Panel className="relative mt-3 overflow-hidden px-4 py-7">
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse-glow bg-[radial-gradient(circle,rgba(177,140,240,0.38),transparent_70%)]" />
            <span className="pointer-events-none absolute inset-x-6 top-1/2 h-px -translate-y-1/2 animate-pulse-glow bg-gradient-to-r from-transparent via-gold-200/70 to-transparent" />
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="pointer-events-none absolute top-8 size-1 rounded-full bg-jade-200 animate-float-up"
                style={{ left: `${30 + i * 20}%`, animationDelay: `${i * 0.36}s` }}
              />
            ))}
            <div className="relative flex flex-col items-center gap-3 text-center">
              <span className="flex size-14 items-center justify-center rounded-full border border-[#b18cf0]/60 bg-ink-950/80 text-[#b18cf0]">
                <Gem className="size-6" />
              </span>
              <h2 className="font-serif text-base font-bold text-gold-200 text-glow-gold">
                {node.name}
              </h2>
              <p className="font-serif text-[12px] leading-relaxed text-cream-dim">
                {node.desc}
              </p>
            </div>
          </Panel>
        )}

        {node.kind === 'encounter' && (
          <Panel className="mt-3 px-4 py-5">
            <div className="flex justify-center">
              <span className="flex size-12 items-center justify-center rounded-[4px] rotate-[-5deg] bg-[linear-gradient(160deg,rgba(58,157,139,0.9),rgba(29,90,80,0.95))] text-cream shadow-[inset_0_0_0_1.5px_rgba(242,234,216,0.5)]">
                <ScrollText className="size-5" />
              </span>
            </div>
            <h2 className="mt-3 text-center font-serif text-base font-bold text-jade-200">
              {node.name}
            </h2>
            <p className="mt-2 font-serif text-[12px] leading-relaxed text-cream-dim">
              {node.desc}
            </p>
          </Panel>
        )}

        {rewardLabels.length > 0 && !failed && (
          <Panel className="mt-3 px-3 py-3">
            <SectionTitle>此处所获</SectionTitle>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {rewardLabels.map((label) => (
                <li
                  key={label}
                  className="rounded-[3px] border border-gold-300/25 bg-ink-950/60 px-2 py-1 font-serif text-[11px] text-gold-200"
                >
                  {label}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {failed && outcome && (
          <Panel className="mt-3 px-3.5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-blood-400" />
              <h2 className="font-serif text-sm font-bold text-blood-400 text-glow-blood">
                挑战失利
              </h2>
              <span className="ml-auto font-serif text-[10px] text-cream-faint">
                第 {losses} 次
              </span>
            </div>

            <p className="mt-2 font-serif text-[12.5px] leading-relaxed text-cream-dim">
              {outcome.failReason ?? '未能破其护体，气血先尽。'}
            </p>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-sm border border-gold-300/15 bg-ink-950/60 px-2 py-1.5">
                <dt className="text-cream-faint">造成伤害</dt>
                <dd className="font-serif tabular-nums text-cream">
                  {Math.round(outcome.damage)}
                </dd>
              </div>
              <div className="rounded-sm border border-gold-300/15 bg-ink-950/60 px-2 py-1.5">
                <dt className="text-cream-faint">每秒伤害</dt>
                <dd className="font-serif tabular-nums text-cream">
                  {Math.round(outcome.dps)}
                </dd>
              </div>
            </dl>

            <p className="mt-3 font-serif text-[11px] text-cream-faint">
              可留意之处（非唯一解法）：
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {FAIL_HINTS.map((hint) => (
                <li
                  key={hint}
                  className="rounded-[3px] border border-blood-400/25 bg-blood-600/10 px-2 py-0.5 font-serif text-[10.5px] text-blood-400/95"
                >
                  {hint}
                </li>
              ))}
            </ul>

            {losses >= 2 && (
              <p className="mt-3 rounded-sm border border-jade-500/25 bg-jade-800/20 px-2.5 py-2 font-serif text-[11px] leading-relaxed text-jade-200">
                连续失利：可回功法 / 装备 / 灵根处换一套思路，再来试这条路线。
              </p>
            )}

            <div className="mt-3.5 flex gap-2">
              <InkButton variant="ghost" size="lg" className="flex-1 px-3 text-[13px]" onClick={onLeave}>
                返回稳定关卡挂机
              </InkButton>
              {/* 未提供 onRetry 时，把「继续挑战」回报成一次新的战斗结果，父层据此重开本节点 */}
              <InkButton
                variant="primary"
                size="lg"
                className="flex-1 px-3 text-[13px]"
                onClick={onRetry ?? (() => onBattleDone(false, outcome))}
              >
                <RotateCw className="size-4" />
                继续挑战
              </InkButton>
            </div>
          </Panel>
        )}

        {!failed && (node.kind === 'treasure' || node.kind === 'heritage') && (
          <div className="mt-4">
            <InkButton variant="primary" size="lg" className="w-full" onClick={onEventDone}>
              收下此物，继续前行
            </InkButton>
          </div>
        )}

        {!failed && node.kind === 'encounter' && (
          <div className="mt-4">
            <InkButton variant="jade" size="lg" className="w-full" onClick={onEventDone}>
              继续
            </InkButton>
          </div>
        )}

        {!failed && isCombat && (
          <div className="mt-4">
            <InkButton variant="ghost" size="lg" className="w-full" onClick={onLeave}>
              暂离秘境
            </InkButton>
          </div>
        )}
      </div>
    </ScreenFrame>
  )
}
