'use client'

import { useState } from 'react'
import { ChevronDown, Flag, Lock, MapPin, Swords } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MAPS, MONSTER_BY_ID, REALM_BY_ID, REALM_IDS } from '@/lib/game/config'
import { useGameStore } from '@/lib/game/state/store'
import { monsterArt } from '@/lib/game/ui-art'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { Panel, SectionTitle, StatBar } from '../primitives'

/* 世界地图：四张图的进度总览。点击地图卡展开 50 关的关卡格，
   让「点了没反应」变成「点开能看清自己走到哪」。 */
export function MapScreen({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save)
  const [openId, setOpenId] = useState<string | null>(save.progress.mapId)

  const offsets: number[] = []
  let acc = 0
  for (const m of MAPS) {
    offsets.push(acc)
    acc += m.stages.length
  }

  const realmOrder = REALM_IDS

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="世界地图" onBack={onBack} />

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-3 pb-6 pt-3">
        <Panel className="mb-3 px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] text-cream-dim">
            <MapPin className="size-3.5 shrink-0 text-jade-300" />
            当前：第 {save.progress.stage} 关 · 已通关 {save.progress.maxStage} 关
            <span className="ml-auto text-cream-faint">共 {acc} 关</span>
          </div>
        </Panel>

        <div className="flex flex-col gap-3">
          {MAPS.map((m, mi) => {
            const offset = offsets[mi]
            const cleared = Math.max(0, Math.min(m.stages.length, save.progress.maxStage - offset))
            const unlocked =
              !m.unlockRealm || realmOrder.indexOf(save.profile.realmId) >= realmOrder.indexOf(m.unlockRealm)
            const isCurrent = save.progress.mapId === m.id
            const open = openId === m.id
            const bosses = m.bosses.map((id) => MONSTER_BY_ID[id]).filter(Boolean)

            return (
              <Panel key={m.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : m.id)}
                  className="relative block w-full text-left"
                  aria-expanded={open}
                >
                  <span className="absolute inset-0">
                    <img src={m.bg} alt="" className="size-full object-cover opacity-40" />
                    <span className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/40" />
                  </span>

                  <span className="relative block px-3 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className="font-serif text-[10px] tracking-[0.24em] text-gold-300/80">
                        第{['一', '二', '三', '四'][mi] ?? mi + 1}章
                      </span>
                      <span className="font-serif text-sm font-bold text-cream text-glow-gold">{m.name}</span>
                      {isCurrent && (
                        <span className="rounded-[3px] bg-jade-500/20 px-1.5 py-0.5 font-serif text-[9px] text-jade-300 ring-1 ring-inset ring-jade-500/40">
                          当前
                        </span>
                      )}
                      {!unlocked && <Lock className="size-3 text-cream-faint" />}
                      <ChevronDown
                        className={cn(
                          'ml-auto size-4 shrink-0 text-cream-faint transition-transform',
                          open && 'rotate-180',
                        )}
                      />
                    </span>

                    <span className="mt-1 block font-serif text-[10px] leading-relaxed text-cream-faint">
                      {m.poem}
                    </span>

                    <span className="mt-2 flex items-center gap-2">
                      <StatBar value={cleared / m.stages.length} height="h-1.5" className="flex-1" />
                      <span className="shrink-0 font-serif text-[10px] tabular-nums text-cream-dim">
                        {cleared} / {m.stages.length}
                      </span>
                    </span>

                    {bosses.length > 0 && (
                      <span className="mt-2.5 flex items-center gap-2">
                        {bosses.map((b) => {
                          const art = monsterArt(b.id, b.icon)
                          return (
                            <span key={b.id} className="flex items-center gap-1.5">
                              <span className="flex size-7 items-center justify-center overflow-hidden rounded-sm bg-ink-900 ring-1 ring-inset ring-blood-500/30">
                                {art && <img src={art} alt="" className="size-full object-contain" />}
                              </span>
                              <span className="font-serif text-[10px] text-cream-dim">{b.name}</span>
                            </span>
                          )
                        })}
                      </span>
                    )}
                  </span>
                </button>

                {open && (
                  <div className="border-t border-gold-300/12 px-3 py-3">
                    <SectionTitle className="mb-2">关卡</SectionTitle>
                    <ul className="grid grid-cols-5 gap-1.5">
                      {m.stages.map((st, si) => {
                        const done = si < cleared
                        const isBoss = st.kind === 'boss'
                        const isElite = st.kind === 'elite'
                        const isEvent = st.kind === 'event'
                        return (
                          <li
                            key={st.index}
                            title={`${st.index}. ${st.name}`}
                            className={cn(
                              'flex h-9 flex-col items-center justify-center rounded-[3px] border font-serif text-[9px]',
                              isBoss
                                ? 'border-blood-500/40'
                                : isElite
                                  ? 'border-gold-400/35'
                                  : isEvent
                                    ? 'border-jade-500/35'
                                    : 'border-gold-300/12',
                              done ? 'bg-jade-800/35 text-jade-200' : 'bg-ink-950/70 text-cream-faint/70',
                            )}
                          >
                            <span className="tabular-nums">{st.index}</span>
                            {(isBoss || isElite) && (
                              <Swords className={cn('size-2.5', isBoss ? 'text-blood-400' : 'text-gold-300')} />
                            )}
                          </li>
                        )
                      })}
                    </ul>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.elites.map((id) => {
                        const e = MONSTER_BY_ID[id]
                        if (!e) return null
                        return (
                          <span
                            key={id}
                            className="rounded-[3px] border border-gold-300/20 bg-ink-950/60 px-1.5 py-0.5 font-serif text-[10px] text-cream-dim"
                          >
                            精英 · {e.name}
                          </span>
                        )
                      })}
                    </div>

                    <p className="mt-2 flex items-center gap-1.5 text-[10px] leading-relaxed text-cream-faint">
                      <Flag className="size-3 shrink-0 text-gold-300/80" />
                      {cleared >= m.stages.length
                        ? '本图已全部通关。'
                        : isCurrent
                          ? `推进到第 ${save.progress.stage} 关，回主界面继续挑战即可。`
                          : unlocked
                            ? '需从当前关卡一路推进才能抵达此图。'
                            : `需突破至${m.unlockRealm ? REALM_BY_ID[m.unlockRealm].name : '更高境界'}后开放。`}
                    </p>
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      </div>
    </ScreenFrame>
  )
}
