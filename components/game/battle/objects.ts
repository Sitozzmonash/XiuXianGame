/* ------------------------------------------------------------------ *
 * 战斗表现层 · 对象池与粒子系统（纯逻辑，无 React）
 * 所有可复用对象在启动时预分配，运行期只做 acquire/release，避免 GC 抖动。
 * ------------------------------------------------------------------ */

import { formatNumber, makeRng } from '@/lib/game/utils'
import type { DamageType } from '@/lib/game/types'

/** 表现层专用随机（种子固定 → 不同设备观感一致，且调用序稳定） */
export const fxRng = makeRng(0x9e3779b9)
export const rnd = (min: number, max: number) => min + fxRng.next() * (max - min)

/** 水墨色板，值取自 app/globals.css 的 @theme */
export const INK = {
  void: '#070908',
  ink900: '#0d1110',
  ink800: '#1a221f',
  ink700: '#253029',
  ink600: '#35423b',
  jade300: '#8ad9c8',
  jade400: '#5cc0ad',
  jade500: '#3a9d8b',
  jade700: '#1d5a50',
  gold200: '#f6e6b8',
  gold300: '#e8c877',
  gold400: '#d0a94f',
  gold500: '#a8842f',
  cream: '#f2ead8',
  creamDim: '#c8bfa8',
  creamFaint: '#8b8471',
  blood: '#d24b3a',
  bloodDeep: '#7d2418',
  blue: '#5b9bd5',
  purple: '#a97bd6',
  orange: '#e0a24a',
} as const

/** Canvas 不解析 CSS 变量，这里给出等价字体栈 */
export const FONT_SERIF = "'Noto Serif SC','Songti SC','SimSun',serif"

/* ------------------------------------------------------------------ */
/* 泛型对象池                                                          */
/* ------------------------------------------------------------------ */

export class Pool<T> {
  /** 使用中的对象；遍历期间不要增删，用 sweep 回收 */
  readonly active: T[] = []

  private readonly free: T[] = []

  constructor(
    count: number,
    private readonly factory: () => T,
    private readonly max = count,
  ) {
    for (let i = 0; i < count; i++) this.free.push(factory())
  }

  get freeCount(): number {
    return this.free.length
  }

  /** 池满时淘汰最旧的活动对象（视觉上最先消失的那个），保证不再分配 */
  acquire(): T {
    const recycled = this.free.pop()
    if (recycled) {
      this.active.push(recycled)
      return recycled
    }
    if (this.active.length >= this.max) {
      const oldest = this.active.shift() as T
      this.active.push(oldest)
      return oldest
    }
    const created = this.factory()
    this.active.push(created)
    return created
  }

  release(item: T): void {
    const i = this.active.indexOf(item)
    if (i < 0) return
    const last = this.active.pop() as T
    if (i < this.active.length) this.active[i] = last
    this.free.push(item)
  }

  /** 倒序遍历以支持原地移除 */
  sweep(alive: (item: T) => boolean): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (!alive(this.active[i])) this.release(this.active[i])
    }
  }

  forEach(fn: (item: T) => void): void {
    for (let i = 0; i < this.active.length; i++) fn(this.active[i])
  }

  clear(): void {
    while (this.active.length > 0) this.release(this.active[this.active.length - 1])
  }
}

/* ------------------------------------------------------------------ */
/* 伤害数字                                                            */
/* ------------------------------------------------------------------ */

export type FloatKind = 'damage' | 'crit' | 'heal' | 'shield' | 'evade' | 'label'

export interface DamageNumber {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  text: string
  font: string
  size: number
  color: string
  outline: string
  kind: FloatKind
}

export function makeDamageNumber(): DamageNumber {
  return {
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    text: '',
    font: '',
    size: 20,
    color: INK.cream,
    outline: 'rgba(7,9,8,0.85)',
    kind: 'damage',
  }
}

export interface FloatOptions {
  kind?: FloatKind
  /** 元素色，给出时覆盖默认宣纸白 */
  tint?: DamageType | null
}

const ELEMENT_COLOR: Partial<Record<DamageType, string>> = {
  fire: '#f08a5a',
  water: '#9fd6f2',
  wood: '#8fd98a',
  earth: '#d8ab6a',
  soul: '#c39ae0',
  metal: INK.cream,
  true: INK.cream,
  physical: INK.cream,
}

export function spawnDamageNumber(
  pool: Pool<DamageNumber>,
  x: number,
  y: number,
  value: number,
  crit: boolean,
  opts: FloatOptions = {},
): DamageNumber {
  const d = pool.acquire()
  const kind: FloatKind = opts.kind ?? (crit ? 'crit' : 'damage')
  const tint = opts.tint ? ELEMENT_COLOR[opts.tint] : undefined
  const sign = kind === 'heal' || kind === 'shield' ? '+' : '-'
  const digits = kind === 'evade' ? '' : formatNumber(Math.abs(value))
  d.active = true
  d.kind = kind
  d.x = x + rnd(-8, 8)
  d.y = y
  d.vx = crit ? rnd(-14, 14) : rnd(-6, 6)
  d.vy = crit ? -62 : -44
  d.maxLife = kind === 'crit' ? 1.15 : kind === 'label' ? 1.3 : 0.92
  d.life = d.maxLife
  d.text = kind === 'evade' ? '闪避' : kind === 'label' ? digits : `${sign}${digits}`
  d.size = kind === 'crit' ? 30 : kind === 'label' ? 15 : 20
  d.color =
    kind === 'heal'
      ? INK.jade300
      : kind === 'shield'
        ? INK.gold300
        : kind === 'crit'
          ? INK.gold300
          : kind === 'evade'
            ? INK.creamFaint
            : kind === 'label'
              ? INK.gold400
              : (tint ?? INK.cream)
  d.font = `700 ${d.size}px ${FONT_SERIF}`
  return d
}

/** 技能名 / 状态提示文字，复用伤害数字池 */
export function spawnLabel(
  pool: Pool<DamageNumber>,
  x: number,
  y: number,
  text: string,
  color: string = INK.gold300,
): DamageNumber {
  const d = spawnDamageNumber(pool, x, y, 0, false, { kind: 'label' })
  d.text = text
  d.color = color
  return d
}

