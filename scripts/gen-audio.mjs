#!/usr/bin/env node
/**
 * scripts/gen-audio.mjs
 * 《凡尘问道》程序化音效合成器 —— 纯 Node 实现（零 npm 依赖 / ESM / 可完全离线）。
 *
 * 输出：public/audio/*.wav
 *  格式：16bit PCM 单声道 22050Hz（标准 44 字节 RIFF 头）
 *
 * 合成原则（避免刺耳爆音）：
 *   1. 声源只用「正弦 / 谐波叠加 / 白噪·粉噪 / 噪声扫频」，
 *      不使用方波、锯齿等硬边波形；
 *   2. 每个音都带余弦形 attack（缓起）+ 指数衰减 + 余弦 release（缓落）；
 *   3. 缓冲首尾统一做 2ms / 6ms 淡入淡出，杜绝边界跳变；
 *   4. 写盘前归一化 + tanh 软限幅 + 二次归一化，峰值约 -1.5dB；
 *   5. 滤波后的噪声按 RMS 归一，保证 amp 参数语义一致、层次平衡；
 *   6. 每个文件保证 ≥ 5KB（不足时尾部补静音）。
 *
 * 运行：node scripts/gen-audio.mjs
 */
import { mkdirSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SR = 22050
const OUT_DIR = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'public', 'audio')
const MIN_BYTES = 5 * 1024

const TAU = Math.PI * 2
const rand = (a, b) => a + Math.random() * (b - a)
const nSamples = (sec) => Math.max(1, Math.ceil(sec * SR))

/* ============================== 基础 DSP ============================== */

/**
 * 平滑包络：余弦 attack + 指数衰减（tau）+ 余弦 release，可叠加强弱颤动（tremolo）
 * @param {number} t   绝对时间（tremolo 用）
 * @param {number} x   相对音头的时间
 */
function envAt(t, x, dur, attack, tau, release, tremolo) {
  if (x < 0 || x >= dur) return 0
  const atk = attack > 0 && x < attack ? 0.5 - 0.5 * Math.cos((Math.PI * x) / attack) : 1
  const dec = tau ? Math.exp(-x / tau) : 1
  const rem = dur - x
  const rel = release > 0 && rem < release ? 0.5 - 0.5 * Math.cos((Math.PI * rem) / release) : 1
  let e = atk * dec * rel
  if (tremolo) {
    e *= 1 - tremolo.depth + tremolo.depth * (0.5 + 0.5 * Math.sin(TAU * tremolo.rate * t))
  }
  return e
}

const lpCoef = (f) => 1 - Math.exp((-TAU * Math.min(f, SR * 0.45)) / SR)

/** 一阶低通（passes 遍级联，无返回，原地处理） */
function lowpass(arr, f, passes = 2) {
  const a = lpCoef(f)
  for (let p = 0; p < passes; p++) {
    let y = 0
    for (let i = 0; i < arr.length; i++) {
      y += a * (arr[i] - y)
      arr[i] = y
    }
  }
  return arr
}

/** 一阶高通（passes 遍级联） */
function highpass(arr, f, passes = 2) {
  const a = lpCoef(f)
  for (let p = 0; p < passes; p++) {
    let y = 0
    for (let i = 0; i < arr.length; i++) {
      y += a * (arr[i] - y)
      arr[i] = arr[i] - y
    }
  }
  return arr
}

/** 把噪声数组按 RMS 归一到「白噪振幅基准」，使 amp 参数语义一致 */
function normalizeRms(arr, target = 0.5773503) {
  let s = 0
  for (let i = 0; i < arr.length; i++) s += arr[i] * arr[i]
  const rms = Math.sqrt(s / arr.length)
  if (rms > 1e-9) {
    const g = target / rms
    for (let i = 0; i < arr.length; i++) arr[i] *= g
  }
  return arr
}

/* ============================== 声源基元 ============================== */

