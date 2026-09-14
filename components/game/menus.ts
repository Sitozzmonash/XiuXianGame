'use client'

/* ------------------------------------------------------------------ *
 * 主界面侧边菜单定义
 * 侧栏是导航入口而非游戏内容，放在 UI 层；内容类数据一律走 config。
 * ------------------------------------------------------------------ */

import type { Screen } from '@/lib/navigation'

export interface MenuEntry {
  id: string
  label: string
  icon: string
  screen: Screen | null
  /** 未解锁时置灰（由调用方按存档判断后过滤） */
  locked?: boolean
  redDot?: boolean
}

export const LeftMenu: MenuEntry[] = [
  { id: 'realm-explore', label: '秘境', icon: 'array', screen: 'dungeon' },
  { id: 'welfare', label: '福利', icon: 'gift', screen: 'welfare', redDot: true },
  { id: 'sect', label: '宗门', icon: 'gate', screen: 'sect' },
  { id: 'fate', label: '仙缘', icon: 'lotus', screen: 'ranking' },
]

export const RightMenu: MenuEntry[] = [
  { id: 'map', label: '地图', icon: 'map', screen: 'map' },
  { id: 'role', label: '角色', icon: 'user', screen: 'character' },
  { id: 'artifact', label: '法宝', icon: 'vase', screen: 'treasures' },
  { id: 'technique', label: '功法', icon: 'sword', screen: 'techniques' },
  { id: 'market', label: '坊市', icon: 'shop', screen: 'market', redDot: true },
]
