/* ------------------------------------------------------------------ *
 * 音效系统 —— 纯 WebAudio 合成，不依赖任何外部音频素材
 *
 * 用法：
 *   · 首次用户交互时调用 unlockAudio()（浏览器禁止自动播放）
 *   · 用 playSfx('sword') 播单个音效；战斗里直接用
 *     playBattleEventSfx(event) 把 BattleEvent 映射成音效
 *   · setSfxEnabled(false) 关闭全部音效（对应存档 settings.sfx）
 *
 * 音色方向：克制、清冷、带金属与木质质感，配合国风水墨调性。
 * ------------------------------------------------------------------ */

export type SfxName =
  | 'sword'
  | 'crit'
  | 'thunder'
  | 'fire'
  | 'water'
  | 'wood'
  | 'earth'
  | 'soul'
  | 'hit'
  | 'shield'
  | 'heal'
  | 'boss'
  | 'kill'
  | 'victory'
  | 'defeat'
  | 'dropRed'
  | 'dropHigh'
  | 'dropNormal'
  | 'breakthrough'
  | 'uiTap'
  | 'uiConfirm'
  | 'storyChoice'
  | 'alchemy'
  | 'forge'
  | 'reward'

/* ------------------------------ 状态 ------------------------------ */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let reverb: ConvolverNode | null = null
let unlocked = false
let enabled = true

const MASTER_VOLUME = 0.35
/** 同名音效的最小间隔，避免连续命中时叠成噪音 */
const THROTTLE: Record<SfxName, number> = {
  hit: 45,
  sword: 60,
  crit: 130,
  thunder: 200,
  fire: 160,
  water: 160,
  wood: 150,
  earth: 150,
  soul: 200,
  shield: 220,
  heal: 260,
  boss: 400,
  kill: 160,
  victory: 800,
  defeat: 800,
  dropRed: 900,
  dropHigh: 600,
  dropNormal: 140,
  breakthrough: 1200,
  uiTap: 40,
  uiConfirm: 200,
  storyChoice: 400,
  alchemy: 500,
  forge: 200,
  reward: 260,
}

const lastPlayed: Partial<Record<SfxName, number>> = {}
/** 同时活跃的节点上限：低端机上超过这个量会开始掉帧 */
const MAX_VOICES = 24
const activeUntil: number[] = []

/* ------------------------------ 基础设施 ------------------------------ */

function canPlay(): boolean {
  return typeof window !== 'undefined' && enabled && unlocked && ctx !== null
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

/** 记录一个声部，必要时清理过期项；返回 false 表示超限应丢弃 */
function reserveVoice(until: number): boolean {
  const t = now()
  for (let i = activeUntil.length - 1; i >= 0; i--) {
    if (activeUntil[i] < t) activeUntil.splice(i, 1)
  }
  if (activeUntil.length >= MAX_VOICES) return false
  activeUntil.push(until)
  return true
}

/** 程序化混响脉冲响应：指数衰减噪声，不加载外部 IR */
function buildImpulse(context: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = context.sampleRate
  const len = Math.floor(rate * seconds)
  const buf = context.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return buf
}

export function unlockAudio(): void {
  if (typeof window === 'undefined') return
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = enabled ? MASTER_VOLUME : 0
    master.connect(ctx.destination)

    reverb = ctx.createConvolver()
    reverb.buffer = buildImpulse(ctx, 1.8, 2.6)
    const wet = ctx.createGain()
    wet.gain.value = 0.32
    reverb.connect(wet)
    wet.connect(master)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  unlocked = true
}

export function setSfxEnabled(on: boolean): void {
  enabled = on
  if (master && ctx) {
    master.gain.setTargetAtTime(on ? MASTER_VOLUME : 0, ctx.currentTime, 0.02)
  }
}

export function isSfxEnabled(): boolean {
  return enabled
}

/* ------------------------------ 合成部件 ------------------------------ */

interface ToneOpts {
  type?: OscillatorType
  freq: number
  /** 结束频率，省略则不滑音 */
  toFreq?: number
  duration: number
  /** 音量包络峰值 */
  gain?: number
  /** 起音时间，默认 0.005（打击感） */
  attack?: number
  /** 是否送混响 */
  wet?: boolean
  /** 延迟多久开始 */
  delay?: number
}

function tone(o: ToneOpts): number {
  if (!ctx || !master) return 0
  const t0 = ctx.currentTime + (o.delay ?? 0)
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.freq, t0)
  if (o.toFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.toFreq), t0 + o.duration)
  }
  const peak = o.gain ?? 0.22
  const atk = o.attack ?? 0.005
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + atk)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration)
  osc.connect(g)
  g.connect(master)
  if (o.wet && reverb) g.connect(reverb)
  osc.start(t0)
  osc.stop(t0 + o.duration + 0.05)
  return (o.duration + (o.delay ?? 0)) * 1000
}

