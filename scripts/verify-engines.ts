/* ------------------------------------------------------------------ *
 * 引擎自检（B5~B8：挂机 / 突破 / 掉落保底 / 扫荡）
 * 运行：cd D:/Downloads/凡尘问道 && npx tsx scripts/verify-engines.ts
 * 全绿即认为四块引擎逻辑达成 PRD 5 / 19 / 28 / 45 / 46 / 47 的硬性验收。
 * ------------------------------------------------------------------ */

import { createNewSave } from '../lib/game/state/defaults'
import { IDLE_CAP_SECONDS, idleBreakdown, settleIdle } from '../lib/game/engine/idle'
import {
  STORAGE_MAX,
  addToInventory,
  applyPity,
  autoEquipBest,
  expandCost,
  materializeDrops,
  salvageValue,
} from '../lib/game/engine/loot'
import {
  applyBreakthrough,
  breakthroughEnemy,
  canBreakthrough,
  simulateBreakthrough,
} from '../lib/game/engine/breakthrough'
import { simulate, stageReward, sweep } from '../lib/game/engine/battle'
import { rollQuality } from '../lib/game/config/equipment'
import { getStage } from '../lib/game/config/maps'
import { encounterPool } from '../lib/game/engine/story'
import { makeRng } from '../lib/game/utils'
import {
  QUALITY_ORDER,
  type Drop,
  type EquipInstance,
  type EquipSlotId,
  type Quality,
} from '../lib/game/types'

/* ------------------------------ 断言工具 ------------------------------ */

let passed = 0
let failed = 0

function check(name: string, cond: boolean, extra = ''): void {
  if (cond) {
    passed += 1
    console.log(`  \u2713 ${name}${extra ? ` (${extra})` : ''}`)
  } else {
    failed += 1
    console.log(`  \u2717 ${name}${extra ? ` (${extra})` : ''}`)
  }
}

const qi = (q: Quality | undefined): number => (q ? QUALITY_ORDER.indexOf(q) : -1)

function mkEquip(
  quality: Quality,
  slot: EquipSlotId = 'weapon',
  atk = 10,
  locked = false,
): EquipInstance {
  return {
    uid: `t_${quality}_${slot}_${atk}_${locked ? 'L' : ''}`,
    templateId: 'qingshi_weapon',
    name: '测试装备',
    slot,
    quality,
    level: 1,
    enhance: 0,
    icon: 'sword',
    stats: { atk },
    affixes: [],
    ...(locked ? { locked: true } : {}),
  }
}

const NOW = Date.now()
const eqDrop = (quality?: Quality): Drop => ({ kind: 'equipment', quality, count: 1, label: '装备' })

/* ============================== 1. 挂机 ============================== */

console.log('\n[1] 挂机（PRD 28）')

{
  // 24 小时封顶
  const s = createNewSave(NOW)
  s.idle.lastClaim = NOW - 30 * 3600 * 1000
  const r = settleIdle(s, NOW, makeRng(101))
  check('离线 30h 封顶到 24h', r.capped === true && Math.round(r.duration) === IDLE_CAP_SECONDS, `duration=${r.duration}`)
  check('24h 灵石 / 修为 > 0', r.stone > 0 && r.cultivation > 0, `stone=${r.stone} cult=${r.cultivation}`)
  check('24h 有装备掉落（≈0.35 件/小时）', r.drops.length >= 6 && r.drops.length <= 12, `drops=${r.drops.length}`)
  check('24h 有低阶材料 / 丹药小额入账', Object.keys(r.materials).length > 0 && Object.keys(r.pills).length > 0)
  check('结算不改存档 lastClaim（由 store 写）', s.idle.lastClaim === NOW - 30 * 3600 * 1000)
}

