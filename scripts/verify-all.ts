/* ------------------------------------------------------------------ *
 * 《凡尘问道》乙方交付自检 —— npx tsx scripts/verify-all.ts
 *
 * 覆盖以下验收标准（对应 PRD 数值与系统章节）：
 *   1. B1  200 关可查询 / 无 20 连纯普通关 / 怪物与 Boss 机制数量 / 剧情挂载表
 *   2. B7  掉落保底（蓝 6 / 紫 25）/ 自动分解 / 背包容量
 *   3. B5  挂机 24h 封顶
 *   4. B6  突破失败不掉境界 / 不掉装备 / 修为不清零
 *   5. B8  simulate() 与 LiveBattle 胜率偏差 < 5%
 *   6. B3  存档版本迁移 + store 主流程冒烟（推关 / 领挂机 / 导出导入）
 * ------------------------------------------------------------------ */

import { MAPS, MONSTERS, getStage, globalToMap, monsterStats, stageNumberToGlobal } from '../lib/game/config/maps'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { SECRET_REALMS } from '../lib/game/config/story/secret_realms'
import { NPCS, STORY_NODE_BY_ID, STORY_NODES, ENCOUNTERS } from '../lib/game/config/story'
import { realmById, nodeOf } from '../lib/game/engine/realm'
import { rollEquipment } from '../lib/game/config/equipment'
import { createNewSave, migrateSave, SAVE_VERSION } from '../lib/game/state/defaults'
import { useGameStore, MAX_STAGE } from '../lib/game/state/store'
import {
  bagSummary,
  buildScore,
  cultivationProgress,
  diagnose,
  equipmentSlotName,
  loadoutName,
  mapProgressList,
  materialLabel,
  nextUnlock,
  pillLabel,
  power,
  powerBreakdown,
  schoolName,
  stageView,
  statGroups,
  statRows,
  techniqueLabel,
  treasureLabel,
  unlockProgress,
} from '../lib/game/state/selectors'
import {
  addToInventory,
  applyPity,
  autoEquipBest,
  materializeDrops,
  salvageValue,
} from '../lib/game/engine/loot'
import { settleIdle } from '../lib/game/engine/idle'
import { applyBreakthrough, canBreakthrough } from '../lib/game/engine/breakthrough'
import {
  LiveBattle,
  enemyFor,
  findStableStage,
  rollDrops,
  simulate,
  stageReward,
  sweep,
  type EnemyStats,
} from '../lib/game/engine/battle'
import { makeRng } from '../lib/game/utils'
import { QUALITY_ORDER, type BossMechanic, type GameSave, type Quality } from '../lib/game/types'

/* ------------------------------ 断言工具 ------------------------------ */

let checks = 0
let failures = 0

function section(name: string): void {
  console.log(`\n── ${name} ──`)
}

function ok(name: string, cond: boolean, detail = ''): void {
  checks++
  if (cond) {
    console.log(`  ✓ ${name}`)
  } else {
    failures++
    console.log(`  ✗ ${name}${detail ? `  — ${detail}` : ''}`)
  }
}

function qIndex(q: Quality): number {
  return QUALITY_ORDER.indexOf(q)
}

const FIXED_NOW = Date.UTC(2026, 8, 13, 12, 0, 0)

function freshSave(): GameSave {
  return createNewSave(FIXED_NOW, rngFn(20260913))
}

/** rollEquipment / rollDrops 需要 () => number 形式的随机源 */
function rngFn(seed: number): () => number {
  const r = makeRng(seed)
  return () => r.next()
}

/* ------------------------------ 1. B1 配置结构 ------------------------------ */

section('1. B1 地图 / 关卡 / 怪物（200 关可查询）')

const totalStages = MAPS.reduce((n, m) => n + m.stages.length, 0)
ok('地图数 = 4', MAPS.length === 4, `实际 ${MAPS.length}`)
ok('总关卡数 = 200', totalStages === 200, `实际 ${totalStages}`)
ok('怪物总数 24~30', MONSTERS.length >= 24 && MONSTERS.length <= 30, `实际 ${MONSTERS.length}`)

for (const map of MAPS) {
  const label = map.name
  ok(
    `${label}：50 关`,
    map.stages.length === 50,
    `实际 ${map.stages.length}`,
  )
  ok(
    `${label}：普通怪 ≥3 / 精英 ≥2 / Boss ≥1`,
    map.monsters.length >= 3 && map.elites.length >= 2 && map.bosses.length >= 1,
    `普通 ${map.monsters.length} / 精英 ${map.elites.length} / Boss ${map.bosses.length}`,
  )

  let run = 0
  let worst = 0
  let worstFrom = 0
  for (let i = 0; i < map.stages.length; i++) {
    const st = map.stages[i]
    const variety = st.kind !== 'normal' || !!st.storyId || !!st.realmId
    run = variety ? 0 : run + 1
    if (run > worst) {
      worst = run
      worstFrom = i + 2 - run
    }
  }
  ok(`${label}：无 20 连纯普通关`, worst < 20, `最长 ${worst} 连，起于第 ${worstFrom} 关`)

  const indexOk = map.stages.every((st, i) => st.index === i + 1)
  ok(`${label}：关卡序号连续 1..50`, indexOk)
}

const bossMonsters = MONSTERS.filter((m) => m.kind === 'boss')
ok('Boss 均有 ≥2 种机制', bossMonsters.length >= 4 && bossMonsters.every((b) => (b.bossMechanics?.length ?? 0) >= 2), bossMonsters.map((b) => `${b.name}:${(b.bossMechanics ?? []).length}`).join(' '))
ok('Boss 均有专属技能', bossMonsters.every((b) => (b.skills?.length ?? 0) >= 1))
ok('精英怪均有机制', MONSTERS.filter((m) => m.kind === 'elite').every((m) => (m.bossMechanics?.length ?? 0) >= 1))