/** 正弦/滑音正弦（可带颤音），写入混音缓冲 */
function addTone(buf, opts) {
  const {
    f0, f1 = f0, start = 0, dur, amp = 0.4, attack = 0.004, tau = null,
    release = 0.01, vibRate = 0, vibDepth = 0, tremolo = null, phase = 0,
  } = opts
  const n = nSamples(dur)
  const i0 = Math.round(start * SR)
  let ph = phase
  for (let i = 0; i < n; i++) {
    const idx = i0 + i
    if (idx >= buf.length) break
    const x = i / SR
    const e = envAt(idx / SR, x, dur, attack, tau, release, tremolo)
    let f = f0 + (f1 - f0) * (x / dur)
    if (vibRate > 0) f *= 1 + vibDepth * Math.sin(TAU * vibRate * x)
    ph += (TAU * Math.max(f, 20)) / SR
    buf[idx] += amp * e * Math.sin(ph)
  }
}

/** 噪声层（可白噪/粉噪、可带通、可包络、可颤动） */
function addNoise(buf, opts) {
  const {
    start = 0, dur, amp = 0.3, low = null, high = null, attack = 0.01,
    tau = null, release = 0.05, tremolo = null, pink = false,
  } = opts
  const n = nSamples(dur) + 8
  let src = new Float64Array(n)
  if (pink) {
    // Paul Kellet 粉噪近似
    let b0 = 0, b1 = 0, b2 = 0
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99765 * b0 + w * 0.099046
      b1 = 0.963 * b1 + w * 0.2965164
      b2 = 0.57 * b2 + w * 1.0526913
      src[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18
    }
  } else {
    for (let i = 0; i < n; i++) src[i] = Math.random() * 2 - 1
  }
  if (low) src = highpass(src, low, 2)
  if (high) src = lowpass(src, high, 2)
  normalizeRms(src)
  const i0 = Math.round(start * SR)
  for (let i = 0; i < n; i++) {
    const idx = i0 + i
    if (idx >= buf.length) break
    const x = i / SR
    const e = envAt(idx / SR, x, dur, attack, tau, release, tremolo)
    buf[idx] += amp * e * src[i]
  }
}

/**
 * 噪声扫频层：低通截止频率从 from 指数升到 to（能量由暗到亮），
 * 用于「起势 / 灵气涌动」类音效，按瞬时截止做增益补偿以保持响度平稳。
 */
function addSweep(buf, opts) {
  const {
    start = 0, dur, amp = 0.2, from = 200, to = 3200,
    attack = 0.3, release = 0.2,
  } = opts
  const n = nSamples(dur) + 8
  const i0 = Math.round(start * SR)
  let y = 0
  for (let i = 0; i < n; i++) {
    const idx = i0 + i
    if (idx >= buf.length) break
    const x = i / SR
    const a = lpCoef(from * Math.pow(to / from, i / n))
    y += a * (Math.random() * 2 - 1 - y)
    const e = envAt(idx / SR, x, dur, attack, null, release, null)
    buf[idx] += amp * e * y * Math.sqrt(2 / Math.max(a, 1e-4))
  }
}

/** 钟 / 磬类泛音簇：基频 + 非谐泛音，指数衰减 */
function addBell(buf, { freq, start = 0, dur, amp = 0.4, attack = 0.006, tau = 0.3, partials = [[1, 1], [2.0, 0.3], [2.76, 0.14], [5.4, 0.05]] }) {
  for (let k = 0; k < partials.length; k++) {
    const [ratio, pa] = partials[k]
    const d = Math.min(dur, dur * (1 - k * 0.08))
    addTone(buf, {
      f0: freq * ratio,
      start: start + k * 0.001,
      dur: d,
      amp: amp * pa,
      attack: Math.max(attack * (1 - k * 0.25), 0.001),
      tau: tau * (1 - k * 0.35),
    })
  }
}

/* ============================== 音效配方 ============================== */

/** 飞剑：800~2400Hz 金属脆响，快速衰减 */
function makeSword(buf) {
  const ring = [820, 1230, 1640, 2060, 2400]
  ring.forEach((f, i) => {
    addTone(buf, {
      f0: f, start: 0.003 + i * 0.0018, dur: 0.26,
      amp: 0.5 - i * 0.075, attack: 0.002, tau: 0.05 - i * 0.006,
    })
  })
  // 剑锋破空：高频下坠
  addTone(buf, { f0: 2400, f1: 1400, start: 0.0, dur: 0.1, amp: 0.22, attack: 0.0012, tau: 0.03 })
  // 出鞘瞬态
  addNoise(buf, { start: 0, dur: 0.12, amp: 0.2, low: 1500, high: 6000, attack: 0.001, tau: 0.03 })
  // 剑身低频共鸣
  addTone(buf, { f0: 300, start: 0.004, dur: 0.2, amp: 0.12, attack: 0.003, tau: 0.06 })
}

