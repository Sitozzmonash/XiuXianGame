'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { InkButton } from '../primitives'
import { BattleCanvas } from './BattleCanvas'
import { BattleHud, type HudTreasure } from './BattleHud'
import type { BattleEvent, LiveBattleState } from '@/lib/game/types'

/* ------------------------------------------------------------------ *
 * 开发预览：无战斗引擎时肉眼验证特效与 HUD 的临时页面
 * ------------------------------------------------------------------ */

const ENEMY = {
  name: '黑风岭妖狼 · 王',
  image: '/images/boss-black-wolf.png',
  icon: 'beast',
  isBoss: true,
}
const PLAYER = { name: '凡尘散人', image: '/images/player-swordsman.png' }

const TOTAL = 11

const SCRIPT: BattleEvent[] = [
  { t: 0.3, type: 'cast', from: 'player', to: 'enemy', fx: 'sword', label: '飞剑术' },
  { t: 0.75, type: 'hit', from: 'player', to: 'enemy', value: 1240, fx: 'sword', damageType: 'metal' },
  { t: 1.15, type: 'crit', from: 'player', to: 'enemy', value: 4820, crit: true, fx: 'sword' },
  { t: 1.7, type: 'cast', from: 'player', to: 'enemy', fx: 'thunder', label: '五雷诀' },
  { t: 2.05, type: 'crit', from: 'player', to: 'enemy', value: 6150, crit: true, fx: 'thunder' },
  { t: 2.5, type: 'cast', from: 'player', to: 'enemy', fx: 'fire', label: '镇邪符' },
  { t: 2.85, type: 'hit', from: 'player', to: 'enemy', value: 980, fx: 'fire', damageType: 'fire' },
  { t: 3.2, type: 'hit', from: 'player', to: 'enemy', value: 1120, fx: 'fire', damageType: 'fire' },
  { t: 3.6, type: 'shield', from: 'enemy', to: 'enemy', value: 4200 },
  { t: 4.0, type: 'cast', from: 'enemy', to: 'player', fx: 'soul', label: '摄魂咒' },
  { t: 4.35, type: 'hit', from: 'enemy', to: 'player', value: 1560, fx: 'soul', damageType: 'soul' },
  { t: 4.7, type: 'hit', from: 'player', to: 'enemy', value: 1330, fx: 'sword', damageType: 'metal' },
  { t: 5.05, type: 'heal', from: 'player', to: 'player', value: 860 },
  { t: 5.4, type: 'summon', from: 'enemy', to: 'enemy' },
  { t: 5.8, type: 'hit', from: 'player', to: 'enemy', value: 1420, fx: 'water', damageType: 'water' },
  { t: 6.15, type: 'hit', from: 'player', to: 'enemy', value: 1180, fx: 'wood', damageType: 'wood' },
  { t: 6.5, type: 'hit', from: 'player', to: 'enemy', value: 1650, fx: 'earth', damageType: 'earth' },
  { t: 6.9, type: 'crit', from: 'player', to: 'enemy', value: 7240, crit: true, fx: 'fire' },
  { t: 7.4, type: 'enrage', from: 'enemy', to: 'enemy' },
  { t: 7.8, type: 'cast', from: 'player', to: 'enemy', fx: 'burst', label: '剑阵 · 惊鸿' },
  { t: 8.1, type: 'crit', from: 'player', to: 'enemy', value: 9180, crit: true, fx: 'burst' },
  { t: 8.5, type: 'kill', from: 'player', to: 'enemy' },
  { t: 8.9, type: 'drop', from: 'enemy', label: '玄品 · 寒星剑', icon: 'blue' },
  { t: 9.3, type: 'drop', from: 'enemy', label: '地品 · 玄玉符', icon: 'purple' },
  { t: 9.8, type: 'victory', from: 'player', to: 'all' },
]

