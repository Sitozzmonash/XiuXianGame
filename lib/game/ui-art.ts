/* ------------------------------------------------------------------ *
 * 立绘 / 图标资源映射（表现层专用）
 *
 * 只做「游戏内 id → public 下的图片路径」，不含任何数值语义，
 * 因此放在 UI 层而不是 lib/game/config（配置层由逻辑侧维护）。
 * 素材缺失时统一返回 undefined，调用方自行回落到矢量图标或程序化剪影。
 * ------------------------------------------------------------------ */

/** 怪物立绘优先按 id 精确命中（首领专属），否则按 icon 归类 */
const MONSTER_BY_ID: Record<string, string> = {
  boss_shanjun: '/images/boss-xueyan-shanjun.png',
  boss_yushou_jiang: '/images/boss-shijin-wugong.png',
  boss_heifeng_daoren: '/images/boss-heifeng-daoren.png',
  boss_yinshan_gulong: '/images/boss-shijia-dilong.png',
  boss_luoqi: '/images/monsters/boss-luoqi.png',
  boss_tu_san: '/images/monsters/boss-tusan.png',
  boss_guchangfeng: '/images/monsters/boss-guchangfeng.png',
  boss_xie_wuchen: '/images/monsters/boss-xiewuchen.png',
}

const MONSTER_BY_ICON: Record<string, string> = {
  beast: '/images/monsters/beast.png',
  feather: '/images/monsters/feather.png',
  axe: '/images/monsters/axe.png',
  seal: '/images/monsters/seal.png',
  drop: '/images/monsters/drop.png',
  scroll: '/images/monsters/scroll.png',
  burst: '/images/monsters/burst.png',
  banner: '/images/monsters/banner.png',
  sword: '/images/monsters/sword.png',
  shield: '/images/monsters/shield.png',
  leaf: '/images/monsters/leaf.png',
  wind: '/images/monsters/wind.png',
  tortoise: '/images/monsters/tortoise.png',
  crystal: '/images/monsters/crystal.png',
  sprout: '/images/monsters/sprout.png',
  jade: '/images/monsters/jade.png',
}

/** 怪物立绘：先查 id（首领专属），再按 icon 归类；都没有则 undefined */
export function monsterArt(id: string, icon?: string): string | undefined {
  return MONSTER_BY_ID[id] ?? (icon ? MONSTER_BY_ICON[icon] : undefined)
}

/** 装备部位图（10 个部位各一张） */
const EQUIP_BY_SLOT: Record<string, string> = {
  weapon: '/images/equip/weapon.png',
  crown: '/images/equip/crown.png',
  robe: '/images/equip/robe.png',
  belt: '/images/equip/belt.png',
  bracer: '/images/equip/bracer.png',
  boots: '/images/equip/boots.png',
  necklace: '/images/equip/necklace.png',
  ring: '/images/equip/ring.png',
  jade: '/images/equip/jade.png',
  seal: '/images/equip/seal.png',
}

export function equipArt(slot: string): string | undefined {
  return EQUIP_BY_SLOT[slot]
}

/** 法宝图（按法宝配置里的 icon） */
const TREASURE_BY_ICON: Record<string, string> = {
  sword: '/images/treasures/sword.png',
  case: '/images/treasures/case.png',
  array: '/images/treasures/array.png',
  scroll: '/images/treasures/scroll.png',
  thunder: '/images/treasures/thunder.png',
  flame: '/images/treasures/flame.png',
  moon: '/images/treasures/moon.png',
  seal: '/images/treasures/seal.png',
  bottle: '/images/treasures/bottle.png',
  bell: '/images/treasures/bell.png',
  tortoise: '/images/treasures/tortoise.png',
  drum: '/images/treasures/drum.png',
  cauldron: '/images/treasures/cauldron.png',
  banner: '/images/treasures/banner.png',
  orb: '/images/treasures/orb.png',
  lamp: '/images/treasures/lamp.png',
  mirror: '/images/treasures/mirror.png',
  tower: '/images/treasures/tower.png',
  gourd: '/images/treasures/gourd.png',
  bead: '/images/treasures/bead.png',
  ring: '/images/treasures/ring.png',
  compass: '/images/treasures/compass.png',
  ruler: '/images/treasures/ruler.png',
  shield: '/images/treasures/shield.png',
  jade: '/images/treasures/jade.png',
}

export function treasureArt(icon: string): string | undefined {
  return TREASURE_BY_ICON[icon]
}
