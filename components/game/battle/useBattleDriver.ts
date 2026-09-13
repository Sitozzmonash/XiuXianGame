'use client'

/* ------------------------------------------------------------------ *
 * 战斗驱动 hook —— UI 与战斗引擎之间的桥
 *
 * 职责边界：本 hook 只负责「把引擎推进、把结果交出去」，不持有存档、
 * 不修改存档。调用方传入 save 快照与关卡号，战斗结束后由 onFinish 回调
 * 把结果交回给状态层结算。
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LiveBattle } from '@/lib/game/engine/battle'
import { TREASURE_BY_ID, getStage } from '@/lib/game/config'
import type { BattleEvent, GameSave, LiveBattleState } from '@/lib/game/types'

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
  element: string
}

export interface BattleResultInfo {
  win: boolean
  damage: number
  dps: number
  duration: number
  failReason?: string
  drops: BattleEvent[]
}

export interface UseBattleDriverOptions {
  /** 存档快照。战斗期间不再读取，保证战斗过程不被中途状态变化干扰 */
  save: GameSave | null
  /** 全局关卡序号 */
  stage: number
  /** 自动战斗开关。关闭时战斗暂停，由调用方手动推进 */
  auto: boolean
  /** 倍速 1 / 2 / 3 */
  speed: number
  /** 战斗结束（含特效停留）后回调 */
  onFinish?: (info: BattleResultInfo) => void
}

export interface BattleDriver {
  state: LiveBattleState | null
  /** 本帧新增的事件，交给 BattleCanvas */
  events: BattleEvent[]
  enemy: BattleEnemyView
  /** 战斗结束但特效仍在播放 */
  settling: boolean
  /** 最近一次战斗结果 */
  result: BattleResultInfo | null
  /** 手动开始 / 重新挑战 */
  start: () => void
  /** 跳过当前战斗的战斗过程，直接出结果 */
  skip: () => void
  /** 是否正在战斗 */
  running: boolean
}

export function useBattleDriver({
  save,
  stage,
  auto,
  speed,
  onFinish,
}: UseBattleDriverOptions): BattleDriver {
  const [state, setState] = useState<LiveBattleState | null>(null)
  const [events, setEvents] = useState<BattleEvent[]>([])
  const [settling, setSettling] = useState(false)
  const [result, setResult] = useState<BattleResultInfo | null>(null)

  const battleRef = useRef<LiveBattle | null>(null)
  const bufferRef = useRef<BattleEvent[]>([])
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef(0)
  const accRef = useRef(0)
  const holdRef = useRef(0)
  const finishedRef = useRef(false)
  const autoRef = useRef(auto)
  const speedRef = useRef(speed)
  const onFinishRef = useRef(onFinish)

  autoRef.current = auto
  speedRef.current = speed
  onFinishRef.current = onFinish

  /** 从配置推导敌方的展示信息 */
  const enemy = useMemo<BattleEnemyView>(() => {
    const info = getStageSafe(stage)
    return {
      name: info.name,
      image: info.image,
      icon: info.icon,
      isBoss: info.isBoss,
      element: info.element,
    }
  }, [stage])

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const buildResult = useCallback((battle: LiveBattle): BattleResultInfo => {
    const st = battle.state
    const drops = st.events.filter((e) => e.type === 'drop')
    return {
      win: st.win,
      damage: Math.round(st.dps * Math.max(0.5, st.time)),
      dps: Math.round(st.dps),
      duration: st.time,
      failReason: st.win ? undefined : battle.failReason(),
      drops,
    }
  }, [])

  /** 创建一场新战斗 */
  const start = useCallback(() => {
    if (!save) return
    stopLoop()
    finishedRef.current = false
    holdRef.current = 0
    accRef.current = 0
    bufferRef.current = []
    setResult(null)
    setSettling(false)

    const battle = new LiveBattle({ save, globalStage: stage })
    battleRef.current = battle
    setState({ ...battle.state })
    setEvents([])

    const loop = (now: number) => {
      const battle = battleRef.current
      if (!battle) return
      const last = lastRef.current || now
      lastRef.current = now
      // 切后台回来时可能积压大量时间，钳制避免一次推进过多
      const elapsed = Math.min(0.25, (now - last) / 1000)

      if (!finishedRef.current) {
        const dt = autoRef.current ? elapsed * speedRef.current : 0
        accRef.current += dt
        let steps = 0
        while (accRef.current >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
          const produced = battle.tick(FIXED_DT)
          if (produced.length) bufferRef.current.push(...produced)
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

    lastRef.current = 0
    rafRef.current = requestAnimationFrame(loop)
  }, [save, stage, buildResult, stopLoop])

  /** 跳过：把剩余的模拟一次性跑完，然后进入停留阶段 */
  const skip = useCallback(() => {
    const battle = battleRef.current
    if (!battle || finishedRef.current) return
    let guard = 0
    while (!battle.state.done && guard < 20000) {
      const produced = battle.tick(FIXED_DT * 4)
      if (produced.length) bufferRef.current.push(...produced)
      guard++
    }
    finishedRef.current = true
    holdRef.current = 0.6
    setSettling(true)
    setState({ ...battle.state })
    setEvents(bufferRef.current.slice())
  }, [])

  /** save / stage 变化时重开一场 */
  useEffect(() => {
    if (!save) return
    start()
    return stopLoop
    // 只在关卡变化时重开；save 引用变化由调用方通过 start() 显式控制
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, start])

  useEffect(() => {
    return () => {
      stopLoop()
      battleRef.current = null
    }
  }, [stopLoop])

  return {
    state,
    events,
    enemy,
    settling,
    result,
    start,
    skip,
    running: !!state && !state.done,
  }
}

/** 从关卡配置安全推导敌方展示信息；配置缺失时给出兜底，绝不抛异常 */
function getStageSafe(globalStage: number): {
  name: string
  image?: string
  icon?: string
  isBoss: boolean
  element: string
} {
  try {
    const { stage, monster } = getStage(globalStage)
    const isBoss = monster?.kind === 'boss'
    const portraits: Record<string, string> = {
      boss_placeholder_shanjun: '/images/boss-black-wolf.png',
    }
    const iconToImage: Record<string, string> = {
      beast: '/images/boss-black-wolf.png',
      wolf: '/images/boss-black-wolf.png',
    }
    const image =
      (monster && portraits[monster.id]) ||
      (monster && iconToImage[monster.icon]) ||
      (isBoss ? '/images/boss-black-wolf.png' : undefined)
    return {
      name: monster?.name ?? stage.name,
      image,
      icon: monster?.icon,
      isBoss,
      element: monster?.element ?? 'physical',
    }
  } catch {
    return { name: '未知妖物', isBoss: false, element: 'physical' }
  }
}

/** 从主动法宝槽推导 HUD 需要的冷却信息 */
export function hudTreasuresFor(save: GameSave | null): {
  id: string
  name: string
  icon: string
  cooldown: number
  quality?: string
}[] {
  if (!save) return []
  return save.combat.activeTreasures
    .filter((id): id is string => !!id)
    .map((id) => {
      const def = TREASURE_BY_ID[id]
      if (!def) return null
      return {
        id: def.id,
        name: def.name,
        icon: def.icon,
        cooldown: def.cooldown,
        quality: def.quality,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
}