{
  // <60 秒零收益
  const s = createNewSave(NOW)
  s.idle.lastClaim = NOW - 30 * 1000
  const r = settleIdle(s, NOW, makeRng(102))
  check('离线 <60s 零收益', r.stone === 0 && r.cultivation === 0 && r.drops.length === 0 && Object.keys(r.materials).length === 0)
  check('离线 <60s duration 为实际秒数', Math.round(r.duration) === 30 && r.capped === false)
}

{
  // 倍率明细
  const s = createNewSave(NOW)
  s.idle.lastClaim = NOW - 4 * 3600 * 1000
  const b1 = idleBreakdown(s, NOW)
  check('breakdown.seconds = 4h', Math.round(b1.seconds) === 4 * 3600 && b1.capped === false)
  check('炼气境界倍率 = 1', Math.abs(b1.realmFactor - 1) < 1e-9)
  check('未解锁洞府 caveFactor = 1', b1.caveFactor === 1)
  check('功法倍率 = 1（无主修 / 辅助）', Math.abs(b1.techniqueFactor - 1) < 1e-9)
  check('每秒收益 = 关卡收益 / 20 × 倍率', Math.abs(b1.stonePerSec - (stageReward(1).stone / 20)) < 1e-9)

  s.story.flags['cave_unlocked'] = true
  const b2 = idleBreakdown(s, NOW)
  check('洞府倍率 1.25', Math.abs(b2.caveFactor - 1.25) < 1e-9)

  s.profile.stageId = 'fd_early'
  s.profile.realmId = 'foundation'
  const b3 = idleBreakdown(s, NOW)
  check('筑基境界倍率 = sqrt(2.6)', Math.abs(b3.realmFactor - Math.sqrt(2.6)) < 1e-9)

  s.combat.mainTechnique = 'tech_test'
  s.combat.techniques = [{ defId: 'tech_test', level: 10 }]
  s.combat.supportTechniques = ['a', 'b', null]
  const b4 = idleBreakdown(s, NOW)
  check('功法倍率 1 + 10*0.05 + 2*0.02', Math.abs(b4.techniqueFactor - 1.54) < 1e-9)
}

{
  // 离线 ≥4h 的异常提示（与奇遇池一致）
  let hintStage = -1
  for (let ms = 1; ms <= 50 && hintStage < 0; ms++) {
    const probe = createNewSave(NOW)
    probe.progress.mapStage = ms
    if (encounterPool(probe).length > 0) hintStage = ms
  }
  if (hintStage > 0) {
    const h = createNewSave(NOW)
    h.progress.mapStage = hintStage
    h.idle.lastClaim = NOW - 5 * 3600 * 1000
    const rh = settleIdle(h, NOW, makeRng(103))
    check('离线 ≥4h 且奇遇池非空 → hint 提示', rh.hint === '挂机期间似乎发现了异常，是否查看？', `mapStage=${hintStage}`)

    const h2 = createNewSave(NOW)
    h2.progress.mapStage = hintStage
    h2.idle.lastClaim = NOW - 2 * 3600 * 1000
    const rh2 = settleIdle(h2, NOW, makeRng(104))
    check('离线 <4h → hint = null', rh2.hint === null)

    const h3 = createNewSave(NOW)
    h3.progress.mapStage = 1
    h3.story.seenNodes = []
    h3.idle.lastClaim = NOW - 8 * 3600 * 1000
    if (encounterPool(h3).length === 0) {
      const rh3 = settleIdle(h3, NOW, makeRng(105))
      check('奇遇池为空 → hint = null（不打扰玩家）', rh3.hint === null)
    }
  } else {
    console.log('  - 跳过 hint 断言：前 50 关未找到非空奇遇池')
  }
}

/* ============================== 2. 掉落与背包 ============================== */

console.log('\n[2] 掉落 / 保底 / 背包（PRD 19 / 45）')