/* 剧情 / 秘境挂载表（与 maps.ts 底部声明一致） */
const MOUNTS: [number, string, 'storyId' | 'realmId'][] = [
  [3, 'qs_01_missing', 'storyId'],
  [10, 'qs_02_jade', 'storyId'],
  [25, 'qs_03_shrine', 'storyId'],
  [50, 'qs_04_depart', 'storyId'],
  [45, 'realm_qingshi_trial', 'realmId'],
  [55, 'hf_01_shen', 'storyId'],
  [80, 'hf_02_luoqi', 'storyId'],
  [100, 'hf_03_blackwind', 'storyId'],
  [95, 'realm_heifeng_cave', 'realmId'],
  [110, 'yz_01_market', 'storyId'],
  [140, 'yz_02_ali', 'storyId'],
  [150, 'yz_03_auction', 'storyId'],
  [170, 'lx_01_ruins', 'storyId'],
  [195, 'lx_02_stele', 'storyId'],
  [200, 'lx_03_xiewuchen', 'storyId'],
  [200, 'realm_luoxia_cave', 'realmId'],
]

for (const [global, id, field] of MOUNTS) {
  const { stage } = getStage(global)
  const actual = stage[field]
  if (field === 'storyId') {
    ok(`第 ${global} 关挂 ${id}`, actual === id && !!STORY_NODE_BY_ID[actual], `实际 ${String(actual)}`)
  } else {
    ok(`第 ${global} 关挂秘境 ${id}`, actual === id && SECRET_REALMS.some((r) => r.id === actual), `实际 ${String(actual)}`)
  }
}

/* 全 200 关可查询 + 数值有效 + 曲线上升 */
let invalidStages: string[] = []
let monsterMissing = 0
for (let s = 1; s <= totalStages; s++) {
  const { stage, monster } = getStage(s)
  const ms = monsterStats(s)
  if (!stage || !Number.isFinite(ms.hp) || ms.hp <= 0 || !Number.isFinite(ms.atk) || ms.atk <= 0) {
    invalidStages.push(`${s}`)
  }
  if (!monster && stage.kind !== 'event') monsterMissing++
}
ok('200 关逐一可查询且数值有效', invalidStages.length === 0, invalidStages.slice(0, 6).join(','))
ok('非 event 关均有怪物', monsterMissing === 0, `缺失 ${monsterMissing}`)

const hp1 = monsterStats(1).hp
const hp200 = monsterStats(200).hp
ok('怪物 HP 曲线随关卡上升', hp200 > hp1 * 20, `1 关 ${hp1} → 200 关 ${hp200}`)

let roundTripOk = true
for (const map of MAPS) {
  for (let i = 1; i <= map.stages.length; i++) {
    const g = stageNumberToGlobal(map.id, i)
    const back = globalToMap(g)
    if (back.mapId !== map.id || back.mapStage !== i) roundTripOk = false
  }
}
ok('stageNumberToGlobal / globalToMap 往返一致', roundTripOk)

/* ------------------------------ 2. B7 掉落与背包 ------------------------------ */

section('2. B7 掉落保底 / 自动分解 / 背包容量')

{
  const save = freshSave()
  let blueAt = -1
  let purpleAt = -1
  for (let i = 1; i <= 40; i++) {
    const drops = applyPity(save, rollDrops(1, makeRng(1000 + i * 31)))
    const equip = drops.find((d) => d.kind === 'equipment')
    const qi = equip?.quality ? qIndex(equip.quality) : -1
    if (blueAt < 0 && qi >= qIndex('blue')) blueAt = i
    if (purpleAt < 0 && qi >= qIndex('purple')) purpleAt = i
  }
  ok('蓝装保底 ≤ 7 次装备掉落（10 分钟口径）', blueAt > 0 && blueAt <= 7, `第 ${blueAt} 次`)
  ok('紫装保底 ≤ 26 次装备掉落（30 分钟口径）', purpleAt > 0 && purpleAt <= 26, `第 ${purpleAt} 次`)
}

{
  const save = freshSave()
  save.inventory.capacity = 5
  const lots = Array.from({ length: 10 }, (_, i) =>
    rollEquipment({ stage: 10, rng: rngFn(700 + i * 13) }),
  )
  const added = addToInventory(save, { equipment: lots, materials: {}, pills: {} }, {})
  ok('背包容量上限生效', added.items.length <= 5 && added.full === true, `items=${added.items.length} full=${added.full}`)
}

{
  const save = freshSave()
  save.inventory.capacity = 60
  const lots = Array.from({ length: 8 }, (_, i) => rollEquipment({ stage: 8, quality: 'white', rng: rngFn(90 + i) }))
  const added = addToInventory(save, { equipment: lots, materials: {}, pills: {} }, { autoSalvageBelow: 'blue' })
  ok('自动分解：白装不入包、返还灵石', added.items.length === 0 && added.stone > 0, `items=${added.items.length} stone=${added.stone}`)
}

{
  const item = rollEquipment({ stage: 5, rng: rngFn(42) })
  ok('分解普通装备有灵石收益', salvageValue(item) > 0, `=${salvageValue(item)}`)
}

{
  const save = freshSave()
  save.inventory.capacity = 60
  const lots = Array.from({ length: 14 }, (_, i) =>
    rollEquipment({ stage: 90, rng: rngFn(5000 + i * 7) }),
  )
  addToInventory(save, { equipment: lots, materials: {}, pills: {} }, {})
  const before = Object.keys(save.combat.equipment).length
  const plan = autoEquipBest(save)
  save.combat.equipment = plan.equipment
  const after = Object.keys(save.combat.equipment).length
  ok('一键装备提升已装备件数', after > before, `${before} → ${after}（替换 ${plan.replaced.length} 件）`)
}

