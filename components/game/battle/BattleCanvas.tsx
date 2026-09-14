'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { QUALITY } from '@/lib/game/ui-tokens'
import type { Quality } from '@/lib/game/types'
import type { BattleEvent, LiveBattleState } from '@/lib/game/types'
import {
  type Beam,
  type DamageNumber,
  easeOut,
  INK,
  type LightPillar,
  type Particle,
  Pool,
  type Projectile,
  type ScreenFx,
  type ShieldFx,
  type SilhouettePalette,
  drawBeam,
  drawDamageNumber,
  drawInkMountain,
  drawLightPillar,
  drawParticle,
  drawProjectile,
  drawScreenFx,
  drawShieldFx,
  drawSilhouette,
  emit,
  makeBeam,
  makeDamageNumber,
  makeLightPillar,
  makeParticle,
  makeProjectile,
  makeScreenFx,
  makeShieldFx,
  rnd,
  spawnBeam,
  spawnDamageNumber,
  spawnHealRise,
  spawnHitSpark,
  spawnInkDissolve,
  spawnLabel,
  spawnLightPillar,
  spawnProjectile,
  spawnScorch,
  spawnScreenFx,
  spawnSoulMist,
  updateBeam,
  updateDamageNumber,
  updateLightPillar,
  updateParticle,
  updateProjectile,
  updateScreenFx,
  updateShieldFx,
} from './objects'

export interface BattleCanvasProps {
  /** 战斗事件流，按时间戳递增 */
  events: BattleEvent[]
  /** 实时战斗状态快照（每帧由父层更新） */
  state: LiveBattleState | null
  /** 敌方名字与立绘，用于顶部血条与 Boss 出场 */
  enemy: { name: string; image?: string; icon?: string; isBoss: boolean }
  /** 玩家立绘 */
  player: { name: string; image?: string }
  /** 屏幕尺寸（父层负责，Canvas 只按此缩放，内部按 DPR 适配） */
  width: number
  height: number
  /** 特效质量档位 */
  quality?: 'low' | 'mid' | 'high'
  /** 战斗是否已结束（播完最后一帧特效后可静止） */
  finished?: boolean
  /** 点击画面的回调（用于跳过/加速） */
  onTap?: () => void
  className?: string
}

const MAX_DPR = 2
const BG_PHOTO = '/images/bg-battle-ridge.png'
const TAU = Math.PI * 2

/* ------------------------------------------------------------------ */
/* 布局与资源                                                          */
/* ------------------------------------------------------------------ */

interface Geo {
  w: number
  h: number
  groundY: number
  playerX: number
  playerFeet: number
  enemyX: number
  enemyFeet: number
  playerH: number
  enemyH: number
  isBoss: boolean
}

function computeGeo(w: number, h: number, isBoss: boolean): Geo {
  const groundY = h * 0.9
  const enemyH = (isBoss ? 0.46 : 0.32) * h
  return {
    w,
    h,
    groundY,
    playerX: w * 0.24,
    playerFeet: groundY,
    enemyX: w * 0.76,
    enemyFeet: h * (isBoss ? 0.8 : 0.82),
    playerH: 0.3 * h,
    enemyH,
    isBoss,
  }
}

const QUALITY_BY_SLOT: Record<string, Quality> = {
  white: 'white',
  green: 'green',
  blue: 'blue',
  purple: 'purple',
  orange: 'orange',
  red: 'red',
  rainbow: 'rainbow',
}

/** 掉落光柱品质：事件未直接给出品质时，用图标 / 名称反查 */
function resolveQuality(e: BattleEvent): Quality {
  if (e.icon && QUALITY_BY_SLOT[e.icon]) return QUALITY_BY_SLOT[e.icon]
  const byLabel = (Object.keys(QUALITY) as Quality[]).find(
    (q) => QUALITY[q].label === e.label || q === e.label,
  )
  return byLabel ?? 'blue'
}

function loadImage(src: string, onReady: () => void): HTMLImageElement | null {
  if (typeof window === 'undefined') return null
  const img = new Image()
  img.decoding = 'async'
  img.onload = onReady
  img.onerror = () => {
    img.dataset.failed = '1'
  }
  img.src = src
  return img
}

interface CanvasAssets {
  bg: HTMLImageElement | null
  player: HTMLImageElement | null
  enemy: HTMLImageElement | null
}