{
  // materializeDrops：品质实例化 + 材料 / 丹药映射到具体 id
  const s = createNewSave(NOW)
  s.stats.playTime = 5000
  s.progress.stage = 30
  const lb = materializeDrops(
    s,
    [eqDrop('blue'), { kind: 'material', count: 3, label: '炼器材料' }, { kind: 'pill', count: 1, label: '丹药' }],
    makeRng(201),
  )
  check('装备实例化数量正确', lb.equipment.length === 1)
  check('material 映射到具体 id', Object.keys(lb.materials).length === 1 && Object.values(lb.materials)[0] === 3)
  check('pill 映射到具体 id', Object.keys(lb.pills).length === 1 && Object.values(lb.pills)[0] === 1)
}

{
  // 自动分解 + 容量
  const s = createNewSave(NOW)
  const res = addToInventory(
    s,
    { equipment: [mkEquip('white'), mkEquip('blue', 'crown')], materials: { mat_jing_tie: 2 }, pills: { pill_juqi_dan: 1 } },
    { autoSalvageBelow: 'blue' },
  )
  check('低于阈值的白装自动分解', res.salvaged.length === 1 && res.salvaged[0].quality === 'white')
  check('自动分解有灵石', res.stone > 0, `stone=${res.stone}`)
  check('蓝装入包', res.items.length === 1 && res.items[0].quality === 'blue')
  check('材料 / 丹药入账', res.materials['mat_jing_tie'] === 2 && res.pills['pill_juqi_dan'] === 1)
  check('返回的是完整背包整表（store 直接赋值）', res.items === s.inventory.items && res.materials === s.inventory.materials)
  check('未满时 full = false', res.full === false)
}

{
  // 容量满 → 新装备自动分解
  const s = createNewSave(NOW)
  s.inventory.capacity = 1
  const res = addToInventory(
    s,
    { equipment: [mkEquip('purple'), mkEquip('purple', 'crown')], materials: {}, pills: {} },
    { autoSalvageBelow: 'off' },
  )
  check('背包满时新装备自动分解', res.full === true && res.items.length === 1 && res.salvaged.length === 1)
}

{
  // locked 永不分解（即使超容）
  const s = createNewSave(NOW)
  s.inventory.capacity = 0
  const res = addToInventory(
    s,
    { equipment: [mkEquip('white', 'weapon', 10, true)], materials: {}, pills: {} },
    { autoSalvageBelow: 'blue' },
  )
  check('locked 装备永不分解', res.salvaged.length === 0 && res.items.length === 1)
}

{
  // 保底计数语义 + 双调用不重复计数
  const s = createNewSave(NOW)
  s.stats.playTime = 5000
  const patched = applyPity(s, [eqDrop('white')])
  check('白装推进 sinceBlue / sincePurple', s.inventory.pity?.sinceBlue === 1 && s.inventory.pity?.sincePurple === 1)
  materializeDrops(s, patched, makeRng(202))
  check('applyPity + materializeDrops 不双计', s.inventory.pity?.sinceBlue === 1 && s.inventory.pity?.sincePurple === 1)
  materializeDrops(s, [eqDrop('blue')], makeRng(203))
  check('蓝装重置 sinceBlue、推进 sincePurple', s.inventory.pity?.sinceBlue === 0 && s.inventory.pity?.sincePurple === 2)
  materializeDrops(s, [eqDrop('purple')], makeRng(204))
  check('紫装重置两个计数', s.inventory.pity?.sinceBlue === 0 && s.inventory.pity?.sincePurple === 0)
}

{
  // 前 10 分钟必见蓝
  const s = createNewSave(NOW)
  check('新档 playTime = 0', s.stats.playTime === 0)
  const lb = materializeDrops(s, [eqDrop()], makeRng(205))
  check('前 10 分钟首批装备必为蓝+', qi(lb.equipment[0]?.quality) >= qi('blue'), `quality=${lb.equipment[0]?.quality}`)
}

