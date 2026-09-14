'use client'

import Image from 'next/image'
import { ChevronRight, Compass, Gem, Lock, Mountain, ScrollText, Swords } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SECRET_REALMS } from '@/lib/game/config/story/secret_realms'
import { useGameStore } from '@/lib/game/state/store'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { Panel, StatBar } from '../primitives'

const CHAPTER_LABEL: Record<number, string> = {
  1: '第一章',
  2: '第二章',
  3: '第三章',
  4: '第四章',
  5: '第五章',
}

type RealmIcon = typeof Mountain

const REALM_STYLE: Record<string, { accent: string; icon: RealmIcon }> = {
  realm_qingshi_trial: { accent: '#5cc0ad', icon: Mountain },
  realm_heifeng_cave: { accent: '#d24b3a', icon: Swords },
  realm_luoxia_cave: { accent: '#a97bd6', icon: Gem },
}

const FALLBACK_STYLE: { accent: string; icon: RealmIcon } = { accent: '#e8c877', icon: ScrollText }

export function DungeonScreen({
  onBack,
  onEnter,
}: {
  onBack: () => void
  onEnter: () => void
}) {
  const save = useGameStore((s) => s.save)
  const enterRealm = useGameStore((s) => s.enterRealm)

  const run = save.realmRun
  const clearedCount = SECRET_REALMS.filter((r) =>
    save.progress.clearedRealms.includes(r.id),
  ).length

  const handleEnter = (realmId: string) => {
    // 一入秘境便身在其中：另有未完的秘境时不再开新的，避免丢掉手上这趟进度
    if (run && run.realmId !== realmId) return
    if (!run) {
      const entered = enterRealm(realmId)
      if (!entered) return
    }
    onEnter()
  }

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="秘境" onBack={onBack} />

      <div className="relative z-10 flex-1 overflow-y-auto px-3 pt-3 pb-4 no-scrollbar">
        <Panel className="px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Compass className="mt-0.5 size-4 shrink-0 text-gold-200" />
            <p className="font-serif text-[11.5px] leading-relaxed text-cream-dim">
              秘境与尘世不同路。走通一处，此行所得才算了结；若半途折返，路上捡的也散在雾里。
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StatBar value={clearedCount / SECRET_REALMS.length} height="h-1" />
            <span className="shrink-0 font-serif text-[10.5px] tabular-nums text-cream-faint">
              已走通 {clearedCount} / {SECRET_REALMS.length}
            </span>
          </div>
        </Panel>

        <ul className="mt-3 flex flex-col gap-3">
          {SECRET_REALMS.map((realm, index) => {
            const style = REALM_STYLE[realm.id] ?? FALLBACK_STYLE
            const Icon = style.icon
            const locked = save.progress.maxStage < realm.entryStage
            const isCleared = save.progress.clearedRealms.includes(realm.id)
            const isActive = run?.realmId === realm.id
            const blocked = Boolean(run) && !isActive
            const disabled = locked || blocked
            const ring = locked
              ? 'rgba(139,132,113,0.28)'
              : isActive
                ? 'rgba(232,200,119,0.85)'
                : `${style.accent}80`

            return (
              <li key={realm.id} className="animate-rise" style={{ animationDelay: `${index * 90}ms` }}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleEnter(realm.id)}
                  aria-label={`${realm.name}${locked ? `·需推进至第 ${realm.entryStage} 关` : ''}`}
                  className={cn(
                    'group relative block w-full overflow-hidden rounded-md text-left transition-all duration-300',
                    disabled ? 'cursor-not-allowed' : 'active:scale-[0.985]',
                  )}
                  style={{
                    boxShadow: `inset 0 0 0 1.5px ${ring}, inset 0 -26px 48px rgba(7,9,8,0.8), 0 10px 26px rgba(0,0,0,0.45)`,
                  }}
                >
                  <Image
                    src={realm.bg}
                    alt=""
                    fill
                    sizes="420px"
                    className={cn(
                      'object-cover opacity-25 transition-opacity duration-500',
                      locked ? 'grayscale' : 'group-hover:opacity-40',
                    )}
                  />
                  <span className="absolute inset-0 bg-[linear-gradient(150deg,rgba(19,25,23,0.94),rgba(7,9,8,0.97))]" />
                  <span
                    className="pointer-events-none absolute -left-10 -top-12 size-44 rounded-full animate-pulse-glow"
                    style={{
                      background: `radial-gradient(circle,${style.accent}38,transparent 70%)`,
                    }}
                  />
                  <span
                    className="pointer-events-none absolute -bottom-14 -right-6 size-44 rounded-full animate-pulse-glow"
                    style={{
                      background: 'radial-gradient(circle,rgba(232,200,119,0.16),transparent 72%)',
                      animationDelay: '1.2s',
                    }}
                  />

                  <span className={cn('relative block px-3.5 py-3.5', locked && 'opacity-60')}>
                    <span className="flex items-center gap-2.5">
                      <span
                        className="flex size-9 shrink-0 rotate-[-4deg] items-center justify-center rounded-[4px]"
                        style={{
                          background: `linear-gradient(160deg,${style.accent}55,rgba(9,12,11,0.95))`,
                          boxShadow: `inset 0 0 0 1px ${style.accent}99`,
                        }}
                      >
                        <Icon className="size-4" style={{ color: style.accent }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-[15px] font-bold text-cream">
                          {realm.name}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 font-serif text-[10.5px] text-cream-faint">
                          <span className="text-gold-300/85">
                            {CHAPTER_LABEL[realm.chapter] ?? `第${realm.chapter}章`}
                          </span>
                          <span>节点 {realm.nodes.length} 处</span>
                          <span>门槛 第 {realm.entryStage} 关</span>
                        </span>
                      </span>
                      {isCleared && (
                        <span className="shrink-0 rotate-[-8deg] rounded-[3px] border border-gold-300/55 px-1.5 py-0.5 font-serif text-[10px] text-gold-200 shadow-[0_0_10px_rgba(232,200,119,0.25)]">
                          已通关
                        </span>
                      )}
                    </span>

                    <span className="mt-2 block font-serif text-[11.5px] leading-relaxed text-cream-dim">
                      {realm.desc}
                    </span>

                    {isActive && run && (
                      <span className="mt-2.5 block">
                        <StatBar value={run.visited.length / realm.nodes.length} height="h-1" />
                      </span>
                    )}

                    <span className="mt-2.5 flex items-center gap-1.5">
                      {locked ? (
                        <>
                          <Lock className="size-3.5 shrink-0 text-cream-faint" />
                          <span className="font-serif text-[11px] text-cream-faint">
                            需推进至第 {realm.entryStage} 关
                          </span>
                        </>
                      ) : blocked ? (
                        <span className="font-serif text-[11px] text-cream-faint">
                          另有秘境未了结，先走完手上这趟
                        </span>
                      ) : isActive && run ? (
                        <span className="font-serif text-[11px] text-gold-200">
                          探索中 · 已入 {run.visited.length} / {realm.nodes.length} 处
                        </span>
                      ) : (
                        <span
                          className="font-serif text-[11px]"
                          style={{ color: isCleared ? '#8b8471' : style.accent }}
                        >
                          {isCleared ? '可再入内一探' : '可入内一探'}
                        </span>
                      )}

                      {!disabled && (
                        <span
                          className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full border border-gold-300/30 bg-ink-950/70 text-gold-200"
                          aria-hidden="true"
                        >
                          <ChevronRight className="size-4" />
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </ScreenFrame>
  )
}
