'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { KARMA_LABEL, type GameSave, type KarmaKey } from '@/lib/game/types'
import {
  CHAPTERS,
  NPCS,
  SECRET_REALM_BY_ID,
  npcById,
  relationStage,
} from '@/lib/game/config/story'
import { MAPS } from '@/lib/game/config'
import {
  cultivationProgress,
  nextUnlock,
  power,
  unlockProgress,
} from '@/lib/game/state/selectors'
import { formatDuration, formatNumber } from '@/lib/game/utils'
import { SectionTitle, StatBar } from '@/components/game/primitives'

export interface SagaBookProps {
  open: boolean
  onClose: () => void
  save: GameSave
}

type TabId = 'chapter' | 'karma' | 'npc' | 'trail'

const TABS: { id: TabId; label: string }[] = [
  { id: 'chapter', label: '章节' },
  { id: 'karma', label: '因果' },
  { id: 'npc', label: '人物' },
  { id: 'trail', label: '足迹' },
]

/** 因果变量的参照上限，仅用于把刻度画满，不代表硬上限 */
const KARMA_SCALE: Record<KarmaKey, number> = {
  daoHeart: 20,
  demonThought: 20,
  immortalErosion: 20,
  jadeResonance: 20,
  taixuAttention: 20,
  qingxuanFame: 30,
  yaozuFame: 30,
  youmingFame: 30,
  jadeShards: 9,
}

const KARMA_KEYS = Object.keys(KARMA_LABEL) as KarmaKey[]

/** 刻度填充色：由中点向外渐亮，负值镜像，避免正负两侧读感不一致 */
const KARMA_FILL: Record<'jade' | 'blood' | 'gold', { strong: string; faint: string }> = {
  jade: { strong: 'rgba(138, 217, 200, 0.95)', faint: 'rgba(90, 175, 158, 0.3)' },
  blood: { strong: 'rgba(210, 75, 58, 0.95)', faint: 'rgba(176, 54, 38, 0.32)' },
  gold: { strong: 'rgba(246, 230, 184, 0.95)', faint: 'rgba(200, 160, 80, 0.3)' },
}

/** 正负倾向的取色：青玉为善、朱砂为蚀、暗金为缘 */
const KARMA_TONE: Record<KarmaKey, 'jade' | 'blood' | 'gold'> = {
  daoHeart: 'jade',
  demonThought: 'blood',
  immortalErosion: 'blood',
  jadeResonance: 'gold',
  taixuAttention: 'gold',
  qingxuanFame: 'jade',
  yaozuFame: 'jade',
  youmingFame: 'jade',
  jadeShards: 'gold',
}

const TONE_TEXT: Record<'jade' | 'blood' | 'gold', string> = {
  jade: 'text-jade-300',
  blood: 'text-blood-400',
  gold: 'text-gold-200',
}

/** 对立因果的处境描述：只给方向，不给唯一解 */
function karmaState(key: KarmaKey, save: GameSave): string | null {
  const dao = save.karma.daoHeart ?? 0
  const demon = save.karma.demonThought ?? 0
  const erosion = save.karma.immortalErosion ?? 0
  if (key === 'daoHeart') {
    const diff = dao - demon
    if (diff >= 10) return '心志如磐，魔念难侵'
    if (diff >= 3) return '心志渐固'
    if (diff > -3) return '道魔相持，胜负未分'
    if (diff > -10) return '魔念滋长，宜以静制'
    return '心魔盘踞，道基将倾'
  }
  if (key === 'demonThought') {
    if (demon === 0) return '魔念未生'
    if (demon <= 4) return '偶有妄念掠过，尚可自持'
    if (demon <= 9) return '妄念渐成低语，夜半难安'
    return '心魔已具其形，恐夺道心'
  }
  if (key === 'immortalErosion') {
    if (erosion === 0) return '仙蚀未显，道体澄明'
    if (erosion <= 4) return '仙蚀初现，偶有异感'
    if (erosion <= 9) return '仙蚀漫延，宜寻解法'
    return '仙蚀深重，恐有后患'
  }
  return null
}

