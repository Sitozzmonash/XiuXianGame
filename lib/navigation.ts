export type Screen =
  | 'login'
  | 'home'
  | 'battle'
  | 'inventory'
  | 'character'
  | 'build'
  | 'realm'
  | 'techniques'
  | 'cave'
  | 'sect'
  | 'dungeon'
  | 'ranking'

export type ModalKind =
  | 'equipment'
  | 'treasure'
  | 'idle'
  | 'bossFail'
  | null

export type BottomTab = 'cave' | 'inventory' | 'cultivate' | 'alchemy' | 'treasure'

export const BOTTOM_TABS: { id: BottomTab; label: string; screen: Screen }[] = [
  { id: 'cave', label: '洞府', screen: 'cave' },
  { id: 'inventory', label: '背包', screen: 'inventory' },
  { id: 'cultivate', label: '修炼', screen: 'realm' },
  { id: 'alchemy', label: '炼丹', screen: 'techniques' },
  { id: 'treasure', label: '法宝', screen: 'build' },
]
