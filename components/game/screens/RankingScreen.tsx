'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crown, RefreshCw, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchLeaderboard, type BoardKey, type LeaderboardResponse } from '@/lib/game/api/client'
import { cloudAuthToken, flushCloud, useCloudStore } from '@/lib/game/api/cloud'
import { useGameStore } from '@/lib/game/state/store'
import { formatNumber } from '@/lib/game/utils'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { InkButton, Panel, SectionTitle } from '../primitives'

const BOARDS: { key: BoardKey; label: string; hint: string }[] = [
  { key: 'stage', label: '关卡榜', hint: '按已通关的最高关卡排序' },
  { key: 'power', label: '战力榜', hint: '按综合战力排序' },
  { key: 'realm', label: '境界榜', hint: '按大境界与阶段排序' },
]

const MEDAL = ['#e8c877', '#c8bfa8', '#b08050']

function metricText(board: BoardKey, value: number, detail: string): string {
  if (board === 'stage') return `第 ${value} 关`
  if (board === 'power') return formatNumber(value)
  return detail
}

/* 仙缘榜：数据来自服务端 /leaderboard（存档里的自我声明数据，见后端说明）。
   网络失败时保留上一次结果并提示，不影响游戏本体。 */
export function RankingScreen({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<BoardKey>('stage')
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const username = useCloudStore((s) => s.username)
  const isAdmin = useCloudStore((s) => s.isAdmin)
  const myName = useGameStore((s) => s.save.profile.name)

  const load = useCallback(async (key: BoardKey) => {
    setLoading(true)
    setError(null)
    try {
      // 先把本地进度推上去，榜单里才会立刻有自己的最新名次
      await flushCloud()
      // 带 token 才能拿到「我的名次」；未登录时服务端会返回空 me
      setData(await fetchLeaderboard(key, 50, cloudAuthToken()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'network')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(board)
  }, [board, load])

  const rows = data?.entries ?? []
  const me = data?.me ?? null

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader
        title="仙缘榜"
        onBack={onBack}
        right={
          <button
            type="button"
            onClick={() => void load(board)}
            aria-label="刷新榜单"
            className="flex size-8 items-center justify-center rounded-sm border border-gold-300/20 text-cream-faint transition-colors hover:text-cream"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          </button>
        }
      />

      <div className="relative z-10 flex shrink-0 gap-1.5 px-3 pt-3">
        {BOARDS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setBoard(b.key)}
            className={cn(
              'flex-1 rounded-sm border py-2 font-serif text-[11px] transition-colors',
              b.key === board
                ? 'border-gold-300/60 bg-gold-300/15 text-gold-200'
                : 'border-gold-300/15 bg-ink-950/60 text-cream-faint hover:text-cream',
            )}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-3 pb-6 pt-3">
        <Panel className="mb-3 flex items-center gap-2 px-3 py-2">
          <TrendingUp className="size-3.5 shrink-0 text-jade-300" />
          <span className="font-serif text-[11px] text-cream-dim">
            {BOARDS.find((b) => b.key === board)?.hint}
          </span>
          <span className="ml-auto shrink-0 font-serif text-[10px] text-cream-faint">
            全服 {data?.total ?? 0} 人
          </span>
        </Panel>

        <Panel className="mb-3 px-3 py-3">
          <SectionTitle className="mb-2">我的名次</SectionTitle>
          {me ? (
            <div className="flex items-center gap-2.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-950/80 font-serif text-sm font-bold"
                style={{ color: '#e8c877', boxShadow: 'inset 0 0 0 1.5px #e8c877' }}
              >
                {me.rank}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-xs text-cream">
                  {me.name}
                  {isAdmin && <span className="ml-1 text-[10px] text-gold-300">（测试账号）</span>}
                </span>
                <span className="mt-0.5 block font-serif text-[10px] text-cream-faint">
                  {metricText(board, me.value, me.detail)} · {me.detail}
                </span>
              </span>
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-cream-faint">
              {data
                ? '还没有你的上榜记录。推关、提升战力后云存档同步一次即可入榜。'
                : '榜单加载中…'}
            </p>
          )}
          {!me && data && (
            <p className="mt-1.5 text-[10px] leading-relaxed text-cream-faint/80">
              当前道号：{myName}
              {username ? ` · 账号 ${username}` : ' · 游客试玩'}
            </p>
          )}
        </Panel>

        <SectionTitle className="mb-2">全服排名</SectionTitle>

        {error && (
          <Panel className="mb-2 px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-blood-400">
              榜单读取失败（{error}）。仙缘榜需要连上服务器，其余玩法不受影响。
            </p>
            <InkButton variant="ghost" size="sm" className="mt-2 min-h-8" onClick={() => void load(board)}>
              重试
            </InkButton>
          </Panel>
        )}

        {rows.length === 0 && !error ? (
          <Panel className="px-3 py-6 text-center">
            <p className="font-serif text-[11px] leading-relaxed text-cream-faint">
              {loading ? '正在读取榜单…' : '榜上还无人留名。'}
            </p>
          </Panel>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rows.map((row) => (
              <li
                key={`${row.user_id}-${row.rank}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-md border px-3 py-2',
                  row.is_self
                    ? 'border-gold-300/45 bg-gold-300/10'
                    : 'border-gold-300/12 bg-ink-950/60',
                )}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full font-serif text-[11px] font-bold"
                  style={
                    row.rank <= 3
                      ? { color: MEDAL[row.rank - 1], boxShadow: `inset 0 0 0 1.5px ${MEDAL[row.rank - 1]}` }
                      : undefined
                  }
                >
                  {row.rank <= 3 ? <Crown className="size-3.5" /> : row.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-serif text-xs text-cream">{row.name}</span>
                    {row.is_self && (
                      <span className="shrink-0 rounded-[3px] bg-jade-500/20 px-1.5 py-0.5 font-serif text-[9px] text-jade-300">
                        我
                      </span>
                    )}
                    {row.is_admin && (
                      <span className="shrink-0 rounded-[3px] bg-gold-300/15 px-1.5 py-0.5 font-serif text-[9px] text-gold-300">
                        测
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate font-serif text-[10px] text-cream-faint">
                    {row.detail}
                  </span>
                </span>
                <span className="shrink-0 font-serif text-[11px] tabular-nums text-gold-200">
                  {metricText(board, row.value, row.detail)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-center font-serif text-[10px] leading-relaxed text-cream-faint/70">
          榜单随云存档刷新 · 只提供展示与称号，不影响数值
        </p>
      </div>
    </ScreenFrame>
  )
}
