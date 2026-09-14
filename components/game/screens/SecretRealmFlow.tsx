'use client'

/* ------------------------------------------------------------------ *
 * 秘境编排 —— 把「路线选点 → 战斗 / 事件 → 结算」串成一个流程
 *
 * store 只提供原子动作（enterRealm / moveToNode / startRealmBattle /
 * resolveRealmBattle / leaveRealm），推进节奏与战斗画面注入在这里完成。
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '@/lib/game/state/store'
import { availableNodes, nodeOf, realmById } from '@/lib/game/engine/realm'
import { MONSTER_BY_ID } from '@/lib/game/config/maps'
import { TREASURE_BY_ID } from '@/lib/game/config/treasures'
import { PET_BY_ID } from '@/lib/game/config/pets'
import { monsterArt } from '@/lib/game/ui-art'
import type { LiveBattle } from '@/lib/game/engine/battle'
import type { GameSave, Quality, RealmNode, RealmRun } from '@/lib/game/types'
import type { SecretRealmDef } from '@/lib/game/types'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/game/utils'
import { BattleCanvas } from '../battle/BattleCanvas'
import { BattleHud, type HudTreasure } from '../battle/BattleHud'
import { useBattleDriver } from '../battle/useBattleDriver'
import { SecretRealmScreen, type RealmBattleOutcome } from '../screens/SecretRealmScreen'
import { RealmRouteOverlay } from '../overlays/RealmRouteOverlay'
import { InkButton } from '../primitives'

export interface SecretRealmFlowProps {
  realmId: string
  onLeave: () => void
}

/** 秘境战斗的时长上限，与关卡战斗保持一致 */
const TIME_LIMIT = 90

