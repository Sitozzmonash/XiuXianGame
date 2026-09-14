'use client'

import { useState } from 'react'
import {
  BadgeCheck,
  Cloud,
  Copy,
  Gauge,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  Volume2,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/lib/game/state/store'
import { useCloudStore, logout, syncNow } from '@/lib/game/api/cloud'
import { formatNumber } from '@/lib/game/utils'
import { power } from '@/lib/game/state/selectors'
import { APP_BUILD } from '@/lib/game/ui-tokens'
import { ScreenFrame, SubHeader } from '../ScreenFrame'
import { InkButton, Panel, SectionTitle } from '../primitives'

type Quality = 'low' | 'mid' | 'high'

const QUALITY_LABEL: Record<Quality, string> = { low: '流畅', mid: '均衡', high: '极致' }

function Row({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex min-h-11 items-center gap-2.5 py-1.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-ink-900 text-cream-faint ring-1 ring-inset ring-gold-300/15">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-xs text-cream-dim">{label}</span>
        {hint && <span className="mt-0.5 block text-[10px] leading-relaxed text-cream-faint">{hint}</span>}
      </span>
      {children}
    </div>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        on ? 'bg-jade-500/70' : 'bg-ink-800 ring-1 ring-inset ring-gold-300/20',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-5 rounded-full bg-cream shadow transition-all',
          on ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex shrink-0 rounded-sm border border-gold-300/20 bg-ink-950/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-8 min-w-11 rounded-[3px] px-2 font-serif text-[11px] transition-colors',
            o.value === value ? 'bg-gold-300/90 text-ink-950' : 'text-cream-faint hover:text-cream',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const save = useGameStore((s) => s.save)
  const setSfx = useGameStore((s) => s.setSfx)
  const setQuality = useGameStore((s) => s.setQuality)
  const setAuto = useGameStore((s) => s.setAuto)
  const adminGrant = useGameStore((s) => s.adminGrant)
  const adminJumpTo = useGameStore((s) => s.adminJumpTo)

  const mode = useCloudStore((s) => s.mode)
  const username = useCloudStore((s) => s.username)
  const isAdmin = useCloudStore((s) => s.isAdmin)
  const userId = useCloudStore((s) => s.userId)
  const version = useCloudStore((s) => s.version)
  const status = useCloudStore((s) => s.status)
  const message = useCloudStore((s) => s.message)

  const [confirmLogout, setConfirmLogout] = useState(false)
  const [copyNote, setCopyNote] = useState<string | null>(null)
  const [jumpTo, setJumpTo] = useState('1')

  const accountLabel = mode === 'account' ? (username ?? '站内账号') : mode === 'guest' ? '游客试玩' : '未登录'

  const statusLabel: Record<typeof status, string> = {
    off: '未连接',
    connecting: '连接中…',
    syncing: '同步中…',
    synced: '已同步',
    error: '同步失败',
  }

  const handleCopyUid = async () => {
    const text = `uid=${userId ?? '-'} 道号=${save.profile.name} 版本=v${version}`
    try {
      await navigator.clipboard.writeText(text)
      setCopyNote(`已复制：${text}`)
    } catch {
      setCopyNote(text)
    }
    window.setTimeout(() => setCopyNote(null), 2500)
  }

  return (
    <ScreenFrame backdrop="/images/bg-ink-mountains.png">
      <SubHeader title="设置" onBack={onBack} />

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-3 pb-6 pt-3">
        <Panel className="px-3 py-3">
          <SectionTitle className="mb-1.5">账号</SectionTitle>
          <Row
            icon={<UserRound className="size-4" />}
            label={save.profile.name}
            hint={`${accountLabel}${userId ? ` · uid ${userId}` : ''}`}
          >
            <span
              className={cn(
                'shrink-0 rounded-[3px] px-1.5 py-0.5 font-serif text-[10px]',
                mode === 'account'
                  ? 'bg-jade-500/15 text-jade-300 ring-1 ring-inset ring-jade-500/40'
                  : 'bg-ink-900 text-cream-faint ring-1 ring-inset ring-gold-300/20',
              )}
            >
              {mode === 'account' ? '账号' : '游客'}
            </span>
          </Row>
          {isAdmin && (
            <Row icon={<BadgeCheck className="size-4" />} label="测试账号" hint="已开启调试面板，可用于体验后期内容" />
          )}
          <Row
            icon={<Cloud className="size-4" />}
            label={`云存档 · ${statusLabel[status]}`}
            hint={message ?? `服务端版本 v${version} · 综合战力 ${formatNumber(power(save))}`}
          >
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void handleCopyUid()}
                aria-label="复制账号信息"
                className="flex size-8 items-center justify-center rounded-sm border border-gold-300/20 text-cream-faint transition-colors hover:text-cream"
              >
                <Copy className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => syncNow()}
                aria-label="立即同步"
                className="flex size-8 items-center justify-center rounded-sm border border-gold-300/20 text-cream-faint transition-colors hover:text-cream"
              >
                <RefreshCw className={cn('size-3.5', (status === 'syncing' || status === 'connecting') && 'animate-spin')} />
              </button>
            </div>
          </Row>
          {copyNote && (
            <p className="mt-1 truncate rounded-sm bg-ink-950/70 px-2 py-1 text-[10px] text-jade-300">
              {copyNote}
            </p>
          )}
        </Panel>

        <Panel className="mt-3 px-3 py-3">
          <SectionTitle className="mb-1.5">玩法</SectionTitle>
          <Row icon={<Volume2 className="size-4" />} label="音效" hint="战斗、掉落与突破的合成音效">
            <Toggle on={save.settings.sfx} onChange={setSfx} label="音效开关" />
          </Row>
          <Row icon={<Gauge className="size-4" />} label="画质" hint="低画质会关闭残影与闪白，省电优先">
            <Segmented<Quality>
              value={save.settings.quality}
              onChange={setQuality}
              options={(['low', 'mid', 'high'] as Quality[]).map((q) => ({ value: q, label: QUALITY_LABEL[q] }))}
            />
          </Row>
          <Row icon={<ShieldCheck className="size-4" />} label="自动战斗" hint="进入关卡后自动释放法宝与技能">
            <Toggle on={save.settings.auto} onChange={setAuto} label="自动战斗开关" />
          </Row>
        </Panel>

        {isAdmin && (
          <Panel className="mt-3 px-3 py-3">
            <SectionTitle className="mb-1.5">调试面板</SectionTitle>
            <p className="mb-2 text-[10px] leading-relaxed text-cream-faint">
              仅 admin 账号可见。直接写入本地存档，用于快速体验后期内容；云同步会照常上传。
            </p>
            <div className="flex flex-wrap gap-2">
              <InkButton variant="ghost" size="sm" className="min-h-9" onClick={() => adminGrant('stone', 100_000)}>
                <Wrench className="size-3" />
                灵石 +10 万
              </InkButton>
              <InkButton variant="ghost" size="sm" className="min-h-9" onClick={() => adminGrant('cultivation', 500_000)}>
                <Wrench className="size-3" />
                修为 +50 万
              </InkButton>
              <InkButton variant="ghost" size="sm" className="min-h-9" onClick={() => adminGrant('immortalJade', 10_000)}>
                <Wrench className="size-3" />
                仙玉 +1 万
              </InkButton>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={jumpTo}
                onChange={(e) => setJumpTo(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                aria-label="跳转关卡"
                className="h-9 w-20 rounded-sm border border-gold-300/20 bg-ink-950/70 px-2 font-serif text-xs text-cream outline-none focus:border-gold-300/50"
              />
              <InkButton
                variant="jade"
                size="sm"
                className="min-h-9"
                onClick={() => {
                  const n = Number(jumpTo)
                  if (adminJumpTo(n)) {
                    useGameStore.getState().addLog(`调试：已跳转到第 ${n} 关。`, 'system')
                  }
                }}
              >
                跳转关卡
              </InkButton>
            </div>
          </Panel>
        )}

        <Panel className="mt-3 px-3 py-3">
          <SectionTitle className="mb-2">数据</SectionTitle>
          <p className="mb-2 text-[10px] leading-relaxed text-cream-faint">
            登出后本机存档会被清空（云端保留）。再次登录该账号即可恢复进度。
          </p>
          {!confirmLogout ? (
            <InkButton
              variant="ghost"
              size="md"
              className="w-full"
              onClick={() => setConfirmLogout(true)}
              disabled={mode === null}
            >
              <LogOut className="size-3.5" />
              登出当前账号
            </InkButton>
          ) : (
            <div className="flex items-center gap-2">
              <InkButton
                variant="ghost"
                size="md"
                className="flex-1"
                onClick={() => setConfirmLogout(false)}
              >
                取消
              </InkButton>
              <InkButton
                variant="danger"
                size="md"
                className="flex-1"
                onClick={() => {
                  setConfirmLogout(false)
                  void logout()
                }}
              >
                <Trash2 className="size-3.5" />
                确认登出
              </InkButton>
            </div>
          )}
        </Panel>

        <p className="mt-4 text-center font-serif text-[10px] tracking-[0.2em] text-cream-faint/70">
          凡尘问道 · {APP_BUILD}
        </p>
      </div>
    </ScreenFrame>
  )
}
