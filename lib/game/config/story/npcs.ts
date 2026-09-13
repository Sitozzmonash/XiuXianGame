import type { NpcDef } from '../../types'

/* ------------------------------------------------------------------ *
 * 贯穿型与前期 NPC。portrait 指向 /images/npc/<id>.png，
 * 立绘缺失时由 UI 回退为水墨剪影，不视为错误。
 * ------------------------------------------------------------------ */

const COMMON_STAGES: NpcDef['stages'] = [
  { min: -999, label: '敌视' },
  { min: 0, label: '陌路' },
  { min: 20, label: '相识' },
  { min: 50, label: '道友' },
  { min: 80, label: '挚友' },
]

export const NPCS: NpcDef[] = [
  {
    id: 'shen_qinghe',
    name: '沈青禾',
    title: '青玄剑宗·外门执剑',
    portrait: '/images/npc/shen_qinghe.png',
    moods: {
      normal: '/images/npc/shen_qinghe.png',
      hurt: '/images/npc/shen_qinghe_hurt.png',
      cold: '/images/npc/shen_qinghe_cold.png',
      happy: '/images/npc/shen_qinghe_happy.png',
    },
    desc: '黑风岭上被邪修追杀的女修，剑意清寒，寡言而重诺。师父失踪多年，她一路追查太虚盟的痕迹。',
    initialRelation: 0,
    stages: COMMON_STAGES,
  },
  {
    id: 'gu_changfeng',
    name: '顾长风',
    title: '太虚盟·执事',
    portrait: '/images/npc/gu_changfeng.png',
    moods: {
      normal: '/images/npc/gu_changfeng.png',
      cold: '/images/npc/gu_changfeng_cold.png',
      angry: '/images/npc/gu_changfeng_angry.png',
    },
    desc: '太虚盟年轻执事，行事守序，惯以规矩压人。他所信的秩序正在被盟内的秘密一点点磨穿。',
    initialRelation: 0,
    stages: COMMON_STAGES,
  },
  {
    id: 'xie_wuchen',
    name: '谢无尘',
    title: '青玄剑宗·内门剑修',
    portrait: '/images/npc/xie_wuchen.png',
    moods: {
      normal: '/images/npc/xie_wuchen.png',
      angry: '/images/npc/xie_wuchen_angry.png',
      cold: '/images/npc/xie_wuchen_cold.png',
      happy: '/images/npc/xie_wuchen_happy.png',
    },
    desc: '天才剑修，骄傲直率，眼中只有剑。亦是劲敌，亦可能是一生之友。',
    initialRelation: -10,
    stages: COMMON_STAGES,
  },
  {
    id: 'a_li',
    name: '阿梨',
    title: '云泽坊市·流浪少女',
    portrait: '/images/npc/a_li.png',
    moods: {
      normal: '/images/npc/a_li.png',
      hurt: '/images/npc/a_li_hurt.png',
      happy: '/images/npc/a_li_happy.png',
    },
    desc: '坊市里手脚极快的偷儿，身上藏着妖族血脉。她偷灵石，是为救一个病重的兄长。',
    initialRelation: 0,
    stages: COMMON_STAGES,
  },
  {
    id: 'luo_wuyi',
    name: '洛无衣',
    title: '幽冥谷·弟子',
    portrait: '/images/npc/luo_wuyi.png',
    moods: {
      normal: '/images/npc/luo_wuyi.png',
      cold: '/images/npc/luo_wuyi_cold.png',
    },
    desc: '幽冥谷弟子，言词刻薄却敬重亡者。她修的并非邪法，而是世人不敢直视的死生之道。',
    initialRelation: 0,
    stages: COMMON_STAGES,
  },
  {
    id: 'yue_li',
    name: '月璃',
    title: '守门人后裔',
    portrait: '/images/npc/yue_li.png',
    moods: {
      normal: '/images/npc/yue_li.png',
      cold: '/images/npc/yue_li_cold.png',
      happy: '/images/npc/yue_li_happy.png',
    },
    desc: '自无尽海雾中走出的女修，知晓甚多，却因一纸旧誓不能尽言。她的目光总落在天边某道裂痕上。',
    initialRelation: 0,
    stages: COMMON_STAGES,
  },
  {
    id: 'xuan_yu',
    name: '玄羽',
    title: '苍梧古林·妖族少年',
    portrait: '/images/npc/xuan_yu.png',
    moods: {
      normal: '/images/npc/xuan_yu.png',
      hurt: '/images/npc/xuan_yu_hurt.png',
      angry: '/images/npc/xuan_yu_angry.png',
    },
    desc: '被人族猎户追杀的妖族少年，羽翼未丰。他要的不是复仇，而是一条人妖共活的路。',
    initialRelation: 0,
    stages: COMMON_STAGES,
  },
  {
    id: 'wen_tiance',
    name: '闻天策',
    title: '太虚盟·天策上使',
    portrait: '/images/npc/wen_tiance.png',
    moods: {
      normal: '/images/npc/wen_tiance.png',
      cold: '/images/npc/wen_tiance_cold.png',
      angry: '/images/npc/wen_tiance_angry.png',
    },
    desc: '主张重开天门之人。他不为私欲，只为质问：上古修士凭什么替万世之后决定飞升之路。',
    initialRelation: -20,
    stages: COMMON_STAGES,
  },

  /* ---------------------------- 前期 NPC ---------------------------- */
  {
    id: 'lin_bo',
    name: '林伯',
    title: '青石村·养父',
    portrait: '/images/npc/lin_bo.png',
    desc: '将你从雪地里抱回来的老猎户，一生未出过青石村，只盼你平安活着。',
    initialRelation: 60,
    stages: COMMON_STAGES,
  },
  {
    id: 'su_wan',
    name: '苏晚',
    title: '青石村·少女医者',
    portrait: '/images/npc/su_wan.png',
    moods: {
      normal: '/images/npc/su_wan.png',
      happy: '/images/npc/su_wan_happy.png',
      hurt: '/images/npc/su_wan_hurt.png',
    },
    desc: '采药为生的村中少女，识得数十种草木，胆子比村里所有后生都大。',
    initialRelation: 30,
    stages: COMMON_STAGES,
  },
  {
    id: 'zhao_shi',
    name: '赵石',
    title: '青石村·巡山队领队',
    portrait: '/images/npc/zhao_shi.png',
    desc: '巡山队长，刀法粗疏，却肯为村人挡在最前。',
    initialRelation: 20,
    stages: COMMON_STAGES,
  },
  {
    id: 'heifeng_daoren',
    name: '黑风道人',
    title: '黑风岭·邪修',
    portrait: '/images/npc/heifeng_daoren.png',
    moods: {
      normal: '/images/npc/heifeng_daoren.png',
      angry: '/images/npc/heifeng_daoren_angry.png',
      hurt: '/images/npc/heifeng_daoren_hurt.png',
    },
    desc: '以御兽钉驱策妖兽、以魂幡炼兽魂的邪修。他究竟是主谋，还是别人手中的一枚钉。',
    initialRelation: -40,
    stages: COMMON_STAGES,
  },
  {
    id: 'luo_qi',
    name: '罗七',
    title: '黑风岭·散修',
    portrait: '/images/npc/luo_qi.png',
    desc: '欠了一身灵石债的散修，靠卖消息换命。消息真假各半，但从不空口。',
    initialRelation: 10,
    stages: COMMON_STAGES,
  },
]

export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries(
  NPCS.map((n) => [n.id, n]),
)

export function npcById(id: string): NpcDef | undefined {
  return NPC_BY_ID[id]
}

/** 旁白无名字，主角显示「你」 */
export function npcName(id: string): string {
  if (id === 'narration') return ''
  if (id === 'player') return '你'
  return NPC_BY_ID[id]?.name ?? id
}

/** 关系值 → 阶段文案 */
export function relationStage(npc: NpcDef | undefined, relation: number): string {
  const stages = npc?.stages ?? COMMON_STAGES
  let label = stages[0]?.label ?? '陌路'
  for (const s of stages) {
    if (relation >= s.min) label = s.label
  }
  return label
}