/** 雷击：低频轰鸣 + 白噪爆裂 */
function makeThunder(buf) {
  // 爆裂（带通白噪，极快衰减）
  addNoise(buf, { start: 0, dur: 0.3, amp: 0.5, low: 900, high: 5200, attack: 0.001, tau: 0.055 })
  // 滚雷（低通噪声长尾）
  addNoise(buf, { start: 0.01, dur: 0.58, amp: 0.8, low: 28, high: 260, attack: 0.02, tau: 0.2 })
  // 低频体感下坠
  addTone(buf, { f0: 92, f1: 46, start: 0.01, dur: 0.55, amp: 0.5, attack: 0.015, tau: 0.18 })
  addTone(buf, { f0: 60, f1: 38, start: 0.05, dur: 0.5, amp: 0.38, attack: 0.03, tau: 0.22 })
  // 隆隆震颤
  addNoise(buf, {
    start: 0.04, dur: 0.52, amp: 0.3, low: 35, high: 130,
    attack: 0.05, release: 0.25, tremolo: { rate: 11, depth: 0.5 },
  })
}

/** 火焰：粉噪基底 + 低频起伏 + 零星爆点 */
function makeFire(buf) {
  addNoise(buf, {
    start: 0, dur: 0.5, amp: 0.5, low: 180, high: 2200, pink: true,
    attack: 0.06, release: 0.12, tremolo: { rate: 7.3, depth: 0.35 },
  })
  addTone(buf, {
    f0: 58, f1: 76, start: 0, dur: 0.5, amp: 0.18,
    attack: 0.1, release: 0.15, vibRate: 3.4, vibDepth: 0.16,
  })
  for (let i = 0; i < 5; i++) {
    addNoise(buf, {
      start: rand(0.04, 0.4), dur: 0.06, amp: rand(0.08, 0.2),
      low: 700, high: 4200, attack: 0.002, tau: 0.014,
    })
  }
}

/** Boss 咆哮：60~180Hz 低频谐波群 + 颤动 + 喉音噪声 */
function makeBossRoar(buf) {
  const harmonics = [1, 2, 3, 4, 6]
  harmonics.forEach((h, i) => {
    addTone(buf, {
      f0: 152 * h, f1: 64 * h, start: 0.03, dur: 0.74,
      amp: 0.5 / (i + 1.3), attack: 0.06, release: 0.2,
      vibRate: 15 + i * 2, vibDepth: 0.09,
      tremolo: { rate: 21 + i * 3, depth: 0.42 },
    })
  })
  // 喉音
  addNoise(buf, {
    start: 0.04, dur: 0.7, amp: 0.3, low: 110, high: 900,
    attack: 0.08, release: 0.24, tremolo: { rate: 17, depth: 0.5 },
  })
  // 空气震动
  addNoise(buf, { start: 0.02, dur: 0.76, amp: 0.22, low: 30, high: 140, attack: 0.05, release: 0.3 })
}

/** 红装掉落：上行琶音 523/659/784/1046Hz + 灵光余韵 */
function makeDropRed(buf) {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => {
    const st = i * 0.09
    addBell(buf, { freq: f, start: st, dur: 0.7 - st, amp: 0.4 - i * 0.015, tau: 0.3 })
  })
  // 余韵和声
  addBell(buf, { freq: 1046.5, start: 0.44, dur: 0.26, amp: 0.18, tau: 0.2 })
  addBell(buf, { freq: 1567.98, start: 0.47, dur: 0.23, amp: 0.1, tau: 0.16 })
  // 碎闪
  for (let i = 0; i < 6; i++) {
    addTone(buf, { f0: rand(1700, 2700), start: rand(0.3, 0.58), dur: 0.09, amp: 0.03, attack: 0.004, tau: 0.026 })
  }
}

