'use client'

import { useState } from 'react'
import { AtSign, KeyRound, Loader2, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { continueAsGuest, loginAccount, registerNewAccount } from '@/lib/game/api/cloud'
import { ApiError } from '@/lib/game/api/client'
import { GameBackdrop } from '../GameBackdrop'
import { InkButton } from '../primitives'

type Mode = 'login' | 'register'

/** 把后端错误码翻成玩家看得懂的话；未知错误回落到通用文案。 */
function readableError(err: unknown): string {
  if (err instanceof ApiError) {
    const detail = err.payload as { detail?: { code?: string; message?: string } } | null
    const code = detail?.detail?.code ?? err.code
    switch (code) {
      case 'bad_credentials':
        return '用户名或密码错误'
      case 'username_taken':
        return '该用户名已被占用，换一个试试'
      case 'invalid_username':
        return '用户名需为 3~20 位中英文、数字或下划线'
      case 'invalid_password':
        return '密码长度需为 4~64 位'
      default:
        return detail?.detail?.message ?? '操作失败，请稍后再试'
    }
  }
  if (err instanceof Error && err.message) return `${err.message}（可先用游客试玩进入游戏）`
  return '网络异常，可先用游客试玩进入游戏'
}

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreed, setAgreed] = useState(true)
  const [busy, setBusy] = useState<'login' | 'register' | 'guest' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    username.trim().length > 0 && password.length > 0 && (mode === 'login' || password === confirm)

  const submit = async () => {
    if (!agreed) {
      setError('请先阅读并同意《用户协议》《隐私政策》')
      return
    }
    setError(null)
    setBusy(mode)
    try {
      if (mode === 'login') await loginAccount(username.trim(), password)
      else await registerNewAccount(username.trim(), password)
      onLogin()
    } catch (err) {
      setError(readableError(err))
    } finally {
      setBusy(null)
    }
  }

  const playAsGuest = async () => {
    if (!agreed) {
      setError('请先阅读并同意《用户协议》《隐私政策》')
      return
    }
    setError(null)
    setBusy('guest')
    try {
      await continueAsGuest()
      onLogin()
    } catch (err) {
      setError(readableError(err))
    } finally {
      setBusy(null)
    }
  }

  const inputClass =
    'h-11 w-full rounded-sm border border-gold-300/20 bg-ink-950/70 pl-9 pr-3 font-serif text-sm text-cream outline-none transition-colors placeholder:text-cream-faint/60 focus:border-gold-300/60'

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <GameBackdrop src="/images/login-hero.png" overlay={false} />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/50 via-ink-950/30 to-ink-950/95" />

      <div className="no-scrollbar relative z-10 flex flex-1 flex-col justify-center overflow-y-auto px-8 py-6">
        <div className="mb-7 text-center">
          <h1 className="font-serif text-5xl font-black tracking-[0.18em] text-cream text-glow-gold">
            修仙诀
          </h1>
          <p className="mt-3 font-serif text-[11px] tracking-[0.42em] text-gold-300/80">
            一念凡尘起 · 长生不止行
          </p>
        </div>

        <div className="mb-4 flex rounded-sm border border-gold-300/20 bg-ink-950/60 p-0.5">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError(null)
              }}
              className={cn(
                'min-h-9 flex-1 rounded-[3px] font-serif text-xs transition-colors',
                m === mode ? 'bg-gold-300/90 text-ink-950' : 'text-cream-faint hover:text-cream',
              )}
            >
              {m === 'login' ? '账号登录' : '注册新号'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <label className="relative block">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream-faint" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'login' ? '用户名' : '用户名（3~20 位中英文/数字）'}
              autoComplete="username"
              className={inputClass}
            />
          </label>
          <label className="relative block">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream-faint" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码（至少 4 位）"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={inputClass}
            />
          </label>
          {mode === 'register' && (
            <label className="relative block">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream-faint" />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="确认密码"
                autoComplete="new-password"
                className={inputClass}
              />
            </label>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-sm border border-blood-500/35 bg-blood-600/20 px-3 py-2 text-[11px] leading-relaxed text-blood-400">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2.5">
          <InkButton
            variant="primary"
            size="lg"
            disabled={!canSubmit || busy !== null}
            onClick={() => void submit()}
          >
            {busy === 'login' || busy === 'register' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {mode === 'login' ? '登入仙途' : '注册并开始'}
          </InkButton>
          <InkButton variant="ghost" size="lg" disabled={busy !== null} onClick={() => void playAsGuest()}>
            {busy === 'guest' ? <Loader2 className="size-4 animate-spin" /> : null}
            游客试玩（进度自动上云）
          </InkButton>
        </div>

        <div className="mt-3 flex items-start justify-center gap-2 text-[10px] leading-relaxed text-cream-faint">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-3 shrink-0 accent-gold-400"
          />
          <span>
            我已阅读并同意《用户协议》《隐私政策》
            <br />
          </span>
        </div>

        <p className="mt-3 flex items-center justify-center gap-1 text-center text-[10px] text-cream-faint/70">
          <AtSign className="size-2.5" />
          注册后可用同一账号在手机与电脑上继续同一份存档
        </p>
      </div>
    </div>
  )
}