export function updateDamageNumber(d: DamageNumber, dt: number): boolean {
  d.life -= dt
  d.x += d.vx * dt
  d.y += d.vy * dt
  d.vy *= 1 - Math.min(0.9, 2.6 * dt)
  d.vx *= 1 - Math.min(0.9, 2.2 * dt)
  return d.life > 0
}

export function drawDamageNumber(ctx: CanvasRenderingContext2D, d: DamageNumber): void {
  const p = 1 - d.life / d.maxLife
  const pop = d.kind === 'crit' ? 1 + 0.7 * Math.pow(1 - Math.min(1, p / 0.24), 2) : 1
  const a = p < 0.08 ? p / 0.08 : p > 0.62 ? Math.max(0, 1 - (p - 0.62) / 0.38) : 1
  ctx.save()
  ctx.globalAlpha = a
  ctx.translate(d.x, d.y)
  ctx.scale(pop, pop)
  ctx.font = d.font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = d.kind === 'crit' ? 4 : 3
  ctx.strokeStyle = d.outline
  ctx.strokeText(d.text, 0, 0)
  if (d.kind === 'crit') {
    ctx.globalAlpha = a * 0.4
    ctx.fillStyle = INK.gold300
    ctx.fillText(d.text, 0, -1.5)
    ctx.globalAlpha = a
  }
  ctx.fillStyle = d.color
  ctx.fillText(d.text, 0, 0)
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* 粒子                                                                */
/* ------------------------------------------------------------------ */

const TAU = Math.PI * 2

export type ParticleKind =
  | 'spark'
  | 'ember'
  | 'smoke'
  | 'ice'
  | 'leaf'
  | 'rock'
  | 'soul'
  | 'ghost'
  | 'heal'
  | 'ink'
  | 'ring'
  | 'slash'
  | 'scorch'

export interface Particle {
  active: boolean
  kind: ParticleKind
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  size2: number
  rot: number
  vr: number
  gravity: number
  drag: number
  glow: boolean
  color: string
  color2: string
}

export function makeParticle(): Particle {
  return {
    active: false,
    kind: 'spark',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    size: 2,
    size2: 0,
    rot: 0,
    vr: 0,
    gravity: 0,
    drag: 1,
    glow: true,
    color: INK.cream,
    color2: INK.cream,
  }
}

export interface EmitOptions {
  count?: number
  /** 主发射方向（弧度），缺省为全向 */
  angle?: number
  /** 围绕主方向的扩散弧度 */
  spread?: number
  speed?: [number, number]
  life?: [number, number]
  size?: [number, number]
  /** 尺寸随生命变化到的终值比例 */
  shrink?: number
  gravity?: number
  drag?: number
  glow?: boolean
  color: string
  color2?: string
  /** 在半径内随机起始位置（用于爆炸 / 墨点扩散） */
  radius?: number
  spin?: [number, number]
}

/** 各粒子默认的尺寸终值比例（>1 扩散，<1 收缩） */
const KIND_SHRINK: Record<ParticleKind, number> = {
  spark: 0.4,
  ember: 0.35,
  smoke: 2.2,
  ice: 1.4,
  leaf: 1,
  rock: 1,
  soul: 1.6,
  ghost: 1.3,
  heal: 0.5,
  ink: 2,
  ring: 2.6,
  slash: 1.7,
  scorch: 1,
}

export function emit(
  pool: Pool<Particle>,
  kind: ParticleKind,
  x: number,
  y: number,
  o: EmitOptions,
): void {
  const count = o.count ?? 1
  const speed = o.speed ?? [20, 60]
  const life = o.life ?? [0.3, 0.6]
  const size = o.size ?? [2, 4]
  for (let i = 0; i < count; i++) {
    const p = pool.acquire()
    const a =
      o.angle === undefined ? rnd(0, TAU) : o.angle + rnd(-(o.spread ?? 0.5), o.spread ?? 0.5)
    const sp = rnd(speed[0], speed[1])
    const r = o.radius ? Math.sqrt(fxRng.next()) * o.radius : 0
    p.active = true
    p.kind = kind
    p.x = x + Math.cos(a) * r
    p.y = y + Math.sin(a) * r
    p.vx = Math.cos(a) * sp
    p.vy = Math.sin(a) * sp
    p.maxLife = rnd(life[0], life[1])
    p.life = p.maxLife
    p.size = rnd(size[0], size[1])
    p.size2 = o.shrink ?? KIND_SHRINK[kind]
    p.rot = rnd(0, TAU)
    p.vr = rnd(o.spin?.[0] ?? -3, o.spin?.[1] ?? 3)
    p.gravity = o.gravity ?? 0
    p.drag = o.drag ?? 1.6
    p.glow = o.glow ?? true
    p.color = o.color
    p.color2 = o.color2 ?? o.color
  }
}

export function updateParticle(p: Particle, dt: number): boolean {
  p.life -= dt
  const damp = 1 - Math.min(0.9, p.drag * dt)
  p.vx *= damp
  p.vy = p.vy * damp + p.gravity * dt
  p.x += p.vx * dt
  p.y += p.vy * dt
  p.rot += p.vr * dt
  return p.life > 0
}

export function drawGlowDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number,
  core = 'rgba(255,255,255,0.85)',
): void {
  ctx.globalAlpha = alpha * 0.45
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r * 2.1, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = alpha * 0.8
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(x, y, r * 0.42, 0, TAU)
  ctx.fill()
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const t = 1 - p.life / p.maxLife
  const a = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1
  const r = p.size * (1 + (p.size2 - 1) * t)
  switch (p.kind) {
    case 'spark': {
      ctx.globalCompositeOperation = 'lighter'
      const len = Math.hypot(p.vx, p.vy) * 0.03 + r
      ctx.globalAlpha = a
      ctx.strokeStyle = p.color
      ctx.lineWidth = Math.max(1, r * 0.7)
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03)
      ctx.stroke()
      drawGlowDot(ctx, p.x, p.y, r * 0.5, p.color, a * 0.8)
      ctx.globalCompositeOperation = 'source-over'
      break
    }
    case 'ember':
      ctx.globalCompositeOperation = 'lighter'
      drawGlowDot(ctx, p.x, p.y, r, p.color, a)
      ctx.globalCompositeOperation = 'source-over'
      break
    case 'smoke':
      ctx.globalAlpha = a * 0.3
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, r * 2.6, 0, TAU)
      ctx.fill()
      break
    case 'soul':
      ctx.globalAlpha = a * 0.55
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, r * 2.2, 0, TAU)
      ctx.fill()
      ctx.globalAlpha = a
      ctx.fillStyle = p.color2
      ctx.beginPath()
      ctx.arc(p.x, p.y, r * 0.7, 0, TAU)
      ctx.fill()
      break
    case 'ghost':
      ctx.globalAlpha = a * 0.5
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, r, r * 1.7, 0, 0, TAU)
      ctx.fill()
      ctx.globalAlpha = a * 0.85
      ctx.fillStyle = p.color2
      ctx.beginPath()
      ctx.arc(p.x, p.y - r * 0.6, r * 0.32, 0, TAU)
      ctx.fill()
      break
    case 'heal': {
      ctx.globalCompositeOperation = 'lighter'
      drawGlowDot(ctx, p.x, p.y, r, p.color, a, 'rgba(242,234,216,0.9)')
      ctx.globalAlpha = a
      ctx.strokeStyle = INK.cream
      ctx.lineWidth = 1.2
      const s = r * 1.5
      ctx.beginPath()
      ctx.moveTo(p.x - s, p.y)
      ctx.lineTo(p.x + s, p.y)
      ctx.moveTo(p.x, p.y - s)
      ctx.lineTo(p.x, p.y + s)
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
      break
    }
    case 'ice': {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = a
      ctx.strokeStyle = p.color
      ctx.lineWidth = 1.4
      ctx.beginPath()
      for (let k = 0; k < 3; k++) {
        const ang = p.rot + (k * Math.PI) / 3
        ctx.moveTo(p.x - Math.cos(ang) * r * 1.6, p.y - Math.sin(ang) * r * 1.6)
        ctx.lineTo(p.x + Math.cos(ang) * r * 1.6, p.y + Math.sin(ang) * r * 1.6)
      }
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
      break
    }
    case 'leaf':
      ctx.globalAlpha = a
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.moveTo(-r * 1.6, 0)
      ctx.quadraticCurveTo(0, -r, r * 1.6, 0)
      ctx.quadraticCurveTo(0, r, -r * 1.6, 0)
      ctx.fill()
      ctx.restore()
      break
    case 'rock':
      ctx.globalAlpha = a
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.fillRect(-r, -r * 0.7, r * 2, r * 1.4)
      ctx.globalAlpha = a * 0.5
      ctx.fillStyle = p.color2
      ctx.fillRect(-r * 0.5, -r * 0.35, r, r * 0.7)
      ctx.restore()
      break
    case 'ink':
      ctx.globalAlpha = a * 0.75
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, r * 2.4, 0, TAU)
      ctx.arc(p.x + r * 1.5, p.y - r * 0.9, r * 1.2, 0, TAU)
      ctx.arc(p.x - r * 1.3, p.y + r, r * 0.9, 0, TAU)
      ctx.fill()
      break
    case 'ring':
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = a * 0.8
      ctx.strokeStyle = p.color
      ctx.lineWidth = Math.max(1.5, r * 0.35)
      ctx.beginPath()
      ctx.arc(p.x, p.y, r * 5.5, 0, TAU)
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
      break
    case 'slash': {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = a * 0.9
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      const rad = r * 5
      ctx.strokeStyle = p.color
      ctx.lineWidth = Math.max(1.5, r * 0.8)
      ctx.beginPath()
      ctx.arc(0, 0, rad, -0.75, 0.75)
      ctx.stroke()
      ctx.globalAlpha = a * 0.8
      ctx.strokeStyle = INK.cream
      ctx.lineWidth = Math.max(1, r * 0.28)
      ctx.beginPath()
      ctx.arc(0, 0, rad * 0.94, -0.6, 0.6)
      ctx.stroke()
      ctx.restore()
      ctx.globalCompositeOperation = 'source-over'
      break
    }
    case 'scorch':
      ctx.globalAlpha = a * 0.42
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, p.size * (1 + t * 0.35), p.size * 0.34, 0, 0, TAU)
      ctx.fill()
      ctx.globalAlpha = a * 0.3
      ctx.fillStyle = p.color2
      ctx.beginPath()
      ctx.ellipse(p.x, p.y - 1, p.size * 0.5, p.size * 0.16, 0, 0, TAU)
      ctx.fill()
      break
  }
  ctx.globalAlpha = 1
}

