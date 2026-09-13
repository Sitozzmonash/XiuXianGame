export interface StoryChapter {
  id: number
  name: string
  poem: string
  summary: string
  npcIds: string[]
  unlockText: string
}

export const CHAPTERS: StoryChapter[] = [
  {
    id: 1,
    name: '青石村 · 凡尘起灵',
    poem: '白灯挂老槐，山月照无眠。一玉温入手，凡尘始有仙。',
    summary:
      '村中接连有人失踪，你随巡山队入后山，第一次见到超出野兽的凶物。山匪尸上的一枚温热古玉、山神庙地下的御兽符、血眼山君颈后的御兽钉——三件事串成一条线：有人在驱策妖患。',
    npcIds: ['lin_bo', 'su_wan', 'zhao_shi'],
    unlockText: '解锁：背包、装备、基础战斗、法宝第一槽、仙途录。',
  },
  {
    id: 2,
    name: '黑风岭 · 初见仙途',
    poem: '雾锁黑风岭，剑裂血溪头。钉幡原一套，仙途自此幽。',
    summary:
      '你在黑风岭救下被追杀的沈青禾，从散修罗七口中得知黑风道人以钉驱兽、以幡收魂。洞府一战，你必须决定是杀、是取噬魂诀、还是留他一命——太虚盟的名字，第一次浮出水面。',
    npcIds: ['shen_qinghe', 'heifeng_daoren', 'luo_qi'],
    unlockText: '解锁：功法、法宝五主动槽逐步开放、因果变量系统。',
  },
  {
    id: 3,
    name: '云泽坊市 · 修真世界',
    poem: '云桥千盏火，一石换三秋。残片隔袖响，有人立高楼。',
    summary:
      '你第一次走进修士的社会：灵石交易、宗门招募、黑市暗号。拍卖会上出现第二枚与古玉同源的残片，太虚盟执事顾长风高价竞得。而偷你灵石的少女阿梨，正为救兄长赌上性命。',
    npcIds: ['shen_qinghe', 'gu_changfeng', 'a_li'],
    unlockText: '解锁：坊市、炼丹初级、炼器初级、商店刷新、支线任务。',
  },
  {
    id: 4,
    name: '落霞山脉 · 古修遗府',
    poem: '红叶埋旧阵，药田三十年。剑碑通一梦，天裂在云边。',
    summary:
      '落霞山脉红叶之下藏着被阵法掩去的古修洞府。药田荒了三十年，遗书说清了主人为何终生未能结丹；剑碑与你的古玉共鸣，照出一道横贯天穹的裂痕。剑修谢无尘为碑而来，敌友只在一念之间。',
    npcIds: ['shen_qinghe', 'xie_wuchen'],
    unlockText: '解锁：洞府、秘境、筑基材料线索。',
  },
]

export const CHAPTER_BY_ID: Record<number, StoryChapter> = Object.fromEntries(
  CHAPTERS.map((c) => [c.id, c]),
)

export function chapterOf(nodeChapter: number): StoryChapter | undefined {
  return CHAPTER_BY_ID[nodeChapter]
}