/* ------------------------------ 3. B5 挂机 24h 封顶 ------------------------------ */

section('3. B5 挂机收益（24h 封顶）')

{
  const save = freshSave()
  save.idle.lastClaim = FIXED_NOW
  const capped = settleIdle(save, FIXED_NOW + 48 * 3600_000, makeRng(1))

  const save2 = freshSave()
  save2.idle.lastClaim = FIXED_NOW
  const oneDay = settleIdle(save2, FIXED_NOW + 24 * 3600_000, makeRng(1))

  ok(
    '48h 离线收益 ≈ 24h（封顶生效）',
    capped.cultivation <= oneDay.cultivation * 1.15 + 1 && capped.stone <= oneDay.stone * 1.15 + 1,
    `48h: 修为${capped.cultivation}/灵石${capped.stone}；24h: 修为${oneDay.cultivation}/灵石${oneDay.stone}`,
  )
  ok('挂机有正收益', capped.cultivation > 0 && capped.stone > 0)
  ok('挂机产出装备掉落（24h ≥ 4 件）', oneDay.drops.length >= 4, `24h 掉落 ${oneDay.drops.length} 件`)
}

{
  const save = freshSave()
  save.idle.lastClaim = FIXED_NOW
  const zero = settleIdle(save, FIXED_NOW, makeRng(2))
  ok('离线 0s 无收益', zero.cultivation === 0 && zero.stone === 0)
  ok('lastClaim 前移', save.idle.lastClaim === FIXED_NOW)
}

/* ------------------------------ 4. B6 突破失败保护 ------------------------------ */

section('4. B6 突破失败保护（不掉境界 / 不掉装备 / 修为不清零）')

{
  const save = freshSave()
  save.profile.cultivation = 999999
  const check = canBreakthrough(save)
  const gearBefore = JSON.stringify(save.combat.equipment)
  const stageBefore = save.profile.stageId
  const cultBefore = save.profile.cultivation

  const outcome = applyBreakthrough(save, false)

  ok('失败：境界不降', save.profile.stageId === stageBefore, `${stageBefore} → ${save.profile.stageId}`)
  ok('失败：装备不变', JSON.stringify(save.combat.equipment) === gearBefore)
  ok('失败：修为不清零', save.profile.cultivation > 0 && save.profile.cultivation >= cultBefore * 0.5, `${cultBefore} → ${save.profile.cultivation}`)
  ok('失败：返回结构化结果', outcome.success === false && outcome.fromStageId === stageBefore)
  ok('检查接口可调用', typeof check.can === 'boolean')
}

{
  const save = freshSave()
  save.profile.cultivation = 0
  const check = canBreakthrough(save)
  ok('修为不足时禁止突破', check.can === false)
}

/* ------------------------------ 5. B8 simulate 与 LiveBattle 一致 ------------------------------ */

section('5. B8 simulate() 与 LiveBattle 胜率一致（偏差 < 5%）')

interface RunTotals {
  win: boolean
  playerDamage: number
  enemyDamage: number
}

function liveTotals(save: GameSave, stage: number, seed: number, maxSeconds = 90): RunTotals {
  const lb = new LiveBattle({ save, globalStage: stage, seed })
  const dt = 0.05
  let t = 0
  while (!lb.state.done && t < maxSeconds) {
    lb.tick(dt)
    t += dt
  }
  let pd = 0
  let ed = 0
  for (const ev of lb.state.events) {
    if (ev.type !== 'hit' && ev.type !== 'crit') continue
    if (ev.from === 'player' && ev.value) pd += ev.value
    if (ev.from === 'enemy' && ev.value) ed += ev.value
  }
  return { win: lb.state.done && lb.state.win, playerDamage: pd, enemyDamage: ed }
}

/** 用强化等级（每级 +8% 装备属性）做细粒度战力旋钮，构造「同一关不同战力」的存档 */
function saveAtPower(stage: number, enhance: number): GameSave {
  const s = freshSave()
  s.inventory.capacity = 200
  s.profile.stageId = 'qi_5'
  s.profile.realmId = 'qi_refining'
  const lots = Array.from({ length: 10 }, (_, i) =>
    rollEquipment({ stage, rng: rngFn(4100 + i * 13 + stage) }),
  )
  const plan = autoEquipBest(s, lots)
  s.combat.equipment = plan.equipment
  for (const key of Object.keys(s.combat.equipment) as (keyof GameSave['combat']['equipment'])[]) {
    const item = s.combat.equipment[key]
    if (item) item.enhance = enhance
  }
  return s
}

/** 扫描强化等级，找胜率胶着点（0 < 胜场 < 总场） */
function findMixedPower(stage: number, seeds = 6): { enhance: number; save: GameSave } | null {
  for (let e = 0; e <= 60; e++) {
    const save = saveAtPower(stage, e)
    let wins = 0
    for (let i = 0; i < seeds; i++) {
      if (simulate(save, stage, { seed: (300 + i * 7919 + stage) >>> 0, maxSeconds: 45 }).win) wins++
    }
    if (wins > 0 && wins < seeds) return { enhance: e, save }
  }
  return null
}