/* -------------------------- 常用粒子组合 -------------------------- */

export function spawnHitSpark(
  pool: Pool<Particle>,
  x: number,
  y: number,
  color: string,
  count: number,
): void {
  emit(pool, 'spark', x, y, {
    count,
    speed: [90, 300],
    life: [0.16, 0.34],
    size: [1.4, 3.2],
    color,
    drag: 3.4,
  })
  emit(pool, 'ring', x, y, { count: 1, speed: [0, 1], life: [0.22, 0.22], size: [2.6, 3.4], color, drag: 0 })
}

export function spawnInkDissolve(
  pool: Pool<Particle>,
  x: number,
  y: number,
  count: number,
  radius: number,
  color: string = INK.ink800,
): void {
  emit(pool, 'ink', x, y, {
    count,
    radius,
    speed: [10, 70],
    life: [0.5, 1.1],
    size: [3, 9],
    shrink: 2,
    color,
    drag: 1.2,
    glow: false,
  })
}

export function spawnSoulMist(
  pool: Pool<Particle>,
  x: number,
  y: number,
  count: number,
  radius: number,
): void {
  emit(pool, 'soul', x, y, { count, radius, speed: [10, 40], life: [0.5, 1], size: [3, 7], color: 'rgba(58,26,74,0.9)', color2: INK.purple, drag: 1, glow: false })
  emit(pool, 'ghost', x, y, { count: Math.max(1, count >> 2), radius, speed: [6, 22], life: [0.9, 1.6], size: [3, 6], color: 'rgba(96,44,120,0.5)', color2: '#e6c8ff', gravity: -26, drag: 0.4, glow: false })
}

export function spawnHealRise(pool: Pool<Particle>, x: number, y: number, count: number): void {
  emit(pool, 'heal', x, y, {
    count,
    radius: 28,
    speed: [8, 26],
    angle: -Math.PI / 2,
    spread: 0.6,
    life: [0.7, 1.2],
    size: [2, 4.5],
    color: INK.jade300,
    gravity: -34,
    drag: 0.5,
  })
}