export function SecretRealmFlow({ realmId, onLeave }: SecretRealmFlowProps) {
  const realm = useMemo<SecretRealmDef | undefined>(() => realmById(realmId), [realmId])
  const save = useGameStore((s) => s.save)
  const enterRealm = useGameStore((s) => s.enterRealm)
  const moveToNode = useGameStore((s) => s.moveToNode)
  const startRealmBattle = useGameStore((s) => s.startRealmBattle)
  const resolveRealmBattle = useGameStore((s) => s.resolveRealmBattle)
  const leaveRealm = useGameStore((s) => s.leaveRealm)

  const [showRoute, setShowRoute] = useState(false)
  const [battle, setBattle] = useState<LiveBattle | null>(null)
  const [outcome, setOutcome] = useState<RealmBattleOutcome | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 390, height: 520 })

  const run: RealmRun | null = save.realmRun

  /* 进入页面时若还没在秘境里，先开门 */
  useEffect(() => {
    if (!realm) return
    const current = useGameStore.getState().save.realmRun
    if (!current || current.realmId !== realmId) {
      enterRealm(realmId)
      setShowRoute(true)
    }
  }, [realm, realmId, enterRealm])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box) setSize({ width: Math.round(box.width), height: Math.round(box.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const node: RealmNode | null = useMemo(() => {
    if (!realm || !run) return null
    return nodeOf(realm, run.currentNode) ?? null
  }, [realm, run])

  const isBattleNode =
    node?.kind === 'battle' || node?.kind === 'elite' || node?.kind === 'boss'

  /* 进入战斗节点时自动开打 */
  useEffect(() => {
    if (!node || !isBattleNode || battle || outcome) return
    const lb = startRealmBattle(node.id)
    if (lb) setBattle(lb)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id, isBattleNode])

  const handleFinish = useCallback(
    (win: boolean, failReason?: string) => {
      const info = { damage: 0, dps: 0, failReason }
      setOutcome({ win, ...info })
      resolveRealmBattle(node?.id ?? '', win)
      setBattle(null)
    },
    [node?.id, resolveRealmBattle],
  )

  const driver = useBattleDriver({
    battle,
    auto: !!battle && !outcome,
    speed: 1,
    onFinish: (r) => handleFinish(r.win, r.failReason),
  })

  /* 非战斗节点：动画播完后由组件回调推进 */
  const advance = useCallback(
    (nodeId: string) => {
      moveToNode(nodeId)
    },
    [moveToNode],
  )

  const handleLeave = useCallback(() => {
    leaveRealm()
    setBattle(null)
    setOutcome(null)
    onLeave()
  }, [leaveRealm, onLeave])

  if (!realm) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-ink-950">
        <p className="font-serif text-sm text-cream-faint">此秘境尚未开启</p>
        <InkButton variant="ghost" onClick={onLeave}>
          返回
        </InkButton>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-ink-950">
        <p className="font-serif text-sm text-cream-faint">正在推门…</p>
        <InkButton variant="ghost" onClick={onLeave}>
          返回
        </InkButton>
      </div>
    )
  }

  /* 路线图态：玩家选下一个节点 */
  if (showRoute || !node) {
    const selectable = availableNodes(realm, run).map((n) => n.id)
    return (
      <RealmRouteOverlay
        open
        realm={realm}
        run={run}
        selectable={selectable}
        onEnter={() => setShowRoute(false)}
        onSelect={(nodeId) => {
          advance(nodeId)
          setShowRoute(false)
          setOutcome(null)
        }}
        onExit={handleLeave}
      />
    )
  }

  return (
    <SecretRealmScreen
      realm={realm}
      node={node}
      run={run}
      outcome={outcome}
      onBattleDone={(win, info) => handleFinish(win, info.failReason)}
      onEventDone={() => {
        // 非战斗节点：推进到唯一的下游；有多条下游时回到路线图
        const next = node.to
        if (next.length === 1) advance(next[0])
        else setShowRoute(true)
        setOutcome(null)
      }}
      onLeave={handleLeave}
      onRetry={() => {
        setOutcome(null)
        const lb = startRealmBattle(node.id)
        if (lb) setBattle(lb)
      }}
      battleSlot={
        isBattleNode ? (
          <div className="flex h-full flex-col">
            <div ref={containerRef} className="relative flex-1 overflow-hidden">
              <BattleCanvas
                events={driver.events}
                state={driver.state}
                enemy={{
                  name: monsterName(node) ?? '秘境之敌',
                  image: monsterPortrait(node),
                  isBoss: node.kind === 'boss',
                }}
                player={{
                  name: save.profile.name || '无名散修',
                  image: '/images/player-swordsman.png',
                }}
                width={size.width}
                height={size.height}
                quality={save.settings.quality}
                finished={driver.settling}
                onTap={driver.skip}
              />
              <BattleHud
                state={driver.state}
                enemy={{
                  name: monsterName(node) ?? '秘境之敌',
                  icon: MONSTER_BY_ID[node.monsterId ?? '']?.icon,
                  isBoss: node.kind === 'boss',
                }}
                player={{ name: save.profile.name || '无名散修' }}
                treasures={hudTreasures(save, driver.state?.skillCds ?? [])}
                pet={petView(save, driver.state?.petHp, driver.state?.petMaxHp)}
                timeLeft={driver.state ? Math.max(0, TIME_LIMIT - driver.state.time) : TIME_LIMIT}
              />
            </div>
            <div className="flex items-center justify-between border-t border-gold-300/12 bg-ink-950/95 px-3 py-2">
              <span className="font-serif text-[11px] tabular-nums text-cream-faint">
                DPS {formatNumber(driver.state?.dps ?? 0)}
              </span>
              <button
                type="button"
                onClick={driver.skip}
                className={cn(
                  'rounded-full border border-gold-300/25 bg-ink-950/70 px-2.5 py-1',
                  'font-serif text-[11px] text-cream-faint transition-colors hover:text-gold-200',
                )}
              >
                跳过战斗
              </button>
            </div>
          </div>
        ) : undefined
      }
    />
  )
}

/* ------------------------------ 展示辅助 ------------------------------ */

function monsterName(node: RealmNode): string | undefined {
  return node.monsterId ? MONSTER_BY_ID[node.monsterId]?.name : undefined
}

function monsterPortrait(node: RealmNode): string | undefined {
  const def = node.monsterId ? MONSTER_BY_ID[node.monsterId] : null
  return monsterArt(node.monsterId ?? '', def?.icon)
}

function hudTreasures(save: GameSave, cds: number[]): HudTreasure[] {
  const out: HudTreasure[] = []
  save.combat.activeTreasures.forEach((id, i) => {
    if (!id) return
    const def = TREASURE_BY_ID[id]
    if (!def) return
    out.push({
      id: `${id}#${i}`,
      name: def.name,
      icon: def.icon,
      cooldown: def.cooldown,
      remaining: cds[i] ?? 0,
      quality: def.quality as Quality,
    })
  })
  return out
}

function petView(save: GameSave, hp?: number, maxHp?: number) {
  if (!save.combat.pet) return null
  const def = PET_BY_ID[save.combat.pet]
  if (!def) return null
  return { name: def.name, icon: def.icon, hp: hp ?? 0, maxHp: maxHp ?? 0, ready: true }
}
