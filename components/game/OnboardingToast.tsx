'use client'

/* ------------------------------------------------------------------ *
 * 新手指引 —— 按 PRD 第 34 章的解锁节奏逐条提示
 *
 * 原则：系统很多，但不能一次全塞给新玩家。每个里程碑只在首次达成时
 * 提示一次（已提示记录写在存档 flags 里），并且一次只弹一条。
 * ------------------------------------------------------------------ */

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/lib/game/state/store'
import { GameIcon } from './GameIcon'
import { InkButton } from './primitives'
import type { GameSave } from '@/lib/game/types'

export interface OnboardingStep {
  /** 唯一 id，用于记录是否已提示 */
  id: string
  /** 达成条件：最高关卡达到该值 */
  atStage?: number
  /** 达成条件：大境界序号达到该值（0 起的 REALMS 下标） */
  atRealmIndex?: number
  icon: string
  title: string
  desc: string
  /** 提示语里要玩家点去的界面 */
  hint?: string
}

/** 解锁节奏与 PRD 第 34 章一致 */
export const ONBOARDING: OnboardingStep[] = [
  {
    id: 'ob_combat',
    atStage: 1,
    icon: 'sword',
    title: '自动战斗',
    desc: '点击「挑战」即可开战。角色会自动普攻、放法宝、动功法，你只需要负责构筑与判断。',
    hint: '战斗画面点「跳过」可直接看结算',
  },
  {
    id: 'ob_equipment',
    atStage: 3,
    icon: 'boxes',
    title: '装备与背包',
    desc: '击败妖兽会掉落装备。打开背包可穿戴、强化、分解，词条越好越值得留下。',
    hint: '背包 → 一键穿戴',
  },
  {
    id: 'ob_treasure',
    atStage: 10,
    icon: 'vase',
    title: '法宝',
    desc: '法宝是战斗画面的主角：飞剑、雷符、护盾都由它们驱动。可带 5 件主动、2 件被动。',
    hint: '法宝 → 调整出战顺序',
  },
  {
    id: 'ob_enhance',
    atStage: 20,
    icon: 'anvil',
    title: '装备强化',
    desc: '强化等级在更换装备时会无损继承，可以放心堆。',
    hint: '背包 → 点装备 → 强化',
  },
  {
    id: 'ob_technique',
    atStage: 30,
    icon: 'book',
    title: '功法',
    desc: '功法决定流派方向。主修 1 本、辅助 3 本，与法宝、灵根形成联动。',
    hint: '功法 → 设为主修',
  },
  {
    id: 'ob_school',
    atRealmIndex: 0,
    icon: 'lotus',
    title: '灵根与流派',
    desc: '灵根决定属性倾向，但不锁定职业。五行相生相克，可在战斗中换属性针对 Boss。',
    hint: '角色 → 查看灵根',
  },
  {
    id: 'ob_encounter',
    atStage: 40,
    icon: 'scroll',
    title: '奇遇',
    desc: '推关途中会遇到奇遇事件。选择会真实影响人物关系与因果，不只是一句台词。',
    hint: '选择结果可随时在「仙途录」回顾',
  },
  {
    id: 'ob_saga',
    atStage: 50,
    icon: 'map',
    title: '仙途录',
    desc: '章节、因果、人物、足迹都记在这里。你的每个选择都会留在这一页上。',
    hint: '主界面 → 仙途录',
  },
  {
    id: 'ob_breakthrough',
    atRealmIndex: 1,
    icon: 'burst',
    title: '境界突破',
    desc: '修为圆满、材料集齐即可突破。突破失败不掉境界、不掉装备、修为不清零。',
    hint: '修炼 → 突破境界',
  },
  {
    id: 'ob_realm',
    atRealmIndex: 1,
    icon: 'gate',
    title: '秘境',
    desc: '秘境是 Roguelite 路线：自己选路、开宝箱、遇奇遇、取传承。首个完整秘境是落霞古洞府。',
    hint: '侧栏 → 秘境',
  },
]

export interface OnboardingToastProps {
  /** 只在主界面这类空闲场景弹，避免打断战斗 */
  enabled: boolean
}

export function OnboardingToast({ enabled }: OnboardingToastProps) {
  const save = useGameStore((s) => s.save)
  /** 本条提示是否已写回存档（避免同一帧反复入队） */
  const [dismissed, setDismissed] = useState<string[]>([])

  const next = useMemo(() => pickNext(save, dismissed), [save, dismissed])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled || !next) {
      setVisible(false)
      return
    }
    // 稍微延后一点出现，避免和结算 / 剧情 Overlay 抢注意力
    const t = window.setTimeout(() => setVisible(true), 600)
    return () => window.clearTimeout(t)
  }, [enabled, next])

  if (!enabled || !next || !visible) return null

  const close = () => {
    setVisible(false)
    setDismissed((prev) => [...prev, next.id])
    // 记录到存档，跨会话不再重复提示
    useGameStore.setState((s) => ({
      save: {
        ...s.save,
        story: {
          ...s.save.story,
          flags: { ...s.save.story.flags, [`seen_${next.id}`]: true },
        },
      },
    }))
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[60] flex justify-center px-4">
      <div
        className={cn(
          'pointer-events-auto w-full max-w-[380px] rounded-md border border-gold-300/35',
          'bg-ink-950/96 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.7)]',
          'animate-[rise_0.45s_cubic-bezier(0.22,1,0.36,1)_both]',
        )}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-sm bg-ink-900 text-gold-200 ring-1 ring-inset ring-gold-300/35">
            <GameIcon name={next.icon} className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-xs tracking-[0.2em] text-gold-300/80">
              新解锁 · {next.title}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-cream-dim">{next.desc}</p>
            {next.hint && (
              <p className="mt-1.5 text-[10px] leading-relaxed text-jade-300/90">
                {next.hint}
              </p>
            )}
          </div>
        </div>
        <div className="mt-2.5 flex justify-end">
          <InkButton variant="ghost" size="sm" onClick={close}>
            知道了
          </InkButton>
        </div>
      </div>
    </div>
  )
}

/** 找出第一条已达成但还没提示过的指引 */
function pickNext(save: GameSave, dismissed: string[]): OnboardingStep | null {
  const realmIndex = realmIndexOf(save)
  for (const step of ONBOARDING) {
    const key = `seen_${step.id}`
    if (save.story.flags[key] || dismissed.includes(step.id)) continue
    const stageOk = step.atStage === undefined || save.progress.maxStage >= step.atStage
    const realmOk = step.atRealmIndex === undefined || realmIndex >= step.atRealmIndex
    if (stageOk && realmOk) return step
  }
  return null
}

function realmIndexOf(save: GameSave): number {
  const order = [
    'qi_refining',
    'foundation',
    'core_formation',
    'nascent_soul',
    'spirit_transform',
    'void_refining',
    'body_integration',
    'great_vehicle',
    'tribulation',
    'ascension',
  ]
  return Math.max(0, order.indexOf(save.profile.realmId))
}