export function spawnScorch(pool: Pool<Particle>, x: number, y: number, radius: number): void {
  emit(pool, 'scorch', x, y, {
    count: 1,
    radius,
    life: [1.5, 1.5],
    size: [radius, radius],
    color: 'rgba(210,75,58,0.5)',
    color2: 'rgba(240,138,90,0.6)',
    drag: 0,
    glow: false,
  })
}

/* ------------------------------------------------------------------ */
/* 弹道                                                                */
/* ------------------------------------------------------------------ */

/** 残影环缓冲容量（预分配，飞行途中零分配） */
export const TRAIL_CAP = 14

export type ProjectileKind = 'sword' | 'fire' | 'water' | 'wood' | 'earth' | 'soul' | 'slash'

export interface Projectile {
  active: boolean
  kind: ProjectileKind
  x: number
  y: number
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
  speed: number
  arc: number
  size: number
  color: string
  color2: string
  rot: number
  /** 残影采样：环形缓冲 [x0,y0,x1,y1,...] */
  trail: Float32Array
  trailHead: number
  trailLen: number
  sampleT: number
  /** 命中回调只触发一次 */
  impacted: boolean
}

export function makeProjectile(): Projectile {
  return {
    active: false,
    kind: 'sword',
    x: 0,
    y: 0,
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
    t: 0,
    speed: 3,
    arc: 0,
    size: 6,
    color: INK.jade300,
    color2: INK.cream,
    rot: 0,
    trail: new Float32Array(TRAIL_CAP * 2),
    trailHead: -1,
    trailLen: 0,
    sampleT: 0,
    impacted: false,
  }
}

const PROJECTILE_LOOK: Record<ProjectileKind, { color: string; color2: string; size: number; arc: number; speed: number }> = {
  sword: { color: '#cdf5ec', color2: INK.jade400, size: 7, arc: -26, speed: 4.2 },
  fire: { color: '#ffb066', color2: INK.blood, size: 11, arc: -14, speed: 3 },
  water: { color: '#a9dcf5', color2: '#5b9bd5', size: 9, arc: -40, speed: 2.8 },
  wood: { color: '#9be08d', color2: '#3f7d43', size: 8, arc: -18, speed: 2.6 },
  earth: { color: '#d8ab6a', color2: '#6b4a26', size: 13, arc: -34, speed: 2.4 },
  soul: { color: '#b98ada', color2: '#3a1a4a', size: 10, arc: -20, speed: 2.2 },
  slash: { color: INK.cream, color2: '#cdf5ec', size: 6, arc: -8, speed: 3.6 },
}

export function spawnProjectile(
  pool: Pool<Projectile>,
  kind: ProjectileKind,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sizeScale = 1,
): Projectile {
  const look = PROJECTILE_LOOK[kind]
  const p = pool.acquire()
  p.active = true
  p.kind = kind
  p.x0 = x0
  p.y0 = y0
  p.x1 = x1
  p.y1 = y1
  p.x = x0
  p.y = y0
  p.t = 0
  p.speed = look.speed
  p.arc = look.arc
  p.size = look.size * sizeScale
  p.color = look.color
  p.color2 = look.color2
  p.rot = Math.atan2(y1 - y0, x1 - x0)
  p.trail.fill(0)
  p.trailHead = -1
  p.trailLen = 0
  p.sampleT = 0
  p.impacted = false
  return p
}

export function updateProjectile(p: Projectile, dt: number, sample: boolean): boolean {
  p.t += p.speed * dt
  if (p.t >= 1) p.t = 1
  p.x = p.x0 + (p.x1 - p.x0) * p.t
  p.y = p.y0 + (p.y1 - p.y0) * p.t + Math.sin(Math.PI * p.t) * p.arc
  p.rot = Math.atan2(p.y1 - p.y0, p.x1 - p.x0)
  if (sample) {
    p.sampleT += dt
    if (p.sampleT >= 0.016) {
      p.sampleT = 0
      p.trailHead = (p.trailHead + 1) % TRAIL_CAP
      p.trail[p.trailHead * 2] = p.x
      p.trail[p.trailHead * 2 + 1] = p.y
      if (p.trailLen < TRAIL_CAP) p.trailLen++
    }
  }
  return p.t < 1
}