/** 立绘可用性判定：加载失败 / 未完成一律回落到程序化剪影 */
function spriteReady(img: HTMLImageElement | null): img is HTMLImageElement {
  return !!img && img.complete && img.naturalWidth > 0 && img.dataset.failed !== '1'
}

function drawEntitySprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  feetY: number,
  h: number,
  variant: 'human' | 'beast',
  palette: SilhouettePalette,
  flash: number,
): void {
  if (spriteReady(img)) {
    const ratio = img.naturalWidth / img.naturalHeight
    const w = h * ratio
    ctx.drawImage(img, x - w / 2, feetY - h, w, h)
    if (flash > 0) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = flash * 0.35
      ctx.drawImage(img, x - w / 2, feetY - h, w, h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }
    return
  }
  drawSilhouette(ctx, x, feetY, variant === 'beast' ? h / 130 : h / 96, palette, variant)
}

/* ------------------------------------------------------------------ */
/* 场景状态                                                            */
/* ------------------------------------------------------------------ */

interface Minion {
  x: number
  y: number
  scale: number
  life: number
  max: number
  beast: boolean
}

interface Scene {
  dmg: Pool<DamageNumber>
  particles: Pool<Particle>
  shots: Pool<Projectile>
  beams: Pool<Beam>
  pillars: Pool<LightPillar>
  screens: Pool<ScreenFx>
  playerShield: ShieldFx
  enemyShield: ShieldFx
  minions: Minion[]
  /** 事件游标：只处理新增事件，避免重复触发 */
  cursor: number
  firstEvent: BattleEvent | null
  time: number
  shake: number
  enrageUntil: number
  enemyFlash: number
  playerFlash: number
  intro: number
}

function makeScene(): Scene {
  return {
    dmg: new Pool(64, makeDamageNumber),
    particles: new Pool(300, makeParticle),
    shots: new Pool(24, makeProjectile),
    beams: new Pool(16, makeBeam),
    pillars: new Pool(12, makeLightPillar),
    screens: new Pool(8, makeScreenFx),
    playerShield: makeShieldFx(),
    enemyShield: makeShieldFx(),
    minions: [],
    cursor: 0,
    firstEvent: null,
    time: 0,
    shake: 0,
    enrageUntil: 0,
    enemyFlash: 0,
    playerFlash: 0,
    intro: 0,
  }
}

const MINIONS: Minion[] = [
  { x: 0.6, y: 0.8, scale: 0.85, life: 0, max: 0, beast: true },
  { x: 0.9, y: 0.86, scale: 0.72, life: 0, max: 0, beast: false },
  { x: 0.72, y: 0.9, scale: 0.62, life: 0, max: 0, beast: true },
]

