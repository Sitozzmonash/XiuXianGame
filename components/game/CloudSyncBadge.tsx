'use client'

import { useCloudStore, syncNow } from '@/lib/game/api/cloud'
import { cn } from '@/lib/utils'

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 云存档状态徽章：仅在同步中 / 失败 / 刚同步完时可见，静默时不打扰。 */
export function CloudSyncBadge() {
  const status = useCloudStore((s) => s.status)
  const lastSyncedAt = useCloudStore((s) => s.lastSyncedAt)

  if (status === 'off') return null

  const clickable = status === 'error'
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable ? () => syncNow() : undefined}
      className={cn(
        'pointer-events-auto absolute bottom-20 left-3 z-30 flex items-center gap-1 rounded-full border px-2 py-0.5 font-serif text-[10px] leading-none backdrop-blur-sm',
        status === 'error'
          ? 'border-red-400/50 bg-red-950/70 text-red-200'
          : status === 'syncing' || status === 'connecting'
            ? 'border-jade-300/40 bg-ink-950/70 text-jade-200'
            : 'border-gold-300/25 bg-ink-950/60 text-cream-faint',
      )}
    >
      <span
        className={cn(
          'inline-block size-1.5 rounded-full',
          status === 'error'
            ? 'bg-red-400'
            : status === 'synced'
              ? 'bg-jade-300'
              : 'animate-pulse bg-jade-200',
        )}
      />
      {status === 'connecting' && '云存档连接中…'}
      {status === 'syncing' && '云存档同步中…'}
      {status === 'synced' && (lastSyncedAt ? `已云同步 ${fmtTime(lastSyncedAt)}` : '云存档已同步')}
      {status === 'error' && '云同步失败 · 点按重试（本地进度不丢）'}
    </button>
  )
}