export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  p: Projectile,
  allowTrail: boolean,
): void {
  const { x, y, size, rot } = p
  // 残影：沿环缓冲插值绘制（仅高质量档开启）
  if (allowTrail && p.trailLen > 2) {
    for (let i = 1; i < p.trailLen; i++) {
      const idx = (p.trailHead - i + TRAIL_CAP * 2) % TRAIL_CAP
      const tx = p.trail[idx * 2]
      const ty = p.trail[idx * 2 + 1]
      const k = 1 - i / p.trailLen
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = k * k * (p.kind === 'sword' ? 0.5 : 0.34)
      ctx.fillStyle = p.kind === 'soul' ? p.color2 : p.color
      ctx.beginPath()
      ctx.arc(tx, ty, size * k * (p.kind === 'earth' ? 0.9 : 0.6), 0, TAU)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.globalCompositeOperation = 'lighter'
  switch (p.kind) {
    case 'sword': {
      ctx.globalAlpha = 0.85
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.moveTo(size * 1.9, 0)
      ctx.lineTo(-size * 1.1, -size * 0.42)
      ctx.lineTo(-size * 1.7, 0)
      ctx.lineTo(-size * 1.1, size * 0.42)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = INK.cream
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(-size * 2.4, 0)
      ctx.lineTo(size * 1.6, 0)
      ctx.stroke()
      ctx.globalAlpha = 0.6
      ctx.strokeStyle = p.color2
      ctx.lineWidth = 2.6
      ctx.beginPath()
      ctx.moveTo(-size * 3.4, 0)
      ctx.lineTo(-size * 0.8, 0)
      ctx.stroke()
      break
    }
    case 'fire': {
      drawGlowDot(ctx, 0, 0, size * 0.8, p.color, 0.95, 'rgba(255,240,200,0.95)')
      ctx.globalAlpha = 0.5
      ctx.fillStyle = p.color2
      ctx.beginPath()
      ctx.arc(-size * 0.6, 0, size * 1.15, 0, TAU)
      ctx.fill()
      ctx.globalAlpha = 0.7
      ctx.strokeStyle = p.color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-size * 2.6, -size * 0.35)
      ctx.quadraticCurveTo(-size * 1.2, size * 0.5, -size * 0.2, 0)
      ctx.stroke()
      break
    }
    case 'water': {
      ctx.globalAlpha = 0.9
      ctx.strokeStyle = p.color
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.moveTo(-size * 3, 0)
      ctx.quadraticCurveTo(0, -size * 1.4, size * 1.6, 0)
      ctx.stroke()
      ctx.globalAlpha = 0.55
      ctx.strokeStyle = p.color2
      ctx.lineWidth = 4.2
      ctx.beginPath()
      ctx.moveTo(-size * 3.4, 0)
      ctx.quadraticCurveTo(0, -size * 1.9, size * 1.4, 0)
      ctx.stroke()
      ctx.globalAlpha = 0.9
      drawGlowDot(ctx, size * 1.2, 0, size * 0.45, p.color, 0.8, 'rgba(230,250,255,0.95)')
      break
    }
    case 'wood': {
      ctx.globalAlpha = 0.85
      ctx.strokeStyle = p.color2
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(-size * 3, 0)
      ctx.bezierCurveTo(-size * 1.4, -size * 1.1, size * 0.4, size * 1.1, size * 1.7, 0)
      ctx.stroke()
      ctx.globalAlpha = 0.9
      ctx.fillStyle = p.color
      for (let i = -2; i <= 2; i++) {
        const fx = i * size * 0.62
        ctx.beginPath()
        ctx.ellipse(fx, -size * 0.5, size * 0.5, size * 0.24, -0.5, 0, TAU)
        ctx.fill()
      }
      break
    }
    case 'earth': {
      ctx.globalAlpha = 0.55
      ctx.fillStyle = p.color2
      ctx.beginPath()
      ctx.arc(-size * 0.7, size * 0.3, size * 0.9, 0, TAU)
      ctx.fill()
      ctx.globalAlpha = 0.95
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.moveTo(size * 1.1, 0)
      ctx.lineTo(size * 0.2, -size * 0.95)
      ctx.lineTo(-size * 0.9, -size * 0.5)
      ctx.lineTo(-size * 0.7, size * 0.7)
      ctx.lineTo(size * 0.4, size * 0.85)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'soul': {
      ctx.globalAlpha = 0.7
      ctx.fillStyle = p.color2
      ctx.beginPath()
      ctx.arc(-size * 0.5, 0, size * 1.3, 0, TAU)
      ctx.fill()
      drawGlowDot(ctx, 0, 0, size * 0.55, p.color, 0.9, 'rgba(232,200,255,0.9)')
      ctx.globalAlpha = 0.5
      ctx.fillStyle = 'rgba(20,8,26,0.9)'
      ctx.beginPath()
      ctx.arc(size * 0.1, 0, size * 0.34, 0, TAU)
      ctx.fill()
      break
    }
    case 'slash': {
      ctx.globalAlpha = 0.9
      ctx.strokeStyle = p.color
      ctx.lineWidth = size * 0.6
      ctx.beginPath()
      ctx.arc(0, 0, size * 1.5, -0.9, 0.9)
      ctx.stroke()
      ctx.globalAlpha = 0.6
      ctx.strokeStyle = p.color2
      ctx.lineWidth = size * 0.24
      ctx.beginPath()
      ctx.arc(0, 0, size * 1.9, -0.7, 0.7)
      ctx.stroke()
      break
    }
  }
  ctx.restore()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/* ------------------------------------------------------------------ */
/* 掉落光柱                                                            */
/* ------------------------------------------------------------------ */

export interface LightPillar {
  active: boolean
  x: number
  baseY: number
  topY: number
  width: number
  color: string
  life: number
  maxLife: number
  /** 高品质掉落的额外停顿强调（秒） */
  hold: number
  shake: number
  label: string
  font: string
}

export function makeLightPillar(): LightPillar {
  return {
    active: false,
    x: 0,
    baseY: 0,
    topY: 0,
    width: 24,
    color: INK.blue,
    life: 0,
    maxLife: 1.6,
    hold: 0,
    shake: 0,
    label: '',
    font: `600 12px ${FONT_SERIF}`,
  }
}

export function spawnLightPillar(
  pool: Pool<LightPillar>,
  x: number,
  baseY: number,
  topY: number,
  color: string,
  hold: number,
  label: string,
): LightPillar {
  const p = pool.acquire()
  p.active = true
  p.x = x
  p.baseY = baseY
  p.topY = topY
  p.width = hold > 0 ? 46 : 26
  p.color = color
  p.hold = hold
  p.shake = hold > 0 ? 3.2 : 0.6
  p.maxLife = 1.5 + hold
  p.life = p.maxLife
  p.label = label
  return p
}

export function updateLightPillar(p: LightPillar, dt: number): boolean {
  p.life -= dt
  return p.life > 0
}

export function drawLightPillar(ctx: CanvasRenderingContext2D, p: LightPillar, time: number): void {
  const t = 1 - p.life / p.maxLife
  const grow = Math.min(1, t / 0.14)
  const fade = t > 0.72 ? Math.max(0, 1 - (t - 0.72) / 0.28) : 1
  const shakeAmp = t < 0.5 ? p.shake : 0
  const x = p.x + Math.sin(time * 42 + p.x) * shakeAmp
  const h = (p.baseY - p.topY) * grow
  const top = p.baseY - h
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const layer = (w: number, alpha: number, color: string) => {
    ctx.globalAlpha = alpha * fade
    ctx.fillStyle = color
    ctx.fillRect(x - w / 2, top, w, h)
  }
  layer(p.width * 2.4, 0.16, p.color)
  layer(p.width * 1.3, 0.26, p.color)
  layer(p.width * 0.5, 0.7, p.color)
  layer(p.width * 0.16, 0.9, INK.cream)
  ctx.globalAlpha = 0.5 * fade
  ctx.fillStyle = p.color
  ctx.beginPath()
  ctx.ellipse(x, p.baseY, p.width * 1.5, p.width * 0.4, 0, 0, TAU)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  if (p.label) {
    ctx.globalAlpha = fade
    ctx.font = p.font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = 'rgba(7,9,8,0.8)'
    ctx.fillText(p.label, x, top - 5)
    ctx.fillStyle = p.color
    ctx.fillText(p.label, x, top - 6)
  }
  ctx.restore()
  ctx.globalAlpha = 1
}

/* ------------------------------------------------------------------ */
/* 全屏特效（闪光 / 压暗 / 狂暴渐晕 / 水墨过渡 / 涟漪）                  */
/* ------------------------------------------------------------------ */

export type ScreenFxKind = 'flash' | 'dark' | 'enrage' | 'ink' | 'ripple'

export interface ScreenFx {
  active: boolean
  kind: ScreenFxKind
  life: number
  maxLife: number
  strength: number
  color: string
  seed: number
}

export function makeScreenFx(): ScreenFx {
  return {
    active: false,
    kind: 'flash',
    life: 0,
    maxLife: 0.2,
    strength: 0.5,
    color: INK.gold300,
    seed: 1,
  }
}

export function spawnScreenFx(
  pool: Pool<ScreenFx>,
  kind: ScreenFxKind,
  strength: number,
  duration: number,
  color: string = INK.gold300,
): ScreenFx {
  const f = pool.acquire()
  f.active = true
  f.kind = kind
  f.maxLife = duration
  f.life = duration
  f.strength = strength
  f.color = color
  f.seed = (f.seed + 17) % 977
  return f
}

export function updateScreenFx(f: ScreenFx, dt: number): boolean {
  f.life -= dt
  return f.life > 0
}

export function drawScreenFx(
  ctx: CanvasRenderingContext2D,
  f: ScreenFx,
  w: number,
  h: number,
): void {
  const t = 1 - f.life / f.maxLife
  switch (f.kind) {
    case 'flash': {
      ctx.globalAlpha = f.strength * Math.pow(1 - t, 2.2)
      ctx.fillStyle = f.color
      ctx.fillRect(0, 0, w, h)
      break
    }
    case 'dark': {
      ctx.globalAlpha = f.strength * (1 - t) * 0.9
      ctx.fillStyle = 'rgba(4,6,7,1)'
      ctx.fillRect(0, 0, w, h)
      break
    }
    case 'enrage': {
      const pulse = 0.55 + 0.45 * Math.sin(t * Math.PI * 6)
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, Math.max(w, h) * 0.68)
      g.addColorStop(0, 'rgba(125,36,24,0)')
      g.addColorStop(0.65, `rgba(125,36,24,${0.28 * f.strength * pulse})`)
      g.addColorStop(1, `rgba(210,75,58,${0.62 * f.strength * pulse})`)
      ctx.globalAlpha = Math.max(0, 1 - t * 0.55)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      break
    }
    case 'ink': {
      // 水墨扩散：多个不规则墨团由中心铺满，再自行退去
      const p = t < 0.5 ? t / 0.5 : 1 - (t - 0.5) / 0.5
      const ease = p * p * (3 - 2 * p)
      const maxR = Math.hypot(w, h) * 0.62
      ctx.globalAlpha = ease * f.strength
      ctx.fillStyle = f.color
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + hash01(f.seed + i) * 0.6
        const d = maxR * 0.22 * hash01(f.seed * 3 + i)
        const r = maxR * ease * (0.55 + 0.45 * hash01(f.seed * 5 + i))
        ctx.beginPath()
        ctx.arc(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, r, 0, TAU)
        ctx.fill()
      }
      break
    }
    case 'ripple': {
      ctx.globalCompositeOperation = 'lighter'
      const cx = w / 2
      const cy = h * 0.52
      for (let i = 0; i < 3; i++) {
        const k = Math.min(1, t * 1.4 - i * 0.14)
        if (k <= 0) continue
        ctx.globalAlpha = (1 - k) * f.strength * 0.55
        ctx.strokeStyle = f.color
        ctx.lineWidth = 8 * (1 - k) + 1.5
        ctx.beginPath()
        ctx.ellipse(cx, cy, Math.max(w, h) * 0.6 * k, Math.max(w, h) * 0.34 * k, 0, 0, TAU)
        ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
      break
    }
  }
  ctx.globalAlpha = 1
}

/* ------------------------------------------------------------------ */
/* 护盾罩                                                              */
/* ------------------------------------------------------------------ */

export interface ShieldFx {
  active: boolean
  x: number
  y: number
  rx: number
  ry: number
  power: number
  maxPower: number
  /** 触发呼吸脉冲的剩余时间 */
  pulse: number
  life: number
}

export function makeShieldFx(): ShieldFx {
  return { active: false, x: 0, y: 0, rx: 0, ry: 0, power: 0, maxPower: 1, pulse: 0, life: 0 }
}

export function updateShieldFx(s: ShieldFx, dt: number): boolean {
  s.pulse = Math.max(0, s.pulse - dt)
  s.life = Math.max(0, s.life - dt)
  return s.pulse > 0 || (s.power > 0 && s.life > 0)
}

export function drawShieldFx(ctx: CanvasRenderingContext2D, s: ShieldFx, time: number): void {
  if (!s.active) return
  const breath = 0.5 + 0.5 * Math.sin(time * 2.4)
  const pulseK = s.pulse > 0 ? s.pulse * 2.6 : 0
  const alpha = 0.1 + breath * 0.08 + pulseK * 0.35
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = alpha
  ctx.fillStyle = INK.gold400
  ctx.beginPath()
  ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 0.35 + pulseK * 0.4
  ctx.strokeStyle = INK.gold300
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.ellipse(s.x, s.y, s.rx * (1 + pulseK * 0.06), s.ry * (1 + pulseK * 0.06), 0, 0, TAU)
  ctx.stroke()
  // 符文环：护盾力量比例的弧段
  const ratio = s.maxPower > 0 ? Math.min(1, s.power / s.maxPower) : 0
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = INK.gold200
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.ellipse(s.x, s.y, s.rx * 0.86, s.ry * 0.86, 0, -Math.PI / 2, -Math.PI / 2 + TAU * ratio)
  ctx.stroke()
  ctx.restore()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/* ------------------------------------------------------------------ */
/* 光束（雷链 / 治疗 / 藤蔓 / 魂线）                                    */
/* ------------------------------------------------------------------ */

export const BEAM_SEGMENTS = 12

export type BeamKind = 'thunder' | 'heal' | 'vine' | 'soul'

export interface Beam {
  active: boolean
  kind: BeamKind
  x0: number
  y0: number
  x1: number
  y1: number
  life: number
  maxLife: number
  width: number
  color: string
  color2: string
  jitter: number
  seed: number
  points: Float32Array
}

export function makeBeam(): Beam {
  return {
    active: false,
    kind: 'thunder',
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
    life: 0,
    maxLife: 0.4,
    width: 3,
    color: INK.gold300,
    color2: '#f4e2a8',
    jitter: 26,
    seed: 1,
    points: new Float32Array((BEAM_SEGMENTS + 1) * 2),
  }
}

/** 确定式哈希噪声：避免抖动动画消耗全局随机序列 */
export function hash01(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

export function spawnBeam(
  pool: Pool<Beam>,
  kind: BeamKind,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Beam {
  const b = pool.acquire()
  b.active = true
  b.kind = kind
  b.x0 = x0
  b.y0 = y0
  b.x1 = x1
  b.y1 = y1
  b.seed = (Math.floor(x0 + y0 + x1 + y1) % 997) + 1
  switch (kind) {
    case 'thunder':
      b.maxLife = 0.34
      b.width = 3.2
      b.color = INK.gold300
      b.color2 = '#ffffff'
      b.jitter = 26
      break
    case 'heal':
      b.maxLife = 0.7
      b.width = 2.4
      b.color = INK.jade300
      b.color2 = INK.jade500
      b.jitter = 8
      break
    case 'vine':
      b.maxLife = 0.55
      b.width = 3.6
      b.color = '#9be08d'
      b.color2 = '#3f7d43'
      b.jitter = 14
      break
    case 'soul':
      b.maxLife = 0.6
      b.width = 4
      b.color = '#b98ada'
      b.color2 = '#3a1a4a'
      b.jitter = 10
      break
  }
  b.life = b.maxLife
  return b
}

export function updateBeam(b: Beam, dt: number): boolean {
  b.life -= dt
  b.seed += 1
  return b.life > 0
}

export function drawBeam(ctx: CanvasRenderingContext2D, b: Beam): void {
  const t = 1 - b.life / b.maxLife
  const a = t > 0.55 ? 1 - (t - 0.55) / 0.45 : 1
  const dx = b.x1 - b.x0
  const dy = b.y1 - b.y0
  const nx = -dy
  const ny = dx
  const norm = Math.hypot(nx, ny) || 1
  const pts = b.points
  for (let i = 0; i <= BEAM_SEGMENTS; i++) {
    const k = i / BEAM_SEGMENTS
    const off =
      i === 0 || i === BEAM_SEGMENTS
        ? 0
        : (hash01(b.seed * 31 + i) - 0.5) * b.jitter * Math.sin(Math.PI * k)
    pts[i * 2] = b.x0 + dx * k + (nx / norm) * off
    pts[i * 2 + 1] = b.y0 + dy * k + (ny / norm) * off
  }
  const stroke = (width: number, color: string, alpha: number) => {
    ctx.globalAlpha = alpha
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[0], pts[1])
    for (let i = 1; i <= BEAM_SEGMENTS; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1])
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'lighter'
  if (b.kind === 'thunder') {
    stroke(b.width * 4.5, 'rgba(60,80,180,0.5)', a * 0.5)
    stroke(b.width * 1.5, b.color, a * 0.9)
    stroke(b.width * 0.6, b.color2, a)
    // 分叉：从随机段引出短折线
    for (let k = 0; k < 2; k++) {
      const i = 3 + Math.floor(hash01(b.seed * 7 + k * 13) * (BEAM_SEGMENTS - 6))
      const bx = pts[i * 2]
      const by = pts[i * 2 + 1]
      ctx.globalAlpha = a * 0.6
      ctx.lineWidth = 1.2
      ctx.strokeStyle = b.color
      ctx.beginPath()
      ctx.moveTo(bx, by)
      for (let j = 1; j <= 3; j++) {
        ctx.lineTo(
          bx + (hash01(b.seed + i + j + k) - 0.5) * 60,
          by + (hash01(b.seed + i - j - k) - 0.5) * 60 + j * 8,
        )
      }
      ctx.stroke()
    }
  } else if (b.kind === 'heal') {
    ctx.setLineDash([6, 7])
    stroke(b.width * 2.4, b.color, a * 0.35)
    stroke(b.width, b.color2, a * 0.9)
    ctx.setLineDash([])
  } else if (b.kind === 'vine') {
    stroke(b.width * 2.2, b.color2, a * 0.6)
    stroke(b.width * 0.8, b.color, a * 0.95)
  } else {
    stroke(b.width * 3, b.color2, a * 0.45)
    ctx.setLineDash([10, 6])
    stroke(b.width, b.color, a * 0.85)
    ctx.setLineDash([])
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/* ------------------------------------------------------------------ */
/* 程序化水墨元素（背景山影 / 人物剪影，立绘缺失时兜底）                 */
/* ------------------------------------------------------------------ */

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t)

/** 一笔水墨山脊：以二次曲线连接随机峰点，越近的山脊越浓 */
function ridge(
  ctx: CanvasRenderingContext2D,
  rng: { next: () => number },
  w: number,
  h: number,
  baseY: number,
  amp: number,
  color: string,
  alpha: number,
  steps: number,
): void {
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(-8, h)
  let y = baseY
  ctx.lineTo(-8, y)
  const step = w / steps
  for (let i = 1; i <= steps; i++) {
    const x = i * step
    const px = x - step * 0.5
    y = baseY + (rng.next() - 0.5) * amp * (0.5 + 0.5 * Math.sin((i / steps) * Math.PI))
    ctx.quadraticCurveTo(px, y - amp * 0.28, x, y)
  }
  ctx.lineTo(w + 8, h)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = alpha * 0.45
  ctx.strokeStyle = color
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.globalAlpha = 1
}

/**
 * 程序化水墨山影（远景 → 近景三层 + 雾气 + 淡月）。
 * 只在离屏层绘制一次并缓存，不参与每帧开销。
 */
export function drawInkMountain(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number): void {
  const rng = makeRng(seed)
  const horizon = h * 0.7
  // 淡月
  ctx.globalAlpha = 0.16
  ctx.fillStyle = INK.cream
  ctx.beginPath()
  ctx.arc(w * 0.72, h * 0.2, Math.min(w, h) * 0.09, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 1

  ridge(ctx, rng, w, h, horizon - h * 0.18, h * 0.13, '#5a6b66', 0.3, 7)
  ridge(ctx, rng, w, h, horizon - h * 0.07, h * 0.2, '#33423d', 0.45, 6)
  ridge(ctx, rng, w, h, horizon + h * 0.02, h * 0.26, '#16201d', 0.72, 5)

  // 雾气：横向渐隐的宣纸白薄带
  for (let i = 0; i < 4; i++) {
    const y = horizon - h * (0.02 + i * 0.07)
    const g = ctx.createLinearGradient(0, y - h * 0.05, 0, y + h * 0.05)
    g.addColorStop(0, 'rgba(242,234,216,0)')
    g.addColorStop(0.5, `rgba(242,234,216,${0.1 - i * 0.018})`)
    g.addColorStop(1, 'rgba(242,234,216,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, y - h * 0.05, w, h * 0.1)
  }

  // 地面墨迹：横向渐变的浓墨，往上淡出
  const ground = ctx.createLinearGradient(0, horizon, 0, h)
  ground.addColorStop(0, 'rgba(7,9,8,0.15)')
  ground.addColorStop(0.35, 'rgba(7,9,8,0.75)')
  ground.addColorStop(1, 'rgba(7,9,8,0.98)')
  ctx.fillStyle = ground
  ctx.fillRect(0, horizon, w, h - horizon)
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#0b100e'
  for (let i = 0; i < 5; i++) {
    const y = horizon + (h - horizon) * (0.12 + i * 0.17)
    ctx.beginPath()
    ctx.ellipse(w * rng.next(), y, w * (0.3 + rng.next() * 0.4), 6 + rng.next() * 10, 0, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export interface SilhouettePalette {
  robe: string
  trim: string
  glow: string
}

/** 程序化人物 / 妖兽剪影（x,y 为脚底中心点） */
export function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  palette: SilhouettePalette,
  variant: 'human' | 'beast' = 'human',
): void {
  const H = 96 * scale
  ctx.save()
  ctx.translate(x, y)
  // 落影
  ctx.globalAlpha = 0.5
  ctx.fillStyle = 'rgba(7,9,8,0.8)'
  ctx.beginPath()
  ctx.ellipse(0, 0, 32 * scale, 7 * scale, 0, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = palette.robe
  ctx.strokeStyle = palette.glow
  ctx.lineJoin = 'round'

  if (variant === 'beast') {
    const s = scale
    // 躯干
    ctx.beginPath()
    ctx.ellipse(0, -H * 0.42, 46 * s, 22 * s, 0, 0, TAU)
    ctx.fill()
    // 四肢
    for (const lx of [-30, -14, 16, 32]) {
      ctx.fillRect(lx * s - 4 * s, -H * 0.34, 8 * s, H * 0.36)
    }
    // 背脊尖刺
    ctx.beginPath()
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(i * 16 * s, -H * 0.6)
      ctx.lineTo(i * 16 * s + 8 * s, -H * 0.78)
      ctx.lineTo(i * 16 * s + 16 * s, -H * 0.58)
    }
    ctx.fill()
    // 头颈
    ctx.beginPath()
    ctx.ellipse(52 * s, -H * 0.62, 21 * s, 16 * s, -0.2, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(62 * s, -H * 0.58)
    ctx.lineTo(84 * s, -H * 0.52)
    ctx.lineTo(62 * s, -H * 0.46)
    ctx.closePath()
    ctx.fill()
    // 双角
    ctx.lineWidth = 3 * s
    ctx.strokeStyle = palette.trim
    ctx.beginPath()
    ctx.moveTo(48 * s, -H * 0.74)
    ctx.quadraticCurveTo(40 * s, -H * 0.95, 20 * s, -H * 0.92)
    ctx.moveTo(58 * s, -H * 0.74)
    ctx.quadraticCurveTo(62 * s, -H * 0.98, 46 * s, -H * 1.0)
    ctx.stroke()
    // 尾
    ctx.beginPath()
    ctx.moveTo(-44 * s, -H * 0.5)
    ctx.quadraticCurveTo(-76 * s, -H * 0.62, -66 * s, -H * 0.24)
    ctx.lineWidth = 5 * s
    ctx.strokeStyle = palette.robe
    ctx.stroke()
    // 凶光
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = INK.blood
    for (const ex of [50, 60]) {
      ctx.beginPath()
      ctx.arc(ex * s, -H * 0.64, 2.4 * s, 0, TAU)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  } else {
    // 道袍：肩 → 下摆的笔触轮廓
    ctx.beginPath()
    ctx.moveTo(-16 * scale, -H * 0.44)
    ctx.quadraticCurveTo(-13 * scale, -H * 0.72, 0, -H * 0.76)
    ctx.quadraticCurveTo(13 * scale, -H * 0.72, 17 * scale, -H * 0.42)
    ctx.quadraticCurveTo(26 * scale, -H * 0.2, 22 * scale, -3 * scale)
    ctx.quadraticCurveTo(10 * scale, -9 * scale, 0, -5 * scale)
    ctx.quadraticCurveTo(-10 * scale, -9 * scale, -22 * scale, -3 * scale)
    ctx.quadraticCurveTo(-26 * scale, -H * 0.22, -16 * scale, -H * 0.44)
    ctx.closePath()
    ctx.fill()
    // 腰带
    ctx.globalAlpha = 0.9
    ctx.fillStyle = palette.trim
    ctx.fillRect(-15 * scale, -H * 0.42, 30 * scale, 5 * scale)
    ctx.globalAlpha = 1
    // 头与发髻
    ctx.beginPath()
    ctx.arc(0, -H * 0.84, 11 * scale, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(2 * scale, -H * 0.97, 5 * scale, 0, TAU)
    ctx.fill()
    // 长剑：斜指苍天
    ctx.strokeStyle = palette.glow
    ctx.lineWidth = 2.2 * scale
    ctx.beginPath()
    ctx.moveTo(8 * scale, -H * 0.5)
    ctx.lineTo(34 * scale, -H * 1.02)
    ctx.stroke()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.55
    ctx.strokeStyle = INK.cream
    ctx.lineWidth = 1 * scale
    ctx.beginPath()
    ctx.moveTo(8 * scale, -H * 0.5)
    ctx.lineTo(34 * scale, -H * 1.02)
    ctx.stroke()
    ctx.globalAlpha = 0.35
    ctx.strokeStyle = palette.glow
    ctx.lineWidth = 5 * scale
    ctx.beginPath()
    ctx.moveTo(-24 * scale, -H * 0.6)
    ctx.quadraticCurveTo(0, -H * 0.66, 22 * scale, -H * 0.56)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
  ctx.globalAlpha = 1
}