export function BattleCanvas({
  events,
  state,
  enemy,
  player,
  width,
  height,
  quality = 'high',
  finished = false,
  onTap,
  className,
}: BattleCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const propsRef = useRef({ events, state, enemy, player, quality, finished })
  propsRef.current = { events, state, enemy, player, quality, finished }

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scene = makeScene()
    const off = document.createElement('canvas')
    const offCtx = off.getContext('2d')
    let bgDirty = true

    const assets: CanvasAssets = {
      bg: loadImage(BG_PHOTO, () => {
        bgDirty = true
      }),
      player: null,
      enemy: null,
    }

    let cssW = Math.max(1, width)
    let cssH = Math.max(1, height)
    let dpr = 1
    let geo = computeGeo(cssW, cssH, propsRef.current.enemy.isBoss)
    let raf = 0
    let last = performance.now()
    let ready = false

    const resize = () => {
      const rect = host.getBoundingClientRect()
      const nextW = Math.max(1, rect.width || width)
      const nextH = Math.max(1, rect.height || height)
      dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
      if (nextW === cssW && nextH === cssH && canvas.width === Math.round(cssW * dpr)) {
        if (!ready) ready = true
        return
      }
      cssW = nextW
      cssH = nextH
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      geo = computeGeo(cssW, cssH, propsRef.current.enemy.isBoss)
      // DPR 变换只设一次，之后所有绘制都用 CSS 像素坐标
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      off.width = canvas.width
      off.height = canvas.height
      bgDirty = true
      ready = true
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    // Boss 出场：水墨扩散 + 短暂压暗
    if (propsRef.current.enemy.isBoss) {
      spawnInkDissolve(
        scene.particles,
        geo.enemyX,
        geo.enemyFeet - geo.enemyH * 0.5,
        18,
        geo.enemyH * 0.35,
      )
      spawnScreenFx(scene.screens, 'ink', 0.42, 0.9, '#0b100e')
      scene.shake = 5
    }

    // 立绘加载：src 变化才重新加载；失败时 dataset.failed 标记 → 程序化剪影兜底，绝不出现破图
    let playerSrc = ''
    let enemySrc = ''
    const syncSprites = () => {
      const { player: p, enemy: e } = propsRef.current
      if ((p.image ?? '') !== playerSrc) {
        playerSrc = p.image ?? ''
        assets.player = p.image ? loadImage(p.image, () => undefined) : null
      }
      if ((e.image ?? '') !== enemySrc) {
        enemySrc = e.image ?? ''
        assets.enemy = e.image ? loadImage(e.image, () => undefined) : null
      }
    }
    syncSprites()

    /* ------------------------------ 背景合成 ------------------------------ */

    const buildBackdrop = () => {
      if (!offCtx) return
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      offCtx.clearRect(0, 0, cssW, cssH)
      offCtx.fillStyle = INK.void
      offCtx.fillRect(0, 0, cssW, cssH)
      const bg = assets.bg
      if (spriteReady(bg)) {
        const scale = Math.max(cssW / bg.naturalWidth, cssH / bg.naturalHeight)
        const dw = bg.naturalWidth * scale
        const dh = bg.naturalHeight * scale
        offCtx.drawImage(bg, (cssW - dw) / 2, (cssH - dh) / 2, dw, dh)
        offCtx.globalAlpha = 0.5
        offCtx.fillStyle = 'rgba(7,9,8,1)'
        offCtx.fillRect(0, 0, cssW, cssH)
        offCtx.globalAlpha = 1
      }
      // 程序化水墨山影叠加（贴图缺失时它就是唯一背景）
      offCtx.globalAlpha = spriteReady(bg) ? 0.72 : 1
      drawInkMountain(offCtx, cssW, cssH, 20260913)
      offCtx.globalAlpha = 1
      const vign = offCtx.createLinearGradient(0, 0, 0, cssH)
      vign.addColorStop(0, 'rgba(7,9,8,0.55)')
      vign.addColorStop(0.32, 'rgba(7,9,8,0)')
      vign.addColorStop(0.72, 'rgba(7,9,8,0.12)')
      vign.addColorStop(1, 'rgba(7,9,8,0.86)')
      offCtx.fillStyle = vign
      offCtx.fillRect(0, 0, cssW, cssH)
      bgDirty = false
    }

    /* ------------------------------ 事件消费 ------------------------------ */

    const bodyOf = (side: 'player' | 'enemy' | 'all' | undefined): { x: number; y: number } => {
      if (side === 'player') return { x: geo.playerX, y: geo.playerFeet - geo.playerH * 0.55 }
      return { x: geo.enemyX, y: geo.enemyFeet - geo.enemyH * 0.5 }
    }

    const fxOf = (e: BattleEvent): string => {
      if (e.fx) return e.fx
      switch (e.damageType) {
        case 'fire':
          return 'fire'
        case 'water':
          return 'water'
        case 'wood':
          return 'wood'
        case 'earth':
          return 'earth'
        case 'soul':
          return 'soul'
        case 'metal':
          return 'sword'
        default:
          return 'slash'
      }
    }

    const emitCount = (base: number) => {
      const q = propsRef.current.quality
      const k = q === 'low' ? 0.5 : q === 'mid' ? 0.85 : 1
      return Math.max(1, Math.round(base * k))
    }

    const allowFlash = () => propsRef.current.quality !== 'low'
    const allowTrail = () => propsRef.current.quality === 'high'

    const spawnProjectileFx = (
      fx: string,
      from: 'player' | 'enemy' | 'pet',
      to: 'player' | 'enemy' | 'all' | undefined,
      scale = 1,
    ) => {
      const src = bodyOf(from === 'enemy' ? 'enemy' : 'player')
      const dst = bodyOf(to ?? (from === 'enemy' ? 'player' : 'enemy'))
      const kind =
        fx === 'sword'
          ? 'sword'
          : fx === 'fire'
            ? 'fire'
            : fx === 'water'
              ? 'water'
              : fx === 'wood'
                ? 'wood'
                : fx === 'earth'
                  ? 'earth'
                  : fx === 'soul'
                    ? 'soul'
                    : 'slash'
      spawnProjectile(scene.shots, kind, src.x, src.y, dst.x, dst.y, scale)
    }

    const handleEvent = (e: BattleEvent) => {
      const from = e.from
      const to = e.to
      const target = bodyOf(to ?? (from === 'enemy' ? 'player' : 'enemy'))
      const src = bodyOf(from === 'enemy' ? 'enemy' : 'player')
      const fx = fxOf(e)

      switch (e.type) {
        case 'cast': {
          spawnProjectileFx(fx, from, to)
          emit(scene.particles, 'ring', src.x, src.y + 8, {
            count: emitCount(4),
            life: [0.3, 0.5],
            size: [2, 4],
            color: INK.jade300,
            drag: 1.2,
          })
          if (fx === 'thunder') spawnBeam(scene.beams, 'thunder', src.x, src.y, target.x, target.y)
          if (e.label) spawnLabel(scene.dmg, src.x, src.y - 34, e.label)
          break
        }
        case 'hit':
        case 'crit': {
          const crit = e.type === 'crit' || e.crit === true
          const dmgType = e.damageType ?? null
          spawnDamageNumber(scene.dmg, target.x, target.y - 26, e.value ?? 0, crit, {
            tint: crit ? null : dmgType,
          })
          const sparkColor =
            crit ? INK.gold300 : fx === 'fire' ? '#ffb066' : fx === 'soul' ? '#c39ae0' : INK.cream
          spawnHitSpark(scene.particles, target.x, target.y, sparkColor, emitCount(crit ? 18 : 10))
          switch (fx) {
            case 'sword':
              emit(scene.particles, 'spark', target.x, target.y, {
                count: emitCount(10),
                speed: [140, 380],
                life: [0.14, 0.3],
                size: [1.2, 2.6],
                color: '#cdf5ec',
                drag: 3.6,
              })
              break
            case 'thunder':
              if (allowFlash()) {
                spawnScreenFx(scene.screens, 'flash', 0.42, 0.16, INK.gold200)
                spawnScreenFx(scene.screens, 'dark', 0.5, 0.22, '#040608')
              }
              spawnBeam(scene.beams, 'thunder', src.x, src.y, target.x, target.y)
              scene.shake = Math.max(scene.shake, crit ? 7 : 4)
              break
            case 'fire':
              emit(scene.particles, 'ember', target.x, target.y, {
                count: emitCount(16),
                radius: 16,
                speed: [40, 190],
                life: [0.3, 0.7],
                size: [2, 5],
                color: '#ffb066',
                color2: INK.blood,
                gravity: -30,
                drag: 1.4,
              })
              emit(scene.particles, 'smoke', target.x, target.y, {
                count: emitCount(6),
                radius: 14,
                speed: [10, 50],
                life: [0.5, 0.9],
                size: [4, 10],
                shrink: 2.2,
                color: 'rgba(40,30,26,0.9)',
                glow: false,
              })
              spawnScorch(
                scene.particles,
                target.x,
                (to === 'player' ? geo.playerFeet : geo.enemyFeet) - 2,
                26 + rnd(0, 10),
              )
              scene.shake = Math.max(scene.shake, 5)
              break
            case 'water':
              emit(scene.particles, 'ice', target.x, target.y, {
                count: emitCount(12),
                radius: 12,
                speed: [40, 150],
                life: [0.3, 0.6],
                size: [2, 5],
                color: '#a9dcf5',
                drag: 2,
              })
              break
            case 'wood':
              spawnBeam(scene.beams, 'vine', src.x, src.y, target.x, target.y)
              emit(scene.particles, 'leaf', target.x, target.y, {
                count: emitCount(10),
                radius: 10,
                speed: [30, 130],
                life: [0.5, 0.95],
                size: [2.5, 5],
                color: '#9be08d',
                gravity: 90,
                drag: 1,
              })
              break
            case 'earth':
              emit(scene.particles, 'rock', target.x, target.y, {
                count: emitCount(11),
                radius: 12,
                speed: [60, 220],
                life: [0.4, 0.8],
                size: [2.5, 6],
                color: '#d8ab6a',
                color2: '#6b4a26',
                gravity: 320,
                drag: 0.6,
              })
              scene.shake = Math.max(scene.shake, 5)
              break
            case 'soul':
              spawnSoulMist(scene.particles, target.x, target.y, emitCount(14), 22)
              break
            case 'burst':
              emit(scene.particles, 'ring', target.x, target.y, {
                count: 1,
                speed: [0, 1],
                life: [0.45, 0.45],
                size: [4, 6],
                color: crit ? INK.gold300 : INK.cream,
                drag: 0,
              })
              break
            default:
              emit(scene.particles, 'slash', target.x, target.y, {
                count: 1,
                speed: [0, 1],
                life: [0.22, 0.22],
                size: [2.4, 3.4],
                color: INK.cream,
                drag: 0,
              })
          }
          if (crit && allowFlash()) spawnScreenFx(scene.screens, 'flash', 0.2, 0.12, INK.gold300)
          if (to === 'enemy' || to === undefined) scene.enemyFlash = 1
          else scene.playerFlash = 1
          break
        }
        case 'shield': {
          const s = to === 'player' ? scene.playerShield : scene.enemyShield
          const p = to === 'player' ? bodyOf('player') : bodyOf('enemy')
          s.active = true
          s.power = e.value ?? 1
          s.maxPower = Math.max(s.power, s.maxPower === 1 ? s.power : s.maxPower)
          s.pulse = 0.5
          s.life = 3
          emit(scene.particles, 'spark', p.x, p.y, {
            count: emitCount(12),
            radius: 26,
            speed: [20, 90],
            life: [0.3, 0.6],
            size: [1.5, 3],
            color: INK.gold300,
            drag: 1.6,
          })
          break
        }
        case 'heal': {
          const p = to === 'player' ? bodyOf('player') : bodyOf('enemy')
          spawnBeam(scene.beams, 'heal', p.x, p.y + 40, p.x, p.y - 20)
          spawnHealRise(scene.particles, p.x, geo.enemyFeet - 20, emitCount(14))
          spawnDamageNumber(scene.dmg, p.x, p.y - 18, e.value ?? 0, false, { kind: 'heal' })
          break
        }
        case 'enrage': {
          scene.enrageUntil = scene.time + 3.2
          scene.shake = Math.max(scene.shake, 8)
          if (allowFlash()) spawnScreenFx(scene.screens, 'enrage', 1, 3.2, INK.blood)
          spawnSoulMist(scene.particles, bodyOf('enemy').x, bodyOf('enemy').y, emitCount(20), 40)
          break
        }
        case 'summon': {
          let n = 0
          for (const m of MINIONS) {
            if (m.life > 0) continue
            m.max = 1.6
            m.life = m.max
            spawnInkDissolve(scene.particles, cssW * m.x, cssH * m.y, emitCount(10), 22)
            if (++n >= 3) break
          }
          break
        }
        case 'phase': {
          if (allowFlash()) spawnScreenFx(scene.screens, 'ink', 0.85, 1.1, '#0b100e')
          scene.shake = Math.max(scene.shake, 9)
          break
        }
        case 'kill': {
          const p = bodyOf('enemy')
          spawnInkDissolve(scene.particles, p.x, p.y, emitCount(28), 46)
          emit(scene.particles, 'ring', p.x, p.y, {
            count: 1,
            speed: [0, 1],
            life: [0.5, 0.5],
            size: [5, 7],
            color: INK.creamDim,
            drag: 0,
          })
          scene.enemyFlash = 1
          scene.shake = Math.max(scene.shake, 6)
          break
        }
        case 'death': {
          const p = bodyOf('player')
          spawnInkDissolve(scene.particles, p.x, p.y, emitCount(26), 42, '#3a1a1a')
          if (allowFlash()) spawnScreenFx(scene.screens, 'dark', 0.62, 1.2, '#040608')
          break
        }
        case 'drop': {
          const q = resolveQuality(e)
          const hold = q === 'red' || q === 'rainbow' ? 0.7 : q === 'orange' ? 0.4 : 0
          const pillar = spawnLightPillar(
            scene.pillars,
            cssW * (0.34 + rnd(0, 0.32)),
            geo.groundY + 6,
            0,
            QUALITY[q].ring,
            hold,
            e.label ?? '',
          )
          pillar.topY = -20
          if (hold > 0 && allowFlash()) spawnScreenFx(scene.screens, 'flash', 0.26, 0.2, QUALITY[q].ring)
          emit(scene.particles, 'ember', pillar.x, geo.groundY, {
            count: emitCount(14),
            speed: [30, 130],
            angle: -Math.PI / 2,
            spread: 0.5,
            life: [0.5, 1],
            size: [1.6, 3.4],
            color: QUALITY[q].text,
            gravity: -20,
            drag: 0.9,
          })
          break
        }
        case 'victory': {
          if (allowFlash()) {
            spawnScreenFx(scene.screens, 'ripple', 1, 1.6, INK.gold300)
            spawnScreenFx(scene.screens, 'flash', 0.3, 0.5, INK.gold200)
          }
          emit(scene.particles, 'ember', cssW / 2, cssH * 0.5, {
            count: emitCount(30),
            radius: Math.min(cssW, cssH) * 0.35,
            speed: [20, 90],
            life: [0.8, 1.6],
            size: [2, 5],
            color: INK.gold300,
            gravity: -22,
            drag: 0.5,
          })
          break
        }
      }
    }

    /* ------------------------------ 主循环 ------------------------------ */

    let idleFrames = 0

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now
      const p = propsRef.current
      scene.time += dt
      if (scene.intro < 1) scene.intro = Math.min(1, scene.intro + dt * 1.6)
      // 换关时 Boss 与普通怪站位不同，需要同步重算布局
      if (geo.isBoss !== p.enemy.isBoss) {
        geo = computeGeo(cssW, cssH, p.enemy.isBoss)
        bgDirty = true
      }

      // 事件消费
      const evs = p.events
      if (evs.length > 0 && evs[0] !== scene.firstEvent) {
        scene.firstEvent = evs[0]
        scene.cursor = 0
      }
      if (scene.cursor > evs.length) scene.cursor = evs.length
      while (scene.cursor < evs.length) {
        handleEvent(evs[scene.cursor])
        scene.cursor++
      }
      syncSprites()

      // 更新
      scene.dmg.sweep((d) => updateDamageNumber(d, dt))
      scene.particles.sweep((q) => updateParticle(q, dt))
      scene.beams.sweep((b) => updateBeam(b, dt))
      scene.pillars.sweep((l) => updateLightPillar(l, dt))
      scene.screens.sweep((f) => updateScreenFx(f, dt))
      scene.shots.sweep((s) => updateProjectile(s, dt, allowTrail()))
      scene.shake = Math.max(0, scene.shake - dt * 26)
      scene.enemyFlash = Math.max(0, scene.enemyFlash - dt * 3.4)
      scene.playerFlash = Math.max(0, scene.playerFlash - dt * 3.4)
      for (const m of scene.minions) if (m.life > 0) m.life -= dt

      const st = p.state
      const shP = scene.playerShield
      if (st) {
        shP.power = st.playerShield
        shP.maxPower = Math.max(st.playerMaxHp * 0.5, st.playerShield, 1)
        shP.active = st.playerShield > 0
        const shE = scene.enemyShield
        shE.power = st.enemyShield
        shE.maxPower = Math.max(st.enemyMaxHp * 0.5, st.enemyShield, 1)
        shE.active = st.enemyShield > 0
      }
      updateShieldFx(shP, dt)
      updateShieldFx(scene.enemyShield, dt)
      const pos = bodyOf('player')
      shP.x = pos.x
      shP.y = pos.y
      shP.rx = geo.playerH * 0.42
      shP.ry = geo.playerH * 0.56
      const epos = bodyOf('enemy')
      const shE = scene.enemyShield
      shE.x = epos.x
      shE.y = epos.y
      shE.rx = geo.enemyH * 0.34
      shE.ry = geo.enemyH * 0.46

      // 空闲判定：结束后且无活动特效 → 不再重绘（保持静止首帧）
      const busy =
        !p.finished ||
        bgDirty ||
        scene.dmg.active.length > 0 ||
        scene.particles.active.length > 0 ||
        scene.beams.active.length > 0 ||
        scene.shots.active.length > 0 ||
        scene.pillars.active.length > 0 ||
        scene.screens.active.length > 0 ||
        scene.shake > 0.2 ||
        scene.minions.some((m) => m.life > 0)
      if (!busy && idleFrames > 1) return
      idleFrames = busy ? 0 : idleFrames + 1

      if (bgDirty) buildBackdrop()
      drawScene({
        ctx,
        scene,
        geo,
        assets,
        dpr,
        off,
        cssW,
        cssH,
        trail: allowTrail(),
      })
    }

    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      // 池全部清空，避免组件卸载后对象残留
      scene.dmg.clear()
      scene.particles.clear()
      scene.shots.clear()
      scene.beams.clear()
      scene.pillars.clear()
      scene.screens.clear()
      scene.minions.length = 0
    }
  }, [width, height])

  return (
    <div
      ref={hostRef}
      onClick={onTap}
      className={cn('absolute inset-0 overflow-hidden', className)}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  )
}

