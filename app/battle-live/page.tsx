'use client'

import { useState } from 'react'
import { BattleScreen } from '@/components/game/screens/BattleScreen'
import { createDemoSave } from '@/components/game/demoSave'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 战斗页验收路由 —— 用演示存档直接挂载真实战斗页，跳过登录流程
 * 可通过顶部档位切换查看不同强度的战斗表现
 * ------------------------------------------------------------------ */

const TIERS = [
  { label: '炼气一层', power: 0, stage: 3 },
  { label: '炼气五层', power: 0.5, stage: 25 },
  { label: '炼气圆满', power: 1, stage: 45 },
]

export default function BattleLivePage() {
  const [tier, setTier] = useState(0)
  const [save, setSave] = useState(() => createDemoSave({ power: TIERS[0].power }))
  const [stage, setStage] = useState(TIERS[0].stage)

  const pick = (i: number) => {
    setTier(i)
    setSave(createDemoSave({ power: TIERS[i].power }))
    setStage(TIERS[i].stage)
  }

  return (
    <main className="min-h-[100dvh] bg-ink-950">
      <div className="fixed left-1/2 top-2 z-[60] flex -translate-x-1/2 gap-1">
        {TIERS.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => pick(i)}
            className={cn(
              'rounded-sm border px-2.5 py-1 font-serif text-[11px]',
              i === tier
                ? 'border-gold-300/70 bg-gold-400/20 text-gold-200'
                : 'border-gold-300/20 bg-ink-950/80 text-cream-faint',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-[100dvh] items-center justify-center sm:p-6">
        <div className="relative h-[100dvh] w-full max-w-[430px] overflow-hidden bg-ink-950 sm:h-[880px] sm:max-h-[94vh] sm:rounded-[2rem] sm:ring-1 sm:ring-gold-300/20">
          <BattleScreen
            key={`${tier}-${stage}`}
            save={save}
            stage={stage}
            onBack={() => undefined}
            onBattleWin={() => undefined}
            onBattleLose={() => undefined}
            onNextStage={() => setStage((v) => v + 1)}
            onOpenTreasure={() => undefined}
            onExit={() => undefined}
          />
        </div>
      </div>
    </main>
  )
}