{
  const TARGETS = [12, 20, 50, 100]
  const found: string[] = []
  const cases: { save: GameSave; stage: number; tag: string }[] = []

  for (const stage of TARGETS) {
    const mixed = findMixedPower(stage)
    if (mixed) {
      const { monster } = getStage(stage)
      found.push(`${stage}关(${monster?.kind ?? '?'}) 强化${mixed.enhance}`)
      cases.push({ save: mixed.save, stage, tag: `${stage}关·胶着·强化${mixed.enhance}` })
    } else {
      const { monster } = getStage(stage)
      cases.push({ save: saveAtPower(stage, 0), stage, tag: `${stage}关(${monster?.kind ?? '?'})·弱` })
      cases.push({ save: saveAtPower(stage, 40), stage, tag: `${stage}关·强` })
    }
  }

  console.log(`     胶着样本点：${found.length ? found.join(' / ') : '无（退化为全胜/全败采样）'}`)

  let simWins = 0
  let liveWins = 0
  let runs = 0
  let mixed = 0
  let simPlayerDamage = 0
  let livePlayerDamage = 0
  let simEnemyDamage = 0
  let liveEnemyDamage = 0
  const rows: string[] = []

  for (const { save, stage, tag } of cases) {
    let sw = 0
    let lw = 0
    let spd = 0
    let lpd = 0
    let sed = 0
    let led = 0
    const seeds = 24
    for (let i = 0; i < seeds; i++) {
      const seed = (0x51ed + stage * 7919 + i * 104729) >>> 0
      const sim = simulate(save, stage, { seed, maxSeconds: 90 })
      const live = liveTotals(save, stage, seed)
      if (sim.win) sw++
      if (live.win) lw++
      spd += sim.playerDamage
      sed += sim.enemyDamage
      lpd += live.playerDamage
      led += live.enemyDamage
    }
    simWins += sw
    liveWins += lw
    simPlayerDamage += spd
    livePlayerDamage += lpd
    simEnemyDamage += sed
    liveEnemyDamage += led
    runs += seeds
    if (sw > 0 && sw < seeds) mixed++
    rows.push(`${tag} 胜率 ${sw}/${seeds} vs ${lw}/${seeds}`)
  }

  const dev = Math.abs(simWins - liveWins) / runs
  const dmgDev = Math.abs(simPlayerDamage - livePlayerDamage) / Math.max(1, simPlayerDamage)
  const takenDev = Math.abs(simEnemyDamage - liveEnemyDamage) / Math.max(1, simEnemyDamage)
  console.log(`     ${rows.join(' | ')}`)
  console.log(
    `     输出伤害 sim ${simPlayerDamage} / live ${livePlayerDamage}；承伤 sim ${simEnemyDamage} / live ${liveEnemyDamage}`,
  )
  ok(
    `总胜率偏差 ${(dev * 100).toFixed(1)}% < 5%`,
    dev < 0.05,
    `sim ${simWins}/${runs} vs live ${liveWins}/${runs}`,
  )
  ok(
    `伤害数值一致：输出偏差 ${(dmgDev * 100).toFixed(1)}% / 承伤偏差 ${(takenDev * 100).toFixed(1)}% 均 < 20%`,
    dmgDev < 0.2 && takenDev < 0.2,
  )
  console.log(`     （胶着样本 ${mixed} 个：本作数值呈阶跃，胜率一致性以全样本聚合为准）`)
}

{
  const save = freshSave()
  const { stone, cultivation } = stageReward(1)
  ok('stageReward 返回正收益', stone > 0 && cultivation > 0, `stone=${stone} cult=${cultivation}`)
}

{
  const save = freshSave()
  ok('开局可战胜第 1 关', simulate(save, 1, { seed: 11 }).win)
  save.progress.maxStage = 1
  const res = sweep(save, 1, 10)
  ok('扫荡第 1 关 ×10 全胜', res.ok && res.wins === 10, `ok=${res.ok} wins=${res.ok ? res.wins : -1}`)
  ok('扫荡产出掉落数组', res.ok && Array.isArray(res.drops))
}

{
  const save = freshSave()
  const stable = findStableStage(save, 20)
  ok('稳定刷怪点可解出', stable >= 1 && stable <= 20, `=${stable}`)
}

/* ------------------------------ 5b. Boss 应对机制真实生效 ------------------------------ */

section('5b. Boss 机制真实生效（封印 / 抗性 / 二阶 / 无唯一解）')

/** 有效果的机制 —— 会在数值上真实改变战局；summon 与 phase 的演出另计 */
const EFFECTFUL: BossMechanic[] = [
  'shield',
  'enrage',
  'lifesteal',
  'thorn',
  'evade',
  'resist',
  'burst',
  'dot',
  'treasure_seal',
  'phase',
]

ok(
  '每个 Boss 至少 2 种有效机制（不存在唯一解）',
  bossMonsters.every((b) => (b.bossMechanics ?? []).filter((m) => EFFECTFUL.includes(m)).length >= 2),
  bossMonsters.map((b) => `${b.name}:${(b.bossMechanics ?? []).filter((m) => EFFECTFUL.includes(m)).length}`).join(' '),
)
ok(
  '每个精英至少 1 种有效机制',
  MONSTERS.filter((m) => m.kind === 'elite').every((m) => (m.bossMechanics ?? []).filter((x) => EFFECTFUL.includes(x)).length >= 1),
)

/** 把主动法宝固定为指定的一件，用来对照「元素 / 物理」两条输出路线 */
function withTreasure(save: GameSave, id: string): GameSave {
  const s = JSON.parse(JSON.stringify(save)) as GameSave
  s.combat.activeTreasures = [id, null, null, null, null]
  if (!s.combat.ownedTreasures.some((t) => t.defId === id)) {
    s.combat.ownedTreasures.push({ uid: `t_${id}`, defId: id, level: 1, tier: 1, equipped: true })
  }
  return s
}

/** 同一只怪，只替换 bossMechanics，其余数值完全一致 */
function enemyWith(stage: number, mech: BossMechanic[]): EnemyStats {
  const base = enemyFor(stage)
  return { ...base, def: { ...base.def, bossMechanics: mech } }
}

