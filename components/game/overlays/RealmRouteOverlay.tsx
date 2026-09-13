'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Crown,
  Footprints,
  Gem,
  Gift,
  ScrollText,
  Skull,
  Swords,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Effect, RealmNodeKind, RealmRun, SecretRealmDef } from '@/lib/game/types'
import { KARMA_LABEL, type KarmaKey, type Quality } from '@/lib/game/types'
import { layoutRealm, routesTo } from '@/lib/game/engine/realm'
import { MATERIAL_BY_ID } from '@/lib/game/config/materials'
import { PILL_BY_ID } from '@/lib/game/config/pills'
import { TREASURE_BY_ID } from '@/lib/game/config/treasures'
import { TECHNIQUE_BY_ID } from '@/lib/game/config/techniques'
import { PET_BY_ID } from '@/lib/game/config/pets'
import { NPC_BY_ID } from '@/lib/game/config/story'
import { InkButton, Panel, SectionTitle } from '../primitives'

export interface RealmRouteOverlayProps {
  open: boolean
  realm: SecretRealmDef
  run: RealmRun | null
  onEnter: () => void
  onSelect: (nodeId: string) => void
  onExit: () => void
  /** 可选节点 id 列表（由父层用 availableNodes 算好传入） */
  selectable: string[]
  /** 当前正在处理的节点（战斗/奇遇中） */
  busyNodeId?: string | null
}

const QUALITY_TEXT: Record<Quality, string> = {
  white: '凡品',
  green: '良品',
  blue: '上品',
  purple: '珍品',
  orange: '灵品',
  red: '天品',
  rainbow: '仙品',
}

const KIND_STYLE: Record<
  RealmNodeKind,
  { label: string; color: string; icon: typeof Swords }
> = {
  entry: { label: '入口', color: '#5cc0ad', icon: Footprints },
  battle: { label: '战斗', color: '#d24b3a', icon: Swords },
  elite: { label: '精英', color: '#a8842f', icon: Skull },
  treasure: { label: '宝箱', color: '#e8c877', icon: Gift },
  encounter: { label: '奇遇', color: '#8ad9c8', icon: ScrollText },
  heritage: { label: '传承', color: '#b18cf0', icon: Gem },
  boss: { label: '首领', color: '#b03626', icon: Crown },
}

function effectLabels(effects: Effect[] | undefined): string[] {
  if (!effects || effects.length === 0) return []
  const out: string[] = []
  for (const e of effects) {
    const key = e.key ?? ''
    const value = typeof e.value === 'number' ? e.value : 0
    switch (e.type) {
      case 'give_stone':
        out.push(`灵石 ${value}`)
        break
      case 'give_cultivation':
        out.push(`修为 ${value}`)
        break
      case 'give_item': {
        const name = MATERIAL_BY_ID[key]?.name ?? PILL_BY_ID[key]?.name
        if (name) out.push(`${name} ×${e.count ?? 1}`)
        break
      }
      case 'consume_item': {
        const name = MATERIAL_BY_ID[key]?.name ?? PILL_BY_ID[key]?.name
        if (name) out.push(`消耗 ${name} ×${e.count ?? 1}`)
        break
      }
      case 'give_equipment':
        out.push(`${e.quality ? QUALITY_TEXT[e.quality] : ''}装备 ×${e.count ?? 1}`)
        break
      case 'give_treasure': {
        const name = TREASURE_BY_ID[key]?.name
        if (name) out.push(`法宝·${name}`)
        break
      }
      case 'give_technique': {
        const name = TECHNIQUE_BY_ID[key]?.name
        if (name) out.push(`功法·${name}`)
        break
      }
      case 'give_pet': {
        const name = PET_BY_ID[key]?.name
        if (name) out.push(`灵兽·${name}`)
        break
      }
      case 'karma_add':
        out.push(`${KARMA_LABEL[key as KarmaKey] ?? key} ${value >= 0 ? '+' : ''}${value}`)
        break
      case 'relation_add': {
        const name = NPC_BY_ID[key]?.name
        if (name) out.push(`${name} 关系 ${value >= 0 ? '+' : ''}${value}`)
        break
      }
      case 'unlock':
        if (key) out.push(`解锁 ${key}`)
        break
      default:
        break
    }
  }
  return out
}

export function effectLabelsFor(effects: Effect[] | undefined): string[] {
  return effectLabels(effects)
}