{
  // sinceBlue = 6 强制蓝；sincePurple = 25 强制紫
  const s1 = createNewSave(NOW)
  s1.stats.playTime = 5000
  s1.inventory.pity = { sinceBlue: 6, sincePurple: 6 }
  const b = materializeDrops(s1, [eqDrop('white')], makeRng(206))
  check('连续 6 次未见蓝 → 强制蓝', qi(b.equipment[0]?.quality) >= qi('blue'))

  const s2 = createNewSave(NOW)
  s2.stats.playTime = 5000
  s2.inventory.pity = { sinceBlue: 10, sincePurple: 25 }
  const p = materializeDrops(s2, [eqDrop('white')], makeRng(207))
  check('连续 25 次未见紫 → 强制紫', qi(p.equipment[0]?.quality) >= qi('purple'))
}

{
  // 连续 40 次装备掉落必出紫（品质走真实 rollQuality 分布）
  const s = createNewSave(NOW)
  s.stats.playTime = 5000
  const rng = makeRng(208)
  let purpleAt = -1
  for (let i = 0; i < 40; i++) {
    const q = rollQuality(30, 0, () => rng.next())
    const lb = materializeDrops(s, [eqDrop(q)], rng)
    if (purpleAt < 0 && qi(lb.equipment[0]?.quality) >= qi('purple')) purpleAt = i
  }
  check('连续 40 次掉落必出紫（软保底）', purpleAt >= 0 && purpleAt <= 25, `第 ${purpleAt + 1} 次`)
}

{
  // 一键穿戴 / 分解价 / 扩容价
  const s = createNewSave(NOW)
  const strong = mkEquip('orange', 'weapon', 400)
  s.inventory.items.push(strong)
  const plan = autoEquipBest(s)
  check('一键穿戴选中更优武器', plan.changed.includes('武器') && plan.equipment.weapon?.uid === strong.uid)
  check('一键穿戴不改存档（交给 store 写入）', s.combat.equipment.weapon?.uid !== strong.uid)
  check('replaced 返回被换下的旧武器', plan.replaced.length === 1)

  const poor = mkEquip('white')
  check('分解价随品质放大', salvageValue(mkEquip('purple')) > salvageValue(poor) && salvageValue(poor) > 0)

  const capFull = createNewSave(NOW)
  capFull.inventory.capacity = STORAGE_MAX
  check('扩容价：未满 > 0，已满 = 0', expandCost(createNewSave(NOW)) > 0 && expandCost(capFull) === 0)
}

/* ============================== 3. 突破 ============================== */

console.log('\n[3] 突破与失败保护（PRD 5 / 47）')

{
  // 修为不足
  const s = createNewSave(NOW)
  const c = canBreakthrough(s)
  check('修为不足 → 不可突破', c.can === false && c.cultivationOk === false && !!c.reason?.includes('修为'), c.reason)
  check('炼气一层无材料要求', c.materials.length === 0)
  check('缺省 Boss = 心魔', c.bossId === 'boss_heart_demon' && c.bossName === '心魔')

  // 修为满 → 可突破（无材料要求）
  s.profile.cultivation = 1200
  const c2 = canBreakthrough(s)
  check('修为满 → 可突破', c2.can === true && c2.reason === undefined)
}

{
  // 材料不足 / 齐备（qi_full）
  const s = createNewSave(NOW)
  s.profile.stageId = 'qi_full'
  s.profile.realmId = 'qi_refining'
  s.profile.cultivation = 320000
  const c = canBreakthrough(s)
  check('材料不足 → 不可突破', c.can === false && c.materials.length === 2 && c.materials.some((m) => !m.ok))
  check('原因指向材料', !!c.reason?.includes('突破材料不足'), c.reason)
  check('qi_full 有配置 Boss', c.bossId === 'boss_foundation_heart' && !!c.bossName, String(c.bossName))

  s.inventory.materials['mat_di_mai_ling_sui'] = 1
  s.inventory.materials['mat_zhu_ji_ling_cao'] = 3
  const c2 = canBreakthrough(s)
  check('材料齐备 → 可突破', c2.can === true && c2.materials.every((m) => m.ok))
}