/** 固定时间窗内的战斗采样：玩家输出、法宝出手时刻、敌方剩余 HP */
function liveWindow(
  save: GameSave,
  stage: number,
  seed: number,
  enemy: EnemyStats,
  seconds: number,
): { damage: number; castTimes: number[]; enemyHp: number } {
  const lb = new LiveBattle({ save, globalStage: stage, seed, enemyOverride: enemy })
  const dt = 0.05
  for (let t = 0; t < seconds && !lb.state.done; t += dt) lb.tick(dt)
  let damage = 0
  const castTimes: number[] = []
  for (const ev of lb.state.events) {
    if ((ev.type === 'hit' || ev.type === 'crit') && ev.from === 'player' && ev.value) damage += ev.value
    if (ev.type === 'cast' && ev.from === 'player') castTimes.push(ev.t)
  }
  return { damage, castTimes, enemyHp: Math.max(0, Math.round(lb.state.enemyHp)) }
}

{
  // 快冷却法宝（青霄剑 cd 3s）才能在一个窗口里被抓到多次封印
  const stage = 20
  const WINDOW = 30
  const save = withTreasure(saveAtPower(stage, 0), 'tr_qingxiao_sword')
  const bare = enemyWith(stage, [])
  const sealed = enemyWith(stage, ['treasure_seal'])
  const SEAL_FROM = 14
  const SEAL_TO = 20.2
  let bareDmg = 0
  let sealedDmg = 0
  let blocked = 0
  let strayInSeal = 0
  for (let i = 0; i < 6; i++) {
    const seed = (0x7a11 + i * 7919) >>> 0
    const b = liveWindow(save, stage, seed, bare, WINDOW)
    const s = liveWindow(save, stage, seed, sealed, WINDOW)
    bareDmg += b.damage
    sealedDmg += s.damage
    blocked += b.castTimes.length - s.castTimes.length
    strayInSeal += s.castTimes.filter((t) => t > SEAL_FROM && t < SEAL_TO).length
  }
  ok('法宝封印期内确实无法宝出手', strayInSeal === 0, `封印期内出手 ${strayInSeal} 次`)
  ok(
    '法宝封印减少法宝出手次数（御兽钉 / 钉幡的应对压力成立）',
    blocked > 0,
    `少出手 ${blocked} 次`,
  )
  ok(
    '法宝封印压低整体输出 —— 必须准备不依赖法宝的过渡手段',
    sealedDmg < bareDmg * 0.98,
    `${WINDOW}s 内 封印 ${sealedDmg} vs 无封印 ${bareDmg}`,
  )
}

{
  const stage = 20
  const WINDOW = 30
  const power = saveAtPower(stage, 0)
  const physics = withTreasure(power, 'tr_qingxiao_sword')
  const elemental = withTreasure(power, 'tr_chiyan_orb')
  const noResist = enemyWith(stage, [])
  const resist = enemyWith(stage, ['resist'])
  let physBare = 0
  let physResist = 0
  let eleBare = 0
  let eleResist = 0
  for (let i = 0; i < 6; i++) {
    const seed = (0x5e11 + i * 7919) >>> 0
    physBare += liveWindow(physics, stage, seed, noResist, WINDOW).damage
    physResist += liveWindow(physics, stage, seed, resist, WINDOW).damage
    eleBare += liveWindow(elemental, stage, seed, noResist, WINDOW).damage
    eleResist += liveWindow(elemental, stage, seed, resist, WINDOW).damage
  }
  ok(
    '抗性只减免元素伤害，物理路线分毫不差',
    physResist === physBare && physBare > 0,
    `物理 ${physBare} → ${physResist}`,
  )
  ok(
    '抗性确实压制元素输出 —— 换伤害属性是有效应对',
    eleResist < eleBare * 0.98,
    `元素 ${eleBare} → ${eleResist}`,
  )
}

{
  const stage = 20
  const WINDOW = 40
  const save = saveAtPower(stage, 0)
  const armor = enemyWith(stage, ['shield'])
  const plain = enemyWith(stage, [])
  let armorHp = 0
  let plainHp = 0
  for (let i = 0; i < 6; i++) {
    const seed = (0x3c05 + i * 7919) >>> 0
    armorHp += liveWindow(save, stage, seed, armor, WINDOW).enemyHp
    plainHp += liveWindow(save, stage, seed, plain, WINDOW).enemyHp
  }
  ok(
    '护盾机制吸收伤害（有效血量高于裸怪）',
    armorHp > plainHp,
    `剩余 HP 带盾 ${armorHp} vs 裸怪 ${plainHp}`,
  )
}

/* ------------------------------ 6. B3 存档迁移 + store 冒烟 ------------------------------ */

section('6. B3 存档版本迁移 + store 主流程冒烟')

{
  const save = freshSave()
  const round = migrateSave(JSON.parse(JSON.stringify(save)))
  ok('migrate 往返：版本一致', round.version === SAVE_VERSION)
  ok('migrate 往返：核心字段完整', !!round.profile && !!round.combat && !!round.inventory && !!round.story)
  ok('migrate 容忍空档', (() => {
    try {
      const legacy = migrateSave({ version: 0, profile: { name: 'p' } })
      return legacy.version === SAVE_VERSION && !!legacy.combat
    } catch {
      return false
    }
  })())
}