interface NoiseOpts {
  duration: number
  gain?: number
  /** 带通中心频率 */
  band?: number
  /** 低通截止 */
  lowpass?: number
  wet?: boolean
  delay?: number
  /** 频率滑向，营造扫频感 */
  bandTo?: number
}

function noise(o: NoiseOpts): number {
  if (!ctx || !master) return 0
  const t0 = ctx.currentTime + (o.delay ?? 0)
  const len = Math.max(1, Math.floor(ctx.sampleRate * o.duration))
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1

  const src = ctx.createBufferSource()
  src.buffer = buf

  const filter = ctx.createBiquadFilter()
  if (o.band) {
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(o.band, t0)
    if (o.bandTo !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, o.bandTo), t0 + o.duration)
    }
    filter.Q.value = 1.1
  } else {
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(o.lowpass ?? 1800, t0)
  }

  const g = ctx.createGain()
  const peak = o.gain ?? 0.2
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration)

  src.connect(filter)
  filter.connect(g)
  g.connect(master)
  if (o.wet && reverb) g.connect(reverb)
  src.start(t0)
  src.stop(t0 + o.duration + 0.05)
  return (o.duration + (o.delay ?? 0)) * 1000
}

/* ------------------------------ 音色定义 ------------------------------ */

const RECIPES: Record<SfxName, () => number> = {
  // 噪声 burst 经 3kHz 带通 + 0.12s 衰减，像金属划空
  sword: () => noise({ duration: 0.12, band: 3000, bandTo: 1400, gain: 0.16 }),

  // 在 sword 基础上叠一个上扬方波，更"亮"
  crit: () =>
    Math.max(
      noise({ duration: 0.13, band: 3400, bandTo: 1600, gain: 0.18 }),
      tone({ type: 'square', freq: 800, toFreq: 1600, duration: 0.1, gain: 0.1 }),
    ),

  // 低频噪声 + 60→30Hz 正弦下滑作雷滚，再叠高频齿音
  thunder: () =>
    Math.max(
      noise({ duration: 0.5, lowpass: 900, gain: 0.2 }),
      tone({ freq: 60, toFreq: 30, duration: 0.45, gain: 0.24 }),
      noise({ duration: 0.09, band: 5200, gain: 0.1 }),
    ),

  // 噪声经低通缓慢衰减，带一点灼烧的粗糙感
  fire: () =>
    Math.max(
      noise({ duration: 0.4, lowpass: 1200, gain: 0.18 }),
      tone({ type: 'sawtooth', freq: 180, toFreq: 90, duration: 0.3, gain: 0.08 }),
    ),

  // 正弦下滑 + 轻微空间感
  water: () => tone({ freq: 1200, toFreq: 400, duration: 0.34, gain: 0.16, wet: true }),

  // 三角波短音 + 噪声起音，木质敲击
  wood: () =>
    Math.max(
      tone({ type: 'triangle', freq: 400, duration: 0.15, gain: 0.18 }),
      noise({ duration: 0.05, band: 1400, gain: 0.08 }),
    ),

  // 低频噪声 swell + 40Hz 正弦，闷响
  earth: () =>
    Math.max(
      noise({ duration: 0.35, lowpass: 500, gain: 0.2 }),
      tone({ freq: 40, duration: 0.35, gain: 0.22 }),
    ),

  // 两个失谐正弦缓慢颤音，阴冷
  soul: () =>
    Math.max(
      tone({ freq: 220, toFreq: 214, duration: 0.6, gain: 0.12, wet: true }),
      tone({ type: 'triangle', freq: 233, toFreq: 241, duration: 0.6, gain: 0.08, wet: true }),
    ),

  // 极短噪声 click
  hit: () => noise({ duration: 0.05, band: 2200, gain: 0.12 }),

  // 正弦上扬 + 柔和包络，罩子张开
  shield: () =>
    Math.max(
      tone({ freq: 300, toFreq: 600, duration: 0.25, gain: 0.14 }),
      tone({ type: 'triangle', freq: 450, toFreq: 900, duration: 0.22, gain: 0.06 }),
    ),

  // 两个纯音顺次轻响，清亮
  heal: () =>
    Math.max(
      tone({ freq: 523, duration: 0.18, gain: 0.12 }),
      tone({ freq: 784, duration: 0.2, gain: 0.1, delay: 0.09 }),
    ),

  // 低频鼓 + 噪声尾
  boss: () =>
    Math.max(
      tone({ freq: 80, toFreq: 50, duration: 0.35, gain: 0.28 }),
      noise({ duration: 0.3, lowpass: 700, gain: 0.14, delay: 0.02 }),
    ),

  // 噪声爆 + 快速下沉正弦
  kill: () =>
    Math.max(
      noise({ duration: 0.22, lowpass: 1400, gain: 0.18 }),
      tone({ freq: 340, toFreq: 90, duration: 0.25, gain: 0.16 }),
    ),

  // 上行三音，三角波快衰减，古琴拨弦感
  victory: () =>
    Math.max(
      tone({ type: 'triangle', freq: 523, duration: 0.45, gain: 0.16, wet: true }),
      tone({ type: 'triangle', freq: 659, duration: 0.5, gain: 0.15, delay: 0.12, wet: true }),
      tone({ type: 'triangle', freq: 784, duration: 0.7, gain: 0.15, delay: 0.24, wet: true }),
    ),

  // 下行两音，缓慢
  defeat: () =>
    Math.max(
      tone({ type: 'triangle', freq: 392, toFreq: 370, duration: 0.6, gain: 0.15, wet: true }),
      tone({ type: 'triangle', freq: 262, toFreq: 240, duration: 0.9, gain: 0.14, delay: 0.28, wet: true }),
    ),

  // 最有辨识度：低频冲击 + 四音上行琶音 + 长混响
  dropRed: () =>
    Math.max(
      tone({ freq: 120, toFreq: 60, duration: 0.3, gain: 0.26 }),
      tone({ type: 'triangle', freq: 523, duration: 0.5, gain: 0.15, delay: 0.08, wet: true }),
      tone({ type: 'triangle', freq: 659, duration: 0.55, gain: 0.15, delay: 0.2, wet: true }),
      tone({ type: 'triangle', freq: 784, duration: 0.6, gain: 0.15, delay: 0.32, wet: true }),
      tone({ type: 'triangle', freq: 1046, duration: 0.9, gain: 0.17, delay: 0.46, wet: true }),
    ),

  // 三音上行 + 中等混响
  dropHigh: () =>
    Math.max(
      tone({ type: 'triangle', freq: 587, duration: 0.4, gain: 0.14, wet: true }),
      tone({ type: 'triangle', freq: 740, duration: 0.45, gain: 0.14, delay: 0.11, wet: true }),
      tone({ type: 'triangle', freq: 880, duration: 0.6, gain: 0.15, delay: 0.22, wet: true }),
    ),

  // 单音轻响
  dropNormal: () => tone({ type: 'triangle', freq: 660, duration: 0.16, gain: 0.1 }),

  // 最隆重：低频 swell + 多谐波金属共鸣 + 钟声长尾
  breakthrough: () =>
    Math.max(
      tone({ freq: 55, toFreq: 110, duration: 0.8, gain: 0.24 }),
      noise({ duration: 0.9, lowpass: 900, gain: 0.12 }),
      tone({ freq: 440, duration: 0.7, gain: 0.12, delay: 0.35, wet: true }),
      tone({ freq: 660, duration: 0.8, gain: 0.11, delay: 0.45, wet: true }),
      tone({ type: 'triangle', freq: 220, duration: 2.2, gain: 0.16, delay: 0.7, wet: true }),
      tone({ freq: 880, duration: 1.8, gain: 0.09, delay: 0.85, wet: true }),
    ),

  // 极短高频 click
  uiTap: () => noise({ duration: 0.03, band: 1500, gain: 0.09 }),

  // 两音上行短音
  uiConfirm: () =>
    Math.max(
      tone({ type: 'triangle', freq: 587, duration: 0.12, gain: 0.1 }),
      tone({ type: 'triangle', freq: 784, duration: 0.16, gain: 0.1, delay: 0.08 }),
    ),

  // 三角波 + 长衰减，木鱼 / 磬的仪式感
  storyChoice: () =>
    Math.max(
      tone({ type: 'triangle', freq: 349, duration: 0.8, gain: 0.15, wet: true }),
      tone({ freq: 698, duration: 0.6, gain: 0.06, delay: 0.02, wet: true }),
    ),

  // 滤波噪声循环两次的沸腾感
  alchemy: () =>
    Math.max(
      noise({ duration: 0.35, lowpass: 800, gain: 0.12 }),
      noise({ duration: 0.35, lowpass: 1100, gain: 0.1, delay: 0.3 }),
    ),

  // 金属敲击 ×3
  forge: () =>
    Math.max(
      noise({ duration: 0.15, band: 2600, gain: 0.16 }),
      tone({ freq: 520, toFreq: 400, duration: 0.15, gain: 0.1 }),
      noise({ duration: 0.15, band: 2400, gain: 0.15, delay: 0.15 }),
      tone({ freq: 500, toFreq: 380, duration: 0.15, gain: 0.1, delay: 0.15 }),
      noise({ duration: 0.18, band: 2800, gain: 0.16, delay: 0.3 }),
      tone({ freq: 560, toFreq: 420, duration: 0.18, gain: 0.1, delay: 0.3 }),
    ),

  // 比 uiConfirm 更亮的两音上行
  reward: () =>
    Math.max(
      tone({ type: 'triangle', freq: 740, duration: 0.14, gain: 0.11 }),
      tone({ type: 'triangle', freq: 988, duration: 0.22, gain: 0.11, delay: 0.1 }),
    ),
}

