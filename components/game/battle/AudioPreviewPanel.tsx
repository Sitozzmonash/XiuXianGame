'use client'

/* ------------------------------------------------------------------ *
 * 音效试听面板 —— 开发验收用
 * 逐个点击即可试听全部音效；也会自动解锁 AudioContext。
 * ------------------------------------------------------------------ */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { isSfxEnabled, playSfx, setSfxEnabled, unlockAudio, type SfxName } from '@/lib/game/audio'
import { InkButton } from '../primitives'

const GROUPS: { title: string; names: SfxName[] }[] = [
  {
    title: '战斗',
    names: ['hit', 'sword', 'crit', 'thunder', 'fire', 'water', 'wood', 'earth', 'soul'],
  },
  { title: '状态', names: ['shield', 'heal', 'boss', 'kill', 'victory', 'defeat'] },
  { title: '掉落', names: ['dropNormal', 'dropHigh', 'dropRed'] },
  { title: '成长', names: ['breakthrough', 'alchemy', 'forge', 'reward'] },
  { title: '界面', names: ['uiTap', 'uiConfirm', 'storyChoice'] },
]

export function AudioPreviewPanel() {
  const [on, setOn] = useState(isSfxEnabled())
  const [last, setLast] = useState<SfxName | null>(null)

  const fire = (n: SfxName) => {
    unlockAudio()
    playSfx(n)
    setLast(n)
  }

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-20 max-h-[46%] overflow-y-auto rounded-md border border-gold-300/25 bg-ink-950/92 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-serif text-[11px] tracking-[0.24em] text-gold-300/80">
          音效试听
        </span>
        <span className="text-[10px] text-cream-faint">
          {last ? `刚播：${last}` : '点击任意按钮试听'}
        </span>
        <InkButton
          size="sm"
          variant={on ? 'jade' : 'ghost'}
          className="ml-auto"
          onClick={() => {
            const next = !on
            setOn(next)
            setSfxEnabled(next)
            if (next) {
              unlockAudio()
              playSfx('uiConfirm')
            }
          }}
        >
          {on ? '音效开' : '音效关'}
        </InkButton>
      </div>

      {GROUPS.map((g) => (
        <div key={g.title} className="mb-2 last:mb-0">
          <p className="mb-1 font-serif text-[10px] tracking-[0.2em] text-cream-faint">
            {g.title}
          </p>
          <div className="flex flex-wrap gap-1">
            {g.names.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => fire(n)}
                className={cn(
                  'rounded-sm border px-2 py-1 font-serif text-[10px] transition-colors',
                  last === n
                    ? 'border-gold-300/70 bg-gold-400/20 text-gold-200'
                    : 'border-gold-300/20 bg-ink-900/70 text-cream-dim hover:text-gold-200',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AudioPreviewPanel