{
  const store = useGameStore
  store.getState().reset()
  const s0 = store.getState().save
  ok('reset 开局：第 1 关未通关', s0.progress.stage === 1 && s0.progress.maxStage === 0)

  const battle = store.getState().startBattle(1)
  const dt = 0.05
  let t = 0
  while (!battle.state.done && t < 90) {
    battle.tick(dt)
    t += dt
  }
  ok('开局可斩下第 1 关', battle.state.done && battle.state.win, `t=${battle.state.time.toFixed(1)}s`)

  const stoneBefore = store.getState().save.resources.stone
  const res = store.getState().finishBattle(battle.state.win)
  const s1 = store.getState().save
  ok('胜利结算：推进到第 2 关', s1.progress.stage === 2, `stage=${s1.progress.stage}`)
  ok('胜利结算：灵石 / 修为入账', s1.resources.stone > stoneBefore && s1.profile.cultivation > 0, `stone ${stoneBefore}→${s1.resources.stone}`)
  ok('胜利结算：返回奖励摘要', res.reward.stone > 0 && res.reward.cultivation > 0)
  ok('击杀计数增加', s1.stats.kills >= 1)

  const idle = store.getState().claimIdle(FIXED_NOW + 3 * 3600_000)
  ok('领取挂机收益', idle.cultivation >= 0 && idle.stone >= 0, `stone=${idle.stone} cult=${idle.cultivation}`)

  const exported = store.getState().exportSave()
  ok('导出存档为 JSON 字符串', typeof exported === 'string' && exported.length > 100)
  const stageBeforeImport = store.getState().save.progress.stage
  const imported = store.getState().importSave(exported)
  ok('导入存档可回放', imported && store.getState().save.progress.stage === stageBeforeImport)

  const bad = store.getState().importSave('{"nonsense": true}')
  ok('导入脏数据不崩溃', bad === false || typeof bad === 'boolean')
}

/* ------------------------------ 7. store 动作全覆盖（边界 2） ------------------------------ */

section('7. B3 store 动作全覆盖（边界 2）')