/** 突破：196/294/392Hz 低频钟声叠加 + 缓慢起势 */
function makeBreakthrough(buf) {
  const bells = [[196, 1], [294, 0.68], [392, 0.5]]
  bells.forEach(([f, a]) => {
    addBell(buf, { freq: f, start: 0.18, dur: 1.0, amp: 0.5 * a, tau: 0.42 })
  })
  // 起势一：低音上滑
  addTone(buf, { f0: 49, f1: 196, start: 0, dur: 0.62, amp: 0.28, attack: 0.3, release: 0.2 })
  // 起势二：噪声扫频（能量渐亮）
  addSweep(buf, { start: 0, dur: 0.72, amp: 0.16, from: 180, to: 2600, attack: 0.4, release: 0.25 })
  // 灵气涌动
  addNoise(buf, {
    start: 0.5, dur: 0.68, amp: 0.1, low: 300, high: 3200,
    attack: 0.2, release: 0.3, tremolo: { rate: 6.5, depth: 0.45 },
  })
}

/** 炼丹：300~700Hz 气泡短音串 + 液体底噪 */
function makeAlchemy(buf) {
  addNoise(buf, {
    start: 0, dur: 0.6, amp: 0.08, low: 200, high: 1700,
    attack: 0.05, release: 0.1, tremolo: { rate: 5.2, depth: 0.5 },
  })
  let t = 0.02
  while (t < 0.54) {
    const f = rand(300, 700)
    addTone(buf, {
      f0: f, f1: f * rand(1.4, 1.9), start: t, dur: rand(0.04, 0.085),
      amp: rand(0.2, 0.4), attack: 0.005, tau: 0.02, release: 0.008,
    })
    t += rand(0.028, 0.07)
  }
}

/** 炼器：1200Hz 金属敲击三连 */
function makeForge(buf) {
  const strikes = [0.0, 0.15, 0.3]
  const detune = [1, 1.02, 0.985]
  const partials = [1, 1.494, 2.06, 2.81, 3.7]
  strikes.forEach((st, i) => {
    partials.forEach((p, k) => {
      addTone(buf, {
        f0: 1200 * detune[i] * p, start: st, dur: 0.18 - k * 0.02,
        amp: 0.34 / (k + 1), attack: 0.0015, tau: 0.042 - k * 0.006,
      })
    })
    // 锤击瞬态
    addNoise(buf, { start: st, dur: 0.05, amp: 0.2, low: 500, high: 6000, attack: 0.0008, tau: 0.008 })
    // 铁砧共鸣
    addTone(buf, { f0: 233 * detune[i], start: st, dur: 0.15, amp: 0.1, attack: 0.002, tau: 0.05 })
  })
}

/** UI 点击：600Hz 木鱼感短音（音头 0.08s，尾部留白保证 ≥5KB） */
function makeUiClick(buf) {
  addTone(buf, { f0: 600, start: 0.002, dur: 0.078, amp: 0.5, attack: 0.0012, tau: 0.017 })
  addTone(buf, { f0: 302, start: 0.002, dur: 0.07, amp: 0.22, attack: 0.0012, tau: 0.02 })
  addTone(buf, { f0: 600 * 1.62, start: 0.002, dur: 0.05, amp: 0.1, attack: 0.001, tau: 0.009 })
  addNoise(buf, { start: 0, dur: 0.02, amp: 0.1, low: 400, high: 3500, attack: 0.0006, tau: 0.004 })
}

/** 剧情选择：玉磬双音 880 / 1320Hz */
function makeStoryChoice(buf) {
  addBell(buf, { freq: 880, start: 0.01, dur: 0.39, amp: 0.42, tau: 0.24 })
  addBell(buf, { freq: 1320, start: 0.13, dur: 0.27, amp: 0.36, tau: 0.2 })
}

/* ============================== 写盘 ============================== */

/** 首尾淡入淡出 + 归一化 + tanh 软限幅 + 二次归一 */
function finish(buf, peak = 0.9, finalPeak = 0.85) {
  const n = buf.length
  const fin = Math.min(n >> 1, Math.round(0.002 * SR))
  const fout = Math.min(n >> 1, Math.round(0.006 * SR))
  for (let i = 0; i < fin; i++) buf[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fin)
  for (let i = 0; i < fout; i++) buf[n - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fout)

  let m = 0
  for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(buf[i]))
  if (m < 1e-9) return
  const g = peak / m
  const k = 1.7
  const norm = Math.tanh(k)
  for (let i = 0; i < n; i++) buf[i] = Math.tanh(buf[i] * g * k) / norm
  m = 0
  for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(buf[i]))
  if (m > 0) {
    const g2 = finalPeak / m
    for (let i = 0; i < n; i++) buf[i] *= g2
  }
}