/* ------------------------------ 对外接口 ------------------------------ */

export function playSfx(name: SfxName, opts: { volume?: number; rate?: number } = {}): void {
  if (!canPlay()) return
  const interval = THROTTLE[name] ?? 100
  const t = now()
  const prev = lastPlayed[name] ?? -Infinity
  if (t - prev < interval) return
  lastPlayed[name] = t

  const recipe = RECIPES[name]
  if (!recipe) return
  const span = recipe()
  if (!reserveVoice(t + span)) return

  if (opts.volume !== undefined && master && ctx) {
    // 单次音量微调：临时推一下总线再回落，避免为每个音效加独立增益链
    const target = MASTER_VOLUME * Math.max(0, Math.min(1, opts.volume))
    master.gain.setTargetAtTime(target, ctx.currentTime, 0.01)
    master.gain.setTargetAtTime(
      enabled ? MASTER_VOLUME : 0,
      ctx.currentTime + (span / 1000) * 0.8,
      0.05,
    )
  }
  void opts.rate
}

/** 把战斗事件映射成音效，供战斗页直接调用 */
export function playBattleEventSfx(ev: {
  type: string
  damageType?: string | null
  crit?: boolean
  fx?: string | null
  /** drop 事件的品质，决定用哪一档掉落音 */
  quality?: string | null
}): void {
  switch (ev.type) {
    case 'kill':
      playSfx('kill')
      return
    case 'victory':
      playSfx('victory')
      return
    case 'death':
      playSfx('defeat')
      return
    case 'shield':
      playSfx('shield')
      return
    case 'heal':
      playSfx('heal')
      return
    case 'enrage':
    case 'phase':
      playSfx('boss')
      return
    case 'summon':
      playSfx('soul')
      return
    case 'drop':
      if (ev.quality === 'red' || ev.quality === 'rainbow') playSfx('dropRed')
      else if (ev.quality === 'orange') playSfx('dropHigh')
      else playSfx('dropNormal')
      return
    case 'hit':
    case 'crit': {
      if (ev.crit) {
        playSfx('crit')
        return
      }
      const byFx = FX_TO_SFX[ev.fx ?? ''] ?? FX_TO_SFX[ev.damageType ?? '']
      playSfx(byFx ?? 'hit')
      return
    }
    case 'cast':
      if (ev.fx) playSfx(FX_TO_SFX[ev.fx] ?? 'hit')
      return
    default:
      return
  }
}

const FX_TO_SFX: Record<string, SfxName> = {
  sword: 'sword',
  slash: 'sword',
  thunder: 'thunder',
  fire: 'fire',
  water: 'water',
  wood: 'wood',
  earth: 'earth',
  soul: 'soul',
  burst: 'thunder',
  metal: 'thunder',
  physical: 'hit',
}