{
  // 飞升圆满 / 渡劫圆满缺省天劫虚影
  const s = createNewSave(NOW)
  s.profile.stageId = 'as_1'
  s.profile.realmId = 'ascension'
  s.profile.cultivation = 1e12
  const c = canBreakthrough(s)
  check('飞升圆满 → atFinalStage 且不可突破', c.atFinalStage === true && c.can === false && c.bossId === null)

  const tb = createNewSave(NOW)
  tb.profile.stageId = 'tb_full'
  tb.profile.realmId = 'tribulation'
  tb.profile.cultivation = 3.4e13
  const ct = canBreakthrough(tb)
  check('飞升前最后阶段缺省 Boss = 天劫虚影', ct.bossId === 'boss_tribulation_shadow')
  const enemy = breakthroughEnemy(tb)
  check('突破战敌人可合成且数值有限', !!enemy && enemy.hp >= 1 && Number.isFinite(enemy.atk) && enemy.def.kind === 'boss')
}

{
  // 失败保护：不改存档、weakUntil 有值
  const s = createNewSave(NOW)
  s.profile.cultivation = 800
  const stageBefore = s.profile.stageId
  const cultBefore = s.profile.cultivation
  const o = applyBreakthrough(s, false, NOW)
  check('失败不损境界（函数不改档）', s.profile.stageId === stageBefore && o.toStageId === stageBefore && o.success === false)
  check('失败不清修为（保留）', s.profile.cultivation === cultBefore)
  check('失败不消耗材料（最宽容策略）', o.consumedMaterials.length === 0)
  check('失败 weakUntil = now + 5min', o.weakUntil === NOW + 5 * 60 * 1000, String(o.weakUntil))
  check('失败依旧保留原境界 realmId', o.realmId === 'qi_refining')
}

{
  // 成功：qi_1 → qi_2
  const s = createNewSave(NOW)
  s.profile.cultivation = 1200
  const o = applyBreakthrough(s, true, NOW)
  check('成功进入炼气二层', o.success === true && o.toStageId === 'qi_2' && o.toLabel === '炼气二层')
  check('成功 weakUntil = null', o.weakUntil === null)
  check('成功消息可读', o.message.includes('炼气一层') && o.message.includes('炼气二层'), o.message)
}

{
  // 成功：qi_full → fd_early（跨大境界 + 材料消耗 + unlocked）
  const s = createNewSave(NOW)
  s.profile.stageId = 'qi_full'
  s.profile.realmId = 'qi_refining'
  s.profile.cultivation = 320000
  const o = applyBreakthrough(s, true, NOW)
  check('跨大境界推进到筑基初期', o.success === true && o.toStageId === 'fd_early' && o.toLabel === '筑基初期')
  check('跨境界 realmId 变为 foundation', o.realmId === 'foundation')
  check('成功消耗材料清单', o.consumedMaterials.length === 2 && o.consumedMaterials.every((m) => m.count > 0))
  check('成功解锁洞府（unlocked 含 cave）', o.unlocked.includes('cave'))
}

{
  // 突破战模拟（LiveBattle 无头驱动）
  const s = createNewSave(NOW)
  s.progress.maxStage = 6
  s.progress.stage = 7
  const sim = simulateBreakthrough(s, makeRng(301))
  check(
    '突破战模拟返回有限结果',
    Number.isFinite(sim.duration) &&
      Number.isFinite(sim.playerDps) &&
      Number.isFinite(sim.playerDamage) &&
      Number.isFinite(sim.enemyDamage) &&
      Number.isFinite(sim.enemy.hp) &&
      typeof sim.win === 'boolean',
    `win=${sim.win} duration=${sim.duration.toFixed(1)}`,
  )
}

/* ============================== 4. 扫荡 ============================== */

console.log('\n[4] 扫荡（PRD 46）')

