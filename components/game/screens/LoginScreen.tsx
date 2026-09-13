'use client'

import { useState } from 'react'
import { Apple, Globe } from 'lucide-react'
import { GameBackdrop } from '../GameBackdrop'
import { InkButton } from '../primitives'

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [agreed, setAgreed] = useState(true)

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <GameBackdrop src="/images/login-hero.png" overlay={false} />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/50 via-ink-950/25 to-ink-950/95" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8">
        <h1 className="font-serif text-6xl font-black tracking-[0.18em] text-cream text-glow-gold">
          修仙诀
        </h1>
        <p className="mt-4 font-serif text-[11px] tracking-[0.42em] text-gold-300/80">
          一念凡尘起 · 长生不止行
        </p>
      </div>

      <div className="relative z-10 flex flex-col gap-3 px-8 pb-10">
        <InkButton variant="primary" size="lg" onClick={onLogin}>
          账号登录
        </InkButton>
        <InkButton variant="ghost" size="lg" onClick={onLogin}>
          快速注册
        </InkButton>

        <div className="flex items-center justify-center gap-5 pt-2">
          <button
            type="button"
            onClick={onLogin}
            aria-label="使用 Google 登录"
            className="flex size-9 items-center justify-center rounded-full border border-gold-300/25 bg-ink-950/60 text-cream-dim transition-colors hover:text-gold-200"
          >
            <Globe className="size-4" />
          </button>
          <button
            type="button"
            onClick={onLogin}
            aria-label="使用 Apple 登录"
            className="flex size-9 items-center justify-center rounded-full border border-gold-300/25 bg-ink-950/60 text-cream-dim transition-colors hover:text-gold-200"
          >
            <Apple className="size-4" />
          </button>
        </div>

        <label className="mt-1 flex items-center justify-center gap-2 text-[10px] text-cream-faint">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="size-3 accent-gold-400"
          />
          我已阅读并同意《用户协议》《隐私政策》
        </label>
      </div>
    </div>
  )
}