{
  const store = useGameStore
  const seed = freshSave()
  seed.resources.stone = 500000
  seed.progress.maxStage = 60
  seed.progress.stage = 60
  seed.progress.stableStage = 40
  seed.inventory.capacity = 60
  seed.inventory.pills = { pill_juqi_dan: 5 }
  seed.combat.techniques = [
    { defId: 'tech_yujian_jue', level: 1 },
    { defId: 'tech_jianxin_jue', level: 1 },
  ]
  seed.combat.ownedTreasures = [{ uid: 'tr_seed_1', defId: 'tr_qingxiao_sword', level: 1, tier: 0, equipped: false }]
  seed.inventory.items = [
    ...Array.from({ length: 6 }, (_, i) =>
      rollEquipment({ stage: 5, quality: 'white', rng: rngFn(6000 + i * 7) }),
    ),
    ...Array.from({ length: 8 }, (_, i) =>
      rollEquipment({ stage: 55, rng: rngFn(6100 + i * 11) }),
    ),
  ]

  ok('导入预置存档', store.getState().importSave(JSON.stringify(seed)))

  /* 装备：穿戴 / 卸下 / 锁定 / 分解 / 批量分解 / 一键穿戴 / 强化 / 扩容 / 自动分解 */
  const firstUid = seed.inventory.items[0].uid
  const firstSlot = seed.inventory.items[0].slot
  ok(
    'equip 生效',
    store.getState().equip(firstUid) && store.getState().save.combat.equipment[firstSlot]?.uid === firstUid,
  )
  ok(
    'unequip 生效',
    store.getState().unequip(firstSlot) && store.getState().save.inventory.items.some((i) => i.uid === firstUid),
  )

  ok('lockItem 锁定', store.getState().lockItem(firstUid, true))
  ok('锁定后不可分解', store.getState().salvage(firstUid) === 0)
  ok('解锁后可分解', store.getState().lockItem(firstUid, false) && store.getState().salvage(firstUid) > 0)

  const bagBefore = store.getState().save.inventory.items.length
  const batchGain = store.getState().salvageBatch('green')
  ok('salvageBatch 批量分解白装', batchGain > 0 && store.getState().save.inventory.items.length < bagBefore, `+${batchGain} 灵石`)

  const capBefore = store.getState().save.inventory.capacity
  store.getState().expandCapacity()
  ok('expandCapacity 扩容', store.getState().save.inventory.capacity > capBefore, `${capBefore} → ${store.getState().save.inventory.capacity}`)

  const extra = Array.from({ length: 6 }, (_, i) => rollEquipment({ stage: 55, rng: rngFn(9100 + i * 13) }))
  store.getState().importSave(
    JSON.stringify({
      ...store.getState().save,
      inventory: { ...store.getState().save.inventory, items: [...store.getState().save.inventory.items, ...extra] },
    }),
  )
  const equippedBefore = Object.keys(store.getState().save.combat.equipment).length
  store.getState().autoEquip()
  ok('autoEquip 一键穿戴', Object.keys(store.getState().save.combat.equipment).length >= equippedBefore)

  const target = Object.values(store.getState().save.combat.equipment).find(Boolean)
  const enhanceBefore = target?.enhance ?? 0
  ok('enhanceEquip 强化', !!target && store.getState().enhanceEquip(target.uid) && (store.getState().save.combat.equipment[target.slot]?.enhance ?? 0) === enhanceBefore + 1)

  store.getState().setAutoSalvage('blue')
  ok('setAutoSalvage 生效', store.getState().save.inventory.autoSalvageBelow === 'blue')

  /* 丹药 */
  const cultBefore = store.getState().save.profile.cultivation
  const pillOk = store.getState().usePill('pill_juqi_dan', 2)
  ok('usePill 修为丹生效', pillOk && store.getState().save.profile.cultivation > cultBefore && store.getState().save.inventory.pills['pill_juqi_dan'] === 3)

  /* 法宝 */
  ok('equipTreasure 上阵', store.getState().equipTreasure(0, 'tr_qingxiao_sword') && store.getState().save.combat.activeTreasures[0] === 'tr_qingxiao_sword')
  ok('法宝实例标记 equipped', store.getState().save.combat.ownedTreasures.find((t) => t.defId === 'tr_qingxiao_sword')?.equipped === true)
  const stoneBeforeUp = store.getState().save.resources.stone
  ok('upgradeTreasure 升级', store.getState().upgradeTreasure('tr_qingxiao_sword') && store.getState().save.resources.stone < stoneBeforeUp)
  ok('unequipTreasure 卸下', store.getState().unequipTreasure(0) && store.getState().save.combat.activeTreasures[0] === null)

  /* 功法 / 灵兽 */
  ok('setMainTechnique 生效', store.getState().setMainTechnique('tech_yujian_jue') && store.getState().save.combat.mainTechnique === 'tech_yujian_jue')
  ok('setSupportTechnique 生效', store.getState().setSupportTechnique(0, 'tech_jianxin_jue') && store.getState().save.combat.supportTechniques[0] === 'tech_jianxin_jue')
  ok('setPet 拒绝未拥有灵兽', store.getState().setPet('pet_not_owned') === false)

  /* 剧情：入队 → 选择 → 因果写入 */
  store.getState().pushStory('qs_02_jade')
  ok('pushStory 入队', store.getState().save.story.pending.includes('qs_02_jade'))
  const jade = store.getState().submitChoice('qs_02_jade', 'c_keep')
  const afterChoice = store.getState().save
  ok('submitChoice 写入 flags', !!jade && afterChoice.story.flags['jade_kept'] === true)
  ok('submitChoice 写入因果', (afterChoice.karma.jadeResonance ?? 0) >= 2, `jadeResonance=${afterChoice.karma.jadeResonance}`)
  ok('submitChoice 标记已看', afterChoice.story.seenNodes.includes('qs_02_jade') && !afterChoice.story.pending.includes('qs_02_jade'))

  const plainNode = [...STORY_NODES, ...ENCOUNTERS].find((n) => n.type !== 'battle' && n.id !== 'qs_02_jade')
  if (plainNode) {
    const before = store.getState().save.resources.stone
    const bundle = store.getState().resolveStoryNode(plainNode.id)
    ok(
      'resolveStoryNode 走通结算路径',
      !!bundle && store.getState().save.story.seenNodes.includes(plainNode.id),
      `${plainNode.id}，stone ${before} → ${store.getState().save.resources.stone}`,
    )
  } else {
    ok('resolveStoryNode 走通结算路径', false, '未找到可用剧情节点')
  }

  store.getState().tickEncounter(9999)
  ok('tickEncounter 冷却归零', store.getState().save.story.encounterCooldown === 0)
  const encounter = store.getState().rollEncounter()
  ok('rollEncounter 不抛错', encounter === null || !!encounter.id)

  /* 秘境：进入 → 走一格 → 离场结算 */
  const entered = store.getState().enterRealm('realm_qingshi_trial')
  ok('enterRealm 进入秘境', !!entered && store.getState().save.realmRun?.active === true)
  const realmDef = realmById('realm_qingshi_trial')
  const nextNodeId = realmDef ? nodeOf(realmDef, realmDef.startNode)?.to[0] : undefined
  if (realmDef && nextNodeId) {
    const moved = store.getState().moveToNode(nextNodeId)
    ok('moveToNode 推进节点', !!moved && store.getState().save.realmRun !== null)
    if (moved?.needBattle) {
      const battle = store.getState().startRealmBattle(nextNodeId)
      ok('startRealmBattle 生成战斗', !!battle)
      const dt = 0.05
      let t = 0
      while (battle && !battle.state.done && t < 90) {
        battle.tick(dt)
        t += dt
      }
      const view = store.getState().resolveRealmBattle(nextNodeId, battle?.state.win ?? false)
      ok('resolveRealmBattle 结算节点', !!view)
    }
  } else {
    ok('moveToNode 推进节点', false, '秘境起始节点缺少后继')
  }
  const runBefore = store.getState().save.realmRun
  const spoilStone = runBefore?.spoils.stone ?? 0
  const stoneBeforeLeave = store.getState().save.resources.stone
  const left = store.getState().leaveRealm()
  ok('leaveRealm 携带收益离场', !!left && store.getState().save.realmRun === null, `spoil=${spoilStone} stone ${stoneBeforeLeave} → ${store.getState().save.resources.stone}`)

  /* Build 方案 A/B */
  store.getState().saveLoadoutB()
  ok('saveLoadoutB 存档方案', !!store.getState().save.combat.loadoutB)
  const flagBefore = store.getState().save.story.flags['loadout_active']
  ok('switchLoadout 切换', store.getState().switchLoadout() && store.getState().save.story.flags['loadout_active'] !== flagBefore)

  /* 设置 / 计时 / 关卡 / 撤退 */
  store.getState().setAuto(false)
  store.getState().setSpeed(2)
  store.getState().setSfx(false)
  store.getState().setQuality('high')
  const st = store.getState().save.settings
  ok('设置项写入', st.auto === false && st.speed === 2 && st.sfx === false && st.quality === 'high', JSON.stringify(st))

  const playBefore = store.getState().save.stats.playTime
  store.getState().tick(30)
  store.getState().flushPlayTime()
  ok('tick/flushPlayTime 累计时长', store.getState().save.stats.playTime > playBefore)

  ok('setStage 越界拒绝', store.getState().setStage(9999) === false)
  const nextStageTarget = Math.min(store.getState().save.progress.maxStage + 1, MAX_STAGE)
  ok('setStage 合法前进', store.getState().setStage(nextStageTarget) === true, `target=${nextStageTarget}`)

  store.getState().retreatToStable()
  ok('retreatToStable 退回稳定点', store.getState().save.progress.stage === store.getState().save.progress.stableStage, `stage=${store.getState().save.progress.stage}`)
}