export function RealmRouteOverlay({
  open,
  realm,
  run,
  onEnter,
  onSelect,
  onExit,
  selectable,
  busyNodeId,
}: RealmRouteOverlayProps) {
  const [picked, setPicked] = useState<string | null>(null)

  const points = useMemo(() => layoutRealm(realm), [realm])
  const pointMap = useMemo(
    () => new Map(points.map((p) => [p.nodeId, p])),
    [points],
  )
  const nodeMap = useMemo(
    () => new Map(realm.nodes.map((n) => [n.id, n])),
    [realm],
  )

  useEffect(() => {
    setPicked(run ? run.currentNode : null)
  }, [realm.id, run])

  const routeEdges = useMemo(() => {
    const edges = new Set<string>()
    if (!picked) return edges
    for (const route of routesTo(realm, picked)) {
      for (let i = 0; i < route.length - 1; i += 1) {
        edges.add(`${route[i]}>${route[i + 1]}`)
      }
    }
    return edges
  }, [realm, picked])

  if (!open) return null

  const visited = new Set(run?.visited ?? [])
  const selectableSet = new Set(selectable)
  const bossNode = realm.nodes.find((n) => n.kind === 'boss')
  const bossDown = Boolean(bossNode && visited.has(bossNode.id))
  const depthCount = points.reduce((max, p) => Math.max(max, p.depth), 0) + 1
  const mapHeight = 150 + (depthCount - 1) * 116
  const selected = picked ? nodeMap.get(picked) ?? null : null
  const selectedKind = selected ? KIND_STYLE[selected.kind] : null
  const SelectedIcon = selectedKind?.icon ?? Swords

  const spoils = run?.spoils
  const rows = spoils
    ? [
        `灵石 ${spoils.stone}`,
        `修为 ${spoils.cultivation}`,
        `物品 ${spoils.items.length} 件`,
      ]
    : []

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-ink-950/92 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${realm.name}路线图`}
    >
      <div className="ink-vignette pointer-events-none absolute inset-0" />

      {/* 顶栏 */}
      <header className="relative z-20 flex items-start gap-3 border-b border-gold-300/15 bg-ink-950/80 px-3 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-serif text-base font-bold tracking-wide text-gold-200 text-glow-gold">
            {realm.name}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-cream-faint">
            <span className="text-jade-300">
              已探索 {run ? run.visited.length : 0} / {realm.nodes.length}
            </span>
            {rows.map((r) => (
              <span key={r} className="tabular-nums">
                {r}
              </span>
            ))}
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          aria-label="离开秘境"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold-300/25 bg-ink-950/70 text-cream-dim transition-colors hover:text-gold-200"
        >
          <X className="size-4" />
        </button>
      </header>

      {run === null ? (
        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-5 no-scrollbar">
          <Panel className="p-4">
            <SectionTitle className="mb-3">{realm.name}</SectionTitle>
            <p className="font-serif text-[13px] leading-relaxed text-cream-dim">
              {realm.desc}
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-cream-faint">
              <li className="rounded-sm border border-gold-300/15 bg-ink-900/60 px-2 py-1.5">
                关卡节点 {realm.nodes.length} 处
              </li>
              <li className="rounded-sm border border-gold-300/15 bg-ink-900/60 px-2 py-1.5">
                推荐关卡 {realm.entryStage}
              </li>
              <li className="rounded-sm border border-gold-300/15 bg-ink-900/60 px-2 py-1.5">
                首领 {bossNode?.name ?? '未知'}
              </li>
              <li className="rounded-sm border border-gold-300/15 bg-ink-900/60 px-2 py-1.5">
                路线纵深 {depthCount} 层
              </li>
            </ul>
          </Panel>

          <Panel className="mt-3 p-4">
            <p className="font-serif text-xs tracking-[0.2em] text-gold-300/80">
              首通之赏
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {effectLabels(realm.firstClear).map((t) => (
                <li
                  key={t}
                  className="rounded-[3px] border border-gold-300/25 bg-ink-950/60 px-2 py-1 font-serif text-[11px] text-gold-200"
                >
                  {t}
                </li>
              ))}
            </ul>
          </Panel>

          <div className="mt-5">
            <InkButton variant="primary" size="lg" className="w-full" onClick={onEnter}>
              进入秘境
            </InkButton>
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-10 flex-1 overflow-y-auto px-2 pb-[230px] pt-4 no-scrollbar">
            <div
              className="relative mx-auto w-full max-w-[430px]"
              style={{ height: mapHeight }}
            >
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox={`0 0 100 ${mapHeight}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {realm.nodes.map((node) => {
                  const a = pointMap.get(node.id)
                  if (!a) return null
                  return node.to.map((toId) => {
                    const b = pointMap.get(toId)
                    if (!b) return null
                    const key = `${node.id}>${toId}`
                    const walked = visited.has(node.id) && visited.has(toId)
                    const active =
                      run.currentNode === node.id && selectableSet.has(toId)
                    const onRoute = routeEdges.has(key)
                    const stroke = walked
                      ? 'rgba(138,217,200,0.85)'
                      : onRoute
                        ? 'rgba(232,200,119,0.9)'
                        : active
                          ? 'rgba(232,200,119,0.7)'
                          : 'rgba(139,132,113,0.16)'
                    return (
                      <line
                        key={key}
                        x1={a.x * 100}
                        y1={a.y * mapHeight}
                        x2={b.x * 100}
                        y2={b.y * mapHeight}
                        stroke={stroke}
                        strokeWidth={onRoute || active ? 2.2 : 1.4}
                        strokeDasharray={active && !walked ? '5 4' : undefined}
                        vectorEffect="non-scaling-stroke"
                        className={active && !walked ? 'animate-pulse-glow' : undefined}
                      />
                    )
                  })
                })}
              </svg>

              {realm.nodes.map((node) => {
                const p = pointMap.get(node.id)
                if (!p) return null
                const style = KIND_STYLE[node.kind]
                const Icon = style.icon
                const isVisited = visited.has(node.id)
                const isCurrent = run.currentNode === node.id
                const isSelectable = selectableSet.has(node.id)
                const isBusy = busyNodeId === node.id
                const isLocked = !isVisited && !isSelectable
                const size = node.kind === 'boss' ? 60 : 46
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setPicked(node.id)}
                    aria-label={`${style.label}·${node.name}`}
                    className={cn(
                      'absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-200',
                      isSelectable && 'active:scale-95',
                    )}
                    style={{
                      left: `${p.x * 100}%`,
                      top: `${p.y * 100}%`,
                      width: size,
                      height: size,
                      background: isLocked
                        ? 'rgba(13,17,16,0.85)'
                        : `radial-gradient(circle at 50% 35%, ${style.color}44, rgba(9,12,11,0.96))`,
                      border: `1.5px solid ${
                        isLocked ? 'rgba(139,132,113,0.25)' : style.color
                      }`,
                      filter: isLocked ? 'grayscale(0.85)' : undefined,
                      opacity: isLocked ? 0.55 : 1,
                    }}
                  >
                    <Icon
                      className="size-4"
                      style={{ color: isLocked ? '#8b8471' : style.color }}
                    />
                    {isCurrent && (
                      <span
                        className="pointer-events-none absolute -inset-[6px] rounded-full animate-pulse-glow"
                        style={{ boxShadow: `0 0 0 1.5px ${style.color}` }}
                      />
                    )}
                    {isSelectable && !isCurrent && (
                      <span
                        className="pointer-events-none absolute -inset-[5px] rounded-full animate-pulse-glow"
                        style={{ boxShadow: `0 0 12px ${style.color}` }}
                      />
                    )}
                    {isBusy && (
                      <span className="pointer-events-none absolute -inset-[8px] rounded-full border border-dashed border-gold-300/80 animate-spin-slow" />
                    )}
                    {isVisited && !isLocked && (
                      <span
                        className="pointer-events-none absolute bottom-0.5 size-1 rounded-full"
                        style={{ background: style.color }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 底部详情卡 */}
          <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3">
            <Panel className="px-3 py-3">
              {selected && selectedKind ? (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full"
                      style={{
                        border: `1px solid ${selectedKind.color}`,
                        background: 'rgba(9,12,11,0.8)',
                      }}
                    >
                      <SelectedIcon className="size-3.5" style={{ color: selectedKind.color }} />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-serif text-sm font-bold text-cream">
                      {selected.name}
                    </span>
                    <span
                      className="rounded-[3px] px-1.5 py-0.5 font-serif text-[10px]"
                      style={{
                        color: selectedKind.color,
                        boxShadow: `inset 0 0 0 1px ${selectedKind.color}66`,
                      }}
                    >
                      {selectedKind.label}
                    </span>
                  </div>
                  <p className="mt-1.5 font-serif text-[12px] leading-relaxed text-cream-dim">
                    {selected.desc}
                  </p>
                  {effectLabels(selected.reward).length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {effectLabels(selected.reward).map((t) => (
                        <li
                          key={t}
                          className="rounded-[3px] border border-gold-300/20 bg-ink-950/60 px-1.5 py-0.5 font-serif text-[10px] text-gold-300/90"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex gap-2">
                    {bossDown && selected.kind === 'boss' ? (
                      <InkButton variant="primary" className="flex-1" onClick={onExit}>
                        结算并离开
                      </InkButton>
                    ) : selectableSet.has(selected.id) ? (
                      <InkButton
                        variant="primary"
                        className="flex-1"
                        onClick={() => onSelect(selected.id)}
                      >
                        前往此处
                      </InkButton>
                    ) : (
                      <span className="flex-1 py-2 text-center font-serif text-[11px] text-cream-faint">
                        {visited.has(selected.id) ? '此处已探索' : '尚不可前往'}
                      </span>
                    )}
                    {bossDown && (
                      <InkButton variant="ghost" onClick={onExit}>
                        离开
                      </InkButton>
                    )}
                  </div>
                </>
              ) : (
                <p className="py-2 text-center font-serif text-[12px] text-cream-faint">
                  点选路线图上的玉牌，查看该处详情。
                </p>
              )}
            </Panel>
            {bossDown && selected?.kind !== 'boss' && (
              <div className="mt-2">
                <InkButton variant="primary" size="lg" className="w-full" onClick={onExit}>
                  结算并离开
                </InkButton>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