/** Float64 → 16bit PCM 单声道 WAV（Buffer） */
function encodeWav(samples) {
  const n = samples.length
  const dataBytes = n * 2
  const out = Buffer.alloc(44 + dataBytes)
  out.write('RIFF', 0, 'ascii')
  out.writeUInt32LE(36 + dataBytes, 4)
  out.write('WAVE', 8, 'ascii')
  out.write('fmt ', 12, 'ascii')
  out.writeUInt32LE(16, 16)      // fmt chunk 大小
  out.writeUInt16LE(1, 20)       // PCM
  out.writeUInt16LE(1, 22)       // 单声道
  out.writeUInt32LE(SR, 24)
  out.writeUInt32LE(SR * 2, 28)  // 字节率
  out.writeUInt16LE(2, 32)       // 块对齐
  out.writeUInt16LE(16, 34)      // 位深
  out.write('data', 36, 'ascii')
  out.writeUInt32LE(dataBytes, 40)
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    out.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  return out
}

function render(file, seconds, make) {
  const buf = new Float64Array(nSamples(seconds))
  make(buf)
  finish(buf)
  let pcm = encodeWav(buf)
  if (pcm.length < MIN_BYTES) {
    // 尾部补静音，保证 ≥5KB
    const need = Math.ceil((MIN_BYTES - 44) / 2)
    const padded = new Float64Array(Math.max(buf.length, need))
    padded.set(buf)
    pcm = encodeWav(padded)
  }
  writeFileSync(join(OUT_DIR, file), pcm)
  const secs = (pcm.length - 44) / 2 / SR
  console.log(`  [ok] ${file.padEnd(18)} ${String(pcm.length).padStart(7)} B   ${secs.toFixed(2)}s`)
}

/* ============================== 主流程 ============================== */

const RECIPES = [
  ['sword.wav',         0.30, makeSword],        // 飞剑：高频金属脆响，快速衰减
  ['thunder.wav',       0.60, makeThunder],      // 雷击：低频轰鸣 + 白噪爆裂
  ['fire.wav',          0.50, makeFire],         // 火焰：粉噪 + 低频起伏
  ['boss-roar.wav',     0.80, makeBossRoar],     // Boss 咆哮：低频颤动
  ['drop-red.wav',      0.70, makeDropRed],      // 红装掉落：上行琶音 + 余韵
  ['breakthrough.wav',  1.20, makeBreakthrough], // 突破：低频钟声 + 缓慢起势
  ['alchemy.wav',       0.60, makeAlchemy],      // 炼丹：气泡音串
  ['forge.wav',         0.50, makeForge],        // 炼器：金属敲击三连
  ['ui-click.wav',      0.15, makeUiClick],      // UI 点击：木鱼短音（音头 0.08s）
  ['story-choice.wav',  0.40, makeStoryChoice],  // 剧情选择：玉磬双音
]

console.log(`[gen-audio] 输出目录：${OUT_DIR}`)
console.log(`[gen-audio] 格式：16bit PCM / mono / ${SR}Hz，共 ${RECIPES.length} 个音效\n`)
mkdirSync(OUT_DIR, { recursive: true })

let failed = 0
for (const [file, seconds, make] of RECIPES) {
  try {
    render(file, seconds, make)
  } catch (err) {
    failed++
    console.error(`  [fail] ${file}: ${err && err.message}`)
  }
}

// 复检：存在 + ≥5KB
console.log('\n[gen-audio] 复检：')
let bad = 0
for (const [file] of RECIPES) {
  try {
    const st = statSync(join(OUT_DIR, file))
    if (st.size < MIN_BYTES) { bad++; console.error(`  [small] ${file} = ${st.size} B (< 5KB)`) }
  } catch {
    bad++
    console.error(`  [missing] ${file}`)
  }
}
if (failed || bad) {
  console.error(`\n[gen-audio] 失败 ${failed} 个，不合格 ${bad} 个`)
  process.exit(1)
}
console.log(`  [ok] ${RECIPES.length}/${RECIPES.length} 全部生成且 ≥5KB`)