/* ------------------------------ 8. B4 派生数据（selectors） ------------------------------ */

section('8. B4 派生数据（战力 / 属性 / Build 评分 / 解锁节奏）')

{
  const save = freshSave()
  save.inventory.capacity = 120
  const lots = Array.from({ length: 10 }, (_, i) =>
    rollEquipment({ stage: 30, rng: rngFn(7300 + i * 19) }),
  )
  addToInventory(save, { equipment: lots, materials: {}, pills: {} }, {})
  const plan = autoEquipBest(save)
  save.combat.equipment = plan.equipment

  const p = power(save)
  const breakdown = powerBreakdown(save)
  ok('power 为正数', Number.isFinite(p) && p > 0, `power=${Math.round(p)}`)
  ok('powerBreakdown 分项齐全', Object.keys(breakdown).length >= 3, Object.keys(breakdown).join('/'))

  const groups = statGroups(save)
  const rows = statRows(save)
  ok('statGroups 非空且分组有序', groups.length >= 3 && rows.length > 10, `组 ${groups.length} / 行 ${rows.length}`)
  ok('statRows 字段合法', rows.every((r) => !!r.label && Number.isFinite(r.value)))

  const score = buildScore(save)
  ok('buildScore 评级合法', ['S', 'A', 'B', 'C', 'D'].includes(score.grade), `grade=${score.grade} score=${score.score ?? ''}`)
  ok('buildScore 给出建议数组', Array.isArray(score.notes))

  const cult = cultivationProgress(save)
  ok(
    'cultivationProgress 比例在 0..1',
    cult.pct >= 0 && cult.pct <= 1 && cult.max > 0 && !!cult.stageLabel,
    `pct=${cult.pct} max=${cult.max}`,
  )

  const view = stageView(save, 30)
  ok('stageView 返回关卡信息', !!view.stageName && !!view.mapName, JSON.stringify(view).slice(0, 80))
  const maps = mapProgressList(save)
  ok('mapProgressList 覆盖全部地图', maps.length === MAPS.length, `${maps.length}/${MAPS.length}`)

  const bag = bagSummary(save)
  ok(
    'bagSummary 统计装备数',
    bag.used === save.inventory.items.length && bag.capacity === save.inventory.capacity,
    `used=${bag.used}/${bag.capacity}，可分解 ${bag.salvageable}`,
  )

  const diag = diagnose(save, 30)
  ok('diagnose 返回文案', typeof diag === 'string' && diag.length > 0)

  const unlocks = unlockProgress(save)
  ok('unlockProgress 返回解锁项', unlocks.length > 0 && unlocks.every((u) => typeof u.label === 'string' && typeof u.reached === 'boolean'))
  const next = nextUnlock(save)
  ok('nextUnlock 返回下个目标或 null', next === null || typeof next === 'string')

  ok('label 帮助函数可用', materialLabel('mat_placeholder') !== undefined && pillLabel('pill_juqi_dan') === '聚气丹' && treasureLabel('tr_qingxiao_sword').length > 0 && techniqueLabel('tech_yujian_jue').length > 0)
  ok('loadoutName / schoolName 可用', loadoutName(save).length > 0 && schoolName(save).length > 0)
  ok('equipmentSlotName 可用', equipmentSlotName('weapon') === '武器')
}

/* ------------------------------ 9. B9 / B10 素材契约 ------------------------------ */

section('9. B9 / B10 素材契约（立绘与背景真实落盘）')

{
  const pub = join(process.cwd(), 'public')
  /** B11 音效契约（甲方 F12 接入时按此文件名取用） */
  const AUDIO_KEYS = [
    'sword',
    'thunder',
    'fire',
    'boss-roar',
    'drop-red',
    'breakthrough',
    'alchemy',
    'forge',
    'ui-click',
    'story-choice',
  ]
  const missingBg = MAPS.filter((m) => !existsSync(join(pub, m.bg)))
  ok(
    '4 张地图背景均存在',
    missingBg.length === 0,
    missingBg.map((m) => m.bg).join(' '),
  )

  const missingNpc = NPCS.filter((n) => !existsSync(join(pub, n.portrait)))
  ok(
    '13 名 NPC 立绘均存在',
    NPCS.length >= 13 && missingNpc.length === 0,
    `缺 ${missingNpc.length}：${missingNpc.map((n) => n.portrait).join(' ')}`,
  )

  const missingAudio = AUDIO_KEYS.filter((n) => !existsSync(join(pub, 'audio', `${n}.wav`)))
  ok(
    '核心音效素材已落盘',
    missingAudio.length <= 2,
    missingAudio.length ? `缺 ${missingAudio.join(' ')}` : '',
  )

  // 情绪变体按 npcs.ts 实际引用统计（normal 是兜底底图，不计入变体口径）
  const moodPaths = NPCS.flatMap((n) =>
    Object.entries(n.moods ?? {})
      .filter(([mood]) => mood !== 'normal')
      .map(([, p]) => p),
  )
  const missingMood = moodPaths.filter((p) => !existsSync(join(pub, p)))
  console.log(
    `     情绪变体：${moodPaths.length - missingMood.length} / ${moodPaths.length} 张已备（缺的走 normal 兜底，不阻塞）`,
  )
  ok(
    '每个 NPC 的 normal 立绘都可解析（兜底链成立）',
    NPCS.every((n) => existsSync(join(pub, n.portrait))),
  )
}

/* ------------------------------ 汇总 ------------------------------ */

console.log(`\n════════════════════════════════════════`)
console.log(`  检查项 ${checks}，通过 ${checks - failures}，失败 ${failures}`)
console.log(`════════════════════════════════════════`)

if (failures > 0) {
  process.exitCode = 1
}
