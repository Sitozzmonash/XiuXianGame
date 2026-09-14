'use client'

/* ------------------------------------------------------------------ *
 * 战斗驱动 hook —— 表现层与战斗引擎之间的桥
 *
 * 战斗实例由状态层（store.startBattle）创建，本 hook 只负责按帧推进、
 * 收集事件、在结束后停留一段时间播完特效，然后把结果交回调用方。
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LiveBattle } from '@/lib/game/engine/battle'
import type { BattleEvent, LiveBattleState } from '@/lib/game/types'

const FIXED_DT = 1 / 60
const MAX_STEPS_PER_FRAME = 12
/** 胜利后停留时间，用于播完掉落光柱与击杀特效 */
const VICTORY_HOLD = 2.2
const DEFEAT_HOLD = 1.4

export interface BattleEnemyView {
  name: string
  image?: string
  icon?: string
  isBoss: boolean
  element?: string
}

export interface BattleResultInfo {
  win: boolean
  damage: number
  dps: number
  duration: number
  failReason?: string
  /** 战斗过程中的掉落类事件 */
  dropEvents: BattleEvent[]
}

export interface UseBattleDriverOptions {
  /** 由 store.startBattle() 创建的战斗实例；传 null 表示尚未就绪 */
  battle: LiveBattle | null
  /** 自动战斗开关。关闭时暂停推进 */
  auto: boolean
  /** 倍速 1 / 2 / 3 */
  speed: number
  /** 特效停留播完后回调 */
  onFinish?: (info: BattleResultInfo) => void
  /** 提前结束（跳过）：跳过时不停留，直接回调 */
  onSkip?: (info: BattleResultInfo) => void
}

export interface BattleDriver {
  state: LiveBattleState | null
  /** 累积到当前帧的事件，交给 BattleCanvas */
  events: BattleEvent[]
  /** 战斗结束但特效仍在播放 */
  settling: boolean
  result: BattleResultInfo | null
  /** 跳过战斗过程，直接出结果 */
  skip: () => void
  /** 是否正在战斗中 */
  running: boolean
}

export function useBattleDriver({
  battle,
  auto,
  speed,
  onFinish,
  onSkip,
}: UseBattleDriverOptions): BattleDriver {
  const [state, setState] = useState<LiveBattleState | null>(null)
  const [events, setEvents] = useState<BattleEvent[]>([])
  const [settling, setSettling] = useState(false)
  const [result, setResult] = useState<BattleResultInfo | null>(null)

  const bufferRef = useRef<BattleEvent[]>([])
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef(0)
  const accRef = useRef(0)
  const holdRef = useRef(0)
  const finishedRef = useRef(false)
  const autoRef = useRef(auto)
  const speedRef = useRef(speed)
  const onFinishRef = useRef(onFinish)
  const onSkipRef = useRef(onSkip)
  const damageRef = useRef(0)

  autoRef.current = auto
  speedRef.current = speed
  onFinishRef.current = onFinish
  onSkipRef.current = onSkip

  /** 收事件入缓冲，同时累计玩家打出的总伤害（结算面板的「总伤害」） */
  const collect = useCallback((produced: BattleEvent[]) => {
    if (!produced.length) return
    bufferRef.current.push(...produced)
    for (const e of produced) {
      if ((e.type === 'hit' || e.type === 'crit') && e.to === 'enemy' && typeof e.value === 'number') {
        damageRef.current += e.value
      }
    }
  }, [])

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const buildResult = useCallback((lb: LiveBattle): BattleResultInfo => {
    const st = lb.state
    const dropEvents = st.events.filter(
      (e) => e.type === 'drop' || e.type === 'victory',
    )
    return {
      win: st.win,
      damage: Math.round(damageRef.current),
      dps: Math.round(st.dps),
      duration: st.time,
      failReason: st.win ? undefined : lb.failReason(),
      dropEvents,
    }
  }, [])

  /* 战斗实例变化时重开循环 */
  useEffect(() => {
    stopLoop()
    if (!battle) {
      setState(null)
      setEvents([])
      setResult(null)
      setSettling(false)
      return
    }

    finishedRef.current = false
    holdRef.current = 0
    accRef.current = 0
    lastRef.current = 0
    damageRef.current = 0
    bufferRef.current = []
    setResult(null)
    setSettling(false)
    setState({ ...battle.state })
    setEvents([])

    const loop = (now: number) => {
      const last = lastRef.current || now
      lastRef.current = now
      // 切后台回来时可能积压大量时间，钳制避免一次推进过多
      const elapsed = Math.min(0.25, (now - last) / 1000)

      if (!finishedRef.current) {
        const dt = autoRef.current ? elapsed * speedRef.current : 0
        accRef.current += dt
        let steps = 0
        while (accRef.current >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
          collect(battle.tick(FIXED_DT))
          accRef.current -= FIXED_DT
          steps++
        }
        if (steps >= MAX_STEPS_PER_FRAME) accRef.current = 0

        if (battle.state.done) {
          finishedRef.current = true
          holdRef.current = battle.state.win ? VICTORY_HOLD : DEFEAT_HOLD
          setSettling(true)
        }
      } else {
        holdRef.current -= elapsed
        if (holdRef.current <= 0) {
          const info = buildResult(battle)
          setResult(info)
          setSettling(false)
          stopLoop()
          onFinishRef.current?.(info)
          return
        }
      }

      setState({ ...battle.state })
      setEvents(bufferRef.current.slice())
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return stopLoop
  }, [battle, buildResult, collect, stopLoop])

  useEffect(() => () => stopLoop(), [stopLoop])

  /** 跳过：把剩余模拟一次性跑完，随后走正常的停留 → 回调流程 */
  const skip = useCallback(() => {
    if (!battle || finishedRef.current) return
    let guard = 0
    while (!battle.state.done && guard < 20000) {
      collect(battle.tick(FIXED_DT * 4))
      guard++
    }
    if (!battle.state.done) battle.tick(120)
    finishedRef.current = true
    holdRef.current = 0.6
    setSettling(true)
    setState({ ...battle.state })
    setEvents(bufferRef.current.slice())
    const info = buildResult(battle)
    onSkipRef.current?.(info)
  }, [battle, buildResult, collect])

  return useMemo(
    () => ({
      state,
      events,
      settling,
      result,
      skip,
      running: !!state && !state.done,
    }),
    [state, events, settling, result, skip],
  )
}