{
  const s = createNewSave(NOW)
  s.progress.maxStage = 3
  s.progress.stage = 4

  const blocked = sweep(s, 4)
  check('未通关关卡 → blocked', blocked.ok === false && typeof blocked.reason === 'string', blocked.ok ? '' : blocked.reason)

  // 剧情首次禁扫荡（前 3 关若挂了未看 storyId）
  let storyStage = -1
  for (let i = 1; i <= 3; i++) {
    const { stage } = getStage(i)
    if (stage.storyId && !s.story.seenNodes.includes(stage.storyId)) {
      storyStage = i
      break
    }
  }
  if (storyStage > 0) {
    const sb = sweep(s, storyStage)
    check('剧情未看 → blocked', sb.ok === false, sb.ok ? '' : sb.reason)
  } else {
    console.log('  - 跳过剧情禁扫荡断言：当前 maps.ts 前 3 关无未看 storyId')
  }

  // 标记剧情已看后扫荡
  for (let i = 1; i <= 3; i++) {
    const { stage } = getStage(i)
    if (stage.storyId && !s.story.seenNodes.includes(stage.storyId)) s.story.seenNodes.push(stage.storyId)
  }
  const res = sweep(s, 1, 5, { maxSeconds: 40 })
  check('已通关关卡 → ok', res.ok === true, res.ok ? '' : res.reason)
  if (res.ok) {
    check('times 保持 5', res.times === 5)
    check('收益 = 单关收益 × 胜场', res.stone === stageReward(1).stone * res.wins && res.cultivation === stageReward(1).cultivation * res.wins, `wins=${res.wins}`)
    check('duration = 各次模拟耗时之和', Math.abs(res.sims.reduce((a, b) => a + b.duration, 0) - res.duration) < 1e-6)
    check('win 与 wins 语义一致', res.win === res.wins > 0)
    check('掉落与胜场挂钩（全败无掉落）', res.wins > 0 ? true : res.drops.length === 0)
  }

  const clamped = sweep(s, 1, 999, { maxSeconds: 10 })
  check('times 夹取到 20', clamped.ok === true && clamped.times === 20)

  const zero = sweep(s, 1, 0, { maxSeconds: 5 })
  check('times 下限夹取到 1', zero.ok === true && zero.times === 1)
}

/* ============================== 5. 全量 200 关 ============================== */

console.log('\n[5] 200 关逐关模拟')

{
  check('第 1 关收益量级', stageReward(1).stone === 25 && stageReward(1).cultivation === 40)
  check('第 200 关收益量级（stone≥3000 / cult≥5000）', stageReward(200).stone >= 3000 && stageReward(200).cultivation >= 5000, `stone=${stageReward(200).stone} cult=${stageReward(200).cultivation}`)
  check('收益单调不减', stageReward(199).stone <= stageReward(200).stone)

  const s = createNewSave(NOW)
  s.progress.maxStage = 200
  let threw = 0
  let nan = 0
  for (let stage = 1; stage <= 200; stage++) {
    try {
      const sim = simulate(s, stage, { maxSeconds: 30, seed: 12345 + stage })
      const nums = [sim.duration, sim.playerDps, sim.playerDamage, sim.enemyDamage, sim.enemy.hp, sim.enemy.maxHp, sim.playerHpLeft]
      if (nums.some((v) => !Number.isFinite(v))) nan += 1
    } catch {
      threw += 1
    }
  }
  check('200 关 simulate 不抛错', threw === 0, `threw=${threw}`)
  check('200 关 simulate 无 NaN / Infinity', nan === 0, `nan=${nan}`)
}

/* ------------------------------ 汇总 ------------------------------ */

console.log(`\n结果：${passed} 通过 / ${failed} 失败`)
if (failed > 0) {
  console.error('\n存在失败断言，请检查上方 \u2717 项。')
  process.exit(1)
}
console.log('引擎四件套自检全绿。')