export default BattleCanvas

/* ------------------------------------------------------------------ */
/* 绘制                                                                */
/* ------------------------------------------------------------------ */

interface DrawCtx {
  ctx: CanvasRenderingContext2D
  scene: Scene
  geo: Geo
  assets: CanvasAssets
  dpr: number
  off: HTMLCanvasElement
  cssW: number
  cssH: number
  trail: boolean
}

const PLAYER_PALETTE: SilhouettePalette = {
  robe: '#1b2622',
  trim: '#d0a94f',
  glow: 'rgba(138,217,200,0.55)',
}
const ENEMY_PALETTE: SilhouettePalette = {
  robe: '#141b19',
  trim: '#7d2418',
  glow: 'rgba(210,75,58,0.5)',
}
const MINION_PALETTE: SilhouettePalette = {
  robe: '#111716',
  trim: '#3a1a1a',
  glow: 'rgba(210,75,58,0.55)',
}

function drawScene(d: DrawCtx): void {
  const { ctx, scene, geo, assets, dpr, off, cssW, cssH } = d
  const time = scene.time
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, cssW, cssH)
  ctx.drawImage(off, 0, 0, cssW, cssH)

  ctx.save()
  if (scene.shake > 0.2) {
    ctx.translate(rnd(-scene.shake, scene.shake), rnd(-scene.shake, scene.shake) * 0.6)
  }

  // 地面灼烧垫在角色之下
  scene.particles.forEach((p) => {
    if (p.kind === 'scorch') drawParticle(ctx, p)
  })

  for (const m of scene.minions) {
    if (m.life <= 0) continue
    ctx.globalAlpha = Math.min(1, m.life * 2)
    drawSilhouette(
      ctx,
      cssW * m.x,
      cssH * m.y,
      m.scale,
      MINION_PALETTE,
      m.beast ? 'beast' : 'human',
    )
  }
  ctx.globalAlpha = 1

  // 敌人：Boss 体量更大、带暗红灵气光环
  const eBob = Math.sin(time * 1.4) * 3
  const eH = geo.enemyH * (0.82 + 0.18 * easeOut(scene.intro))
  const eFeet = geo.enemyFeet + eBob
  if (geo.isBoss) {
    const alpha = (time < scene.enrageUntil ? 0.36 : 0.2) + 0.07 * Math.sin(time * 3)
    const cy = eFeet - eH * 0.5
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = alpha
    ctx.fillStyle = INK.blood
    ctx.beginPath()
    ctx.ellipse(geo.enemyX, cy, eH * 0.5, eH * 0.62, 0, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = alpha * 0.8
    ctx.strokeStyle = INK.blood
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(geo.enemyX, cy, eH * 0.58, eH * 0.7, 0, 0, TAU)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }
  drawEntitySprite(
    ctx,
    assets.enemy,
    geo.enemyX,
    eFeet,
    eH,
    geo.isBoss ? 'beast' : 'human',
    ENEMY_PALETTE,
    scene.enemyFlash,
  )
  drawShieldFx(ctx, scene.enemyShield, time)

  // 玩家：呼吸浮动
  const pBob = Math.sin(time * 1.8) * 3
  drawEntitySprite(
    ctx,
    assets.player,
    geo.playerX,
    geo.playerFeet + pBob,
    geo.playerH,
    'human',
    PLAYER_PALETTE,
    scene.playerFlash,
  )
  drawShieldFx(ctx, scene.playerShield, time)

  scene.shots.forEach((s) => drawProjectile(ctx, s, d.trail))
  scene.beams.forEach((b) => drawBeam(ctx, b))

  scene.particles.forEach((p) => {
    if (p.kind !== 'scorch') drawParticle(ctx, p)
  })

  scene.pillars.forEach((l) => drawLightPillar(ctx, l, time))
  ctx.restore()

  // 伤害数字不随镜头抖动，保证可读性
  scene.dmg.forEach((n) => drawDamageNumber(ctx, n))
  // 全屏特效始终最上层
  scene.screens.forEach((f) => drawScreenFx(ctx, f, cssW, cssH))
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}