/** 账册式条目：左右对齐、中缝虚线，贴合木牌/宣纸质感 */
function LedgerRow({
  label,
  value,
  tone = 'gold',
}: {
  label: string
  value: string
  tone?: 'gold' | 'jade' | 'blood'
}) {
  return (
    <div className="flex items-baseline gap-2 font-serif text-[12.5px]">
      <span className="text-cream-dim">{label}</span>
      <span className="mb-[3px] flex-1 border-b border-dotted border-gold-300/25" />
      <span
        className={cn(
          'tabular-nums',
          tone === 'blood'
            ? 'text-blood-400'
            : tone === 'jade'
              ? 'text-jade-300'
              : 'text-gold-200',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function SagaBook({ open, onClose, save }: SagaBookProps) {
  const [tab, setTab] = useState<TabId>('chapter')

  if (!open) return null

  const cultivation = cultivationProgress(save)
  const powerValue = power(save)

  /* 章节边界从地图表推导：一章可能由多张地图构成 */
  const chapterBounds = new Map<number, { start: number; end: number }>()
  {
    let offset = 0
    for (const m of MAPS) {
      const start = offset + 1
      offset += m.stages.length
      const bounds = chapterBounds.get(m.chapter)
      if (bounds) bounds.end = offset
      else chapterBounds.set(m.chapter, { start, end: offset })
    }
  }

  const maxStage = save.progress.maxStage
  const encountersDone = Math.max(
    save.stats.encountersDone,
    save.story.encounterHistory.length,
  )
  const unlocked = unlockProgress(save)
  const pending = nextUnlock(save)
  const clearedRealms = save.progress.clearedRealms.map(
    (id) => SECRET_REALM_BY_ID[id]?.name ?? id,
  )

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink-950/85 p-3 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="仙途录"
    >
      <div className="ink-vignette pointer-events-none absolute inset-0" />

      <div className="relative flex h-full max-h-[86vh] w-full max-w-[410px] flex-col overflow-hidden rounded-lg panel-ink animate-rise">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/60 to-transparent" />

        <header className="flex items-start justify-between gap-3 border-b border-gold-300/15 px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-serif text-base font-bold tracking-[0.3em] text-gold-200 text-glow-gold">
              仙途录
            </h2>
            <p className="mt-1 truncate font-serif text-[12px] text-cream">
              {save.profile.name}
              <span className="mx-1.5 text-gold-300/40">·</span>
              <span className="text-jade-300">{cultivation.stageLabel}</span>
              <span className="mx-1.5 text-gold-300/40">·</span>
              <span className="text-gold-200">战力 {formatNumber(powerValue)}</span>
            </p>
            <p className="mt-0.5 font-serif text-[11px] text-cream-faint">
              已历奇遇 {encountersDone} 次 · 阅历 {formatNumber(save.stats.kills)} 战
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-10 shrink-0 items-center justify-center rounded-sm border border-gold-300/25 px-2.5 font-serif text-[11px] text-cream-dim transition-colors hover:border-gold-300/60 hover:text-cream"
          >
            收起
          </button>
        </header>

        {/* Tab */}
        <nav className="flex items-center gap-1 px-3 pt-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'min-h-10 flex-1 rounded-sm border px-1 py-1.5 font-serif text-xs tracking-[0.15em] transition-all',
                tab === t.id
                  ? 'border-gold-300/60 bg-ink-800/80 text-gold-200'
                  : 'border-gold-300/15 text-cream-faint hover:text-cream-dim',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-4 pb-5 pt-4 no-scrollbar">
          {tab === 'chapter' && (
            <div className="flex flex-col gap-3">
              {CHAPTERS.map((c) => {
                const bounds = chapterBounds.get(c.id)
                const reached = bounds !== undefined && maxStage >= bounds.start
                const total = bounds ? bounds.end - bounds.start + 1 : 0
                const cleared = bounds
                  ? Math.max(0, Math.min(total, maxStage - bounds.start + 1))
                  : 0
                const current =
                  bounds !== undefined && maxStage >= bounds.start && maxStage <= bounds.end
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'relative overflow-hidden rounded-md border px-3 py-2.5',
                      reached
                        ? 'border-gold-300/25 bg-ink-850/70'
                        : 'border-gold-300/10 bg-ink-950/60',
                    )}
                  >
                    {reached && (
                      <span className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-gold-300/70 to-transparent" />
                    )}
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-serif text-[11px] tracking-[0.2em]',
                          reached ? 'text-gold-300/90' : 'text-cream-faint/60',
                        )}
                      >
                        第{c.id}章
                      </span>
                      <h3
                        className={cn(
                          'flex-1 font-serif text-[13.5px]',
                          reached ? 'text-cream' : 'text-cream-faint/60',
                        )}
                      >
                        {reached ? c.name : '尚未踏足'}
                      </h3>
                      {current && (
                        <span className="rounded-[3px] border border-blood-500/50 px-1.5 py-0.5 font-serif text-[10px] leading-none text-blood-400">
                          身处此境
                        </span>
                      )}
                    </div>
                    {reached ? (
                      <>
                        <p className="mt-1.5 font-serif text-[12px] italic leading-relaxed text-jade-300/80">
                          {c.poem}
                        </p>
                        <p className="mt-1.5 font-serif text-[12.5px] leading-relaxed text-cream-dim">
                          {c.summary}
                        </p>
                        <p className="mt-2 font-serif text-[11.5px] text-cream-faint">
                          同行者：
                          <span className="text-gold-300/85">
                            {c.npcIds
                              .map((id) => npcById(id)?.name ?? id)
                              .join(' · ') || '独行'}
                          </span>
                        </p>
                        <p className="mt-1 font-serif text-[11px] text-cream-faint/85">
                          {c.unlockText}
                        </p>
                        {total > 0 && (
                          <div className="mt-2">
                            <div className="mb-1 flex items-baseline justify-between font-serif text-[10.5px] text-cream-faint">
                              <span>关隘</span>
                              <span className="tabular-nums">
                                {cleared} / {total}
                              </span>
                            </div>
                            <StatBar
                              value={total > 0 ? cleared / total : 0}
                              height="h-1"
                              barClassName="bg-gradient-to-r from-gold-500 to-gold-300"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="mt-1.5 font-serif text-[12px] text-cream-faint/60">
                        推关至此，方见其名。
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'karma' && (
            <div className="flex flex-col gap-3.5">
              <SectionTitle>因果加身</SectionTitle>
              {KARMA_KEYS.map((k) => {
                const v = save.karma[k] ?? 0
                const scale = KARMA_SCALE[k]
                const ratio = Math.min(50, (Math.abs(v) / scale) * 50)
                const state = karmaState(k, save)
                return (
                  <div key={k}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="font-serif text-[12.5px] text-cream-dim">
                        {KARMA_LABEL[k]}
                      </span>
                      <span
                        className={cn(
                          'font-serif text-xs tabular-nums',
                          v === 0 ? 'text-cream-faint' : TONE_TEXT[KARMA_TONE[k]],
                        )}
                      >
                        {v > 0 ? `+${v}` : v}
                      </span>
                    </div>
                    {/* 中点为原点的双向刻度：正向右、负向左 */}
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink-950/80 ring-1 ring-inset ring-gold-300/15">
                      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gold-300/35" />
                      {v !== 0 && (
                        <span
                          className={cn(
                            'absolute top-0 h-full rounded-full',
                            v > 0 ? 'left-1/2' : 'right-1/2',
                          )}
                          style={{
                            width: `${ratio}%`,
                            background: `linear-gradient(${v > 0 ? 'to right' : 'to left'}, ${
                              KARMA_FILL[KARMA_TONE[k]].faint
                            }, ${KARMA_FILL[KARMA_TONE[k]].strong})`,
                          }}
                        />
                      )}
                    </div>
                    {state && (
                      <p
                        className={cn(
                          'mt-1 font-serif text-[11px]',
                          v === 0
                            ? 'text-cream-faint/70'
                            : KARMA_TONE[k] === 'blood'
                              ? 'text-blood-400/85'
                              : 'text-jade-300/70',
                        )}
                      >
                        {state}
                      </p>
                    )}
                  </div>
                )
              })}
              <p className="mt-1 font-serif text-[11px] leading-relaxed text-cream-faint/70">
                多数选择无关对错，只记代价。部分因果不会在此显形。
              </p>
            </div>
          )}

          {tab === 'npc' && (
            <div className="flex flex-col gap-2.5">
              {NPCS.map((n) => {
                const rec = save.npcs[n.id]
                const relation = rec?.relation ?? 0
                const alive = rec?.alive !== false
                const tone =
                  relation >= 20 ? 'text-jade-300' : relation < 0 ? 'text-blood-400' : 'text-gold-200'
                return (
                  <div
                    key={n.id}
                    className="rounded-md border border-gold-300/15 bg-ink-850/60 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-serif text-[13px] text-cream">{n.name}</span>
                        <span className="ml-2 font-serif text-[10.5px] text-gold-300/70">
                          {n.title}
                        </span>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        {!alive && (
                          <span className="rounded-sm border border-blood-500/50 px-1.5 font-serif text-[10px] text-blood-400">
                            已陨落
                          </span>
                        )}
                        <span className="font-serif text-[11px] tracking-[0.15em] text-gold-300/85">
                          {relationStage(npcById(n.id), relation)}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1">
                        <StatBar
                          value={Math.min(1, Math.max(0, (relation + 100) / 200))}
                          height="h-1"
                          barClassName={
                            relation >= 0
                              ? 'bg-gradient-to-r from-jade-600 to-jade-300'
                              : 'bg-gradient-to-r from-blood-600 to-blood-400'
                          }
                        />
                      </div>
                      <span className={cn('font-serif text-[11px] tabular-nums', tone)}>
                        {relation > 0 ? `+${relation}` : relation}
                      </span>
                    </div>
                    <p className="mt-1.5 font-serif text-[11.5px] leading-relaxed text-cream-faint">
                      {n.desc}
                    </p>
                    {rec?.state && rec.state !== 'initial' && (
                      <p className="mt-1 font-serif text-[11px] text-jade-300/70">
                        近况：{rec.state}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'trail' && (
            <div className="flex flex-col gap-4">
              <div>
                <SectionTitle>此行足迹</SectionTitle>
                <div className="mt-3 flex flex-col gap-2">
                  <LedgerRow label="殒命之敌" value={formatNumber(save.stats.kills)} />
                  <LedgerRow label="斩落精英" value={formatNumber(save.stats.elites)} tone="jade" />
                  <LedgerRow label="力克关主" value={formatNumber(save.stats.bosses)} tone="jade" />
                  <LedgerRow label="身死道消" value={formatNumber(save.stats.deaths)} tone="blood" />
                  <LedgerRow label="所历奇遇" value={`${formatNumber(encountersDone)} 次`} />
                  <LedgerRow label="人间岁月" value={formatDuration(save.stats.playTime)} />
                </div>
              </div>

              <div>
                <SectionTitle>道途所至</SectionTitle>
                <div className="mt-3 flex flex-col gap-2">
                  <LedgerRow label="最高关隘" value={`第 ${save.progress.maxStage} 关`} />
                  <LedgerRow label="已见章回" value={`${formatNumber(save.story.seenNodes.length)} 节`} />
                  <LedgerRow
                    label="洞天福地"
                    value={clearedRealms.length > 0 ? `${clearedRealms.length} 处` : '尚未踏足'}
                  />
                </div>
                {clearedRealms.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {clearedRealms.map((name) => (
                      <li
                        key={name}
                        className="rounded-[3px] border border-gold-300/25 bg-ink-950/60 px-2 py-1 font-serif text-[11px] text-gold-200/90"
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <SectionTitle>已开之径</SectionTitle>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {unlocked.map((u) => (
                    <li
                      key={u.label}
                      className={cn(
                        'flex items-center gap-2 font-serif text-[12px]',
                        u.reached ? 'text-cream-dim' : 'text-cream-faint/50',
                      )}
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rotate-45',
                          u.reached ? 'bg-gold-300/80' : 'bg-ink-600',
                        )}
                      />
                      {u.label}
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 border-l-2 border-blood-500/50 pl-2 font-serif text-[11.5px] leading-relaxed text-cream-faint">
                  {pending ? `前路：${pending}` : '诸般法门皆已开启，余下的只看缘法。'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