const TREASURES: HudTreasure[] = [
  { id: 'flying-sword', name: '飞剑术', icon: 'sword', cooldown: 3.2, remaining: 0, quality: 'blue' },
  { id: 'ward-talisman', name: '镇邪符', icon: 'talisman', cooldown: 8, remaining: 0, quality: 'orange' },
  { id: 'clear-wind', name: '清风诀', icon: 'wind', cooldown: 6, remaining: 0, quality: 'green' },
  { id: 'soul-banner', name: '摄魂咒', icon: 'banner', cooldown: 12, remaining: 0, quality: 'purple' },
  { id: 'thunder-rite', name: '五雷诀', icon: 'thunder', cooldown: 15, remaining: 0, quality: 'red' },
]

const PASSIVES = [
  { id: 'jade-guard', name: '玄玉护体', icon: 'shield' },
  { id: 'spirit-ring', name: '聚灵环', icon: 'ring' },
]

const PET = { name: '小狐狸', icon: 'beast', hp: 3200, maxHp: 4200 }

export function BattlePreview() {
  const [clock, setClock] = useState(0)
  const [quality, setQuality] = useState<'low' | 'mid' | 'high'>('high')
  const [runId, setRunId] = useState(0)
  const eventsRef = useRef<BattleEvent[]>([])
  const [events, setEvents] = useState<BattleEvent[]>([])

  useEffect(() => {
    eventsRef.current = []
    setEvents([])
    setClock(0)
    let t = 0
    const id = window.setInterval(() => {
      t += 0.1
      if (t > TOTAL) {
        t = 0
        eventsRef.current = []
      }
      const due = SCRIPT.filter((e) => e.t <= t)
      if (due.length !== eventsRef.current.length) {
        eventsRef.current = due.slice()
        setEvents(eventsRef.current)
      }
      setClock(t)
    }, 100)
    return () => window.clearInterval(id)
  }, [runId])

  const state = useMemo<LiveBattleState>(() => {
    const enemyMaxHp = 268000
    const playerMaxHp = 96000
    const k = Math.max(0, 1 - clock / 8.6)
    return {
      time: clock,
      playerHp: playerMaxHp * Math.max(0.62, 1 - clock / 22),
      playerMaxHp,
      playerShield: clock > 5.1 && clock < 6.6 ? 5200 : 0,
      enemyHp: enemyMaxHp * k,
      enemyMaxHp,
      enemyShield: clock > 3.6 && clock < 7.4 ? Math.max(0, 4200 - (clock - 3.6) * 900) : 0,
      petHp: PET.hp,
      petMaxHp: PET.maxHp,
      skillCds: TREASURES.map((tr, i) => {
        const cycle = (clock + i * 1.7) % (tr.cooldown + 2)
        return cycle < tr.cooldown ? tr.cooldown - cycle : 0
      }),
      done: clock > 9.8,
      win: true,
      dps: 4200 + Math.round(Math.sin(clock * 3) * 600),
      events,
    }
  }, [clock, events])

  const treasures = TREASURES.map((t, i) => ({ ...t, remaining: state.skillCds[i] ?? 0 }))

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-ink-950">
      <BattleCanvas
        events={events}
        state={state}
        enemy={ENEMY}
        player={PLAYER}
        width={390}
        height={844}
        quality={quality}
        finished={state.done}
      />
      <BattleHud
        state={state}
        enemy={ENEMY}
        player={PLAYER}
        treasures={treasures}
        passives={PASSIVES}
        pet={PET}
        timeLeft={Math.max(0, TOTAL - clock)}
      />
      <div className="absolute right-3 top-24 z-10 flex flex-col items-end gap-2">
        <div className="flex gap-1">
          {(['low', 'mid', 'high'] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuality(q)}
              className={
                q === quality
                  ? 'rounded-sm border border-gold-300/60 bg-gold-400/20 px-2 py-0.5 font-serif text-[10px] text-gold-200'
                  : 'rounded-sm border border-gold-300/20 bg-ink-950/70 px-2 py-0.5 font-serif text-[10px] text-cream-faint'
              }
            >
              {q}
            </button>
          ))}
        </div>
        <InkButton size="sm" variant="ghost" onClick={() => setRunId((v) => v + 1)}>
          重播
        </InkButton>
      </div>
    </div>
  )
}

export default BattlePreview
