/* ------------------------------------------------------------------ *
 * 剧情物品映射 —— 剧情 / 奇遇文本里出现的「道具」到实际材料的映射
 *
 * 剧情作者会写出「御兽钉」「青禾玉符」这类叙事道具，它们不需要各自占用
 * 一条材料配置；这里按语义把每个叙事道具归到一条真实材料上，玩家在背包里
 * 看到的是材料名，剧情里看到的是叙事名，两边都不失真。
 *
 * 想新增叙事道具时，只需在下面加一行，不要动材料配置。
 * ------------------------------------------------------------------ */

export interface StoryItemMapping {
  /** 剧情里的名字（仅用于文案，可选） */
  label: string
  /** 落到哪条真实材料 / 丹药 id */
  materialId: string
}

export const STORY_ITEM_MAP: Record<string, StoryItemMapping> = {
  /* ---- 青石村 ---- */
  mat_chen_xiang_mu: { label: '沉香木牌', materialId: 'mat_qing_mu_xin' },
  mat_fu_wen_tuo_pian: { label: '符文拓片', materialId: 'mat_xian_wen_can_pian' },
  mat_yu_shou_ding: { label: '御兽钉', materialId: 'mat_yao_gu' },
  mat_shan_shen_xiang_hui: { label: '山神像灰', materialId: 'mat_di_mai_shi' },
  mat_xiang_huo_zhi: { label: '香火纸', materialId: 'mat_qing_mu_xin' },
  mat_wu_mian_shen_xiang_tuo: { label: '无面神像拓', materialId: 'mat_xian_wen_can_pian' },
  mat_jiu_ye_ling_zhi: { label: '九叶灵芝', materialId: 'mat_qing_mu_xin' },
  mat_qing_lin_pi: { label: '青鳞皮', materialId: 'mat_yao_gu' },
  mat_ling_tian_zhong: { label: '灵田种子', materialId: 'mat_qing_mu_xin' },
  mat_ling_quan_shui: { label: '灵泉水', materialId: 'mat_han_sui' },
  mat_ling_quan_zuo_biao: { label: '灵泉坐标', materialId: 'mat_jie_shi' },

  /* ---- 黑风岭 ---- */
  mat_qinghe_yu_fu: { label: '青禾玉符', materialId: 'mat_xuan_bing_yu' },
  mat_yin_sha_gu: { label: '阴煞骨', materialId: 'mat_yao_gu' },
  mat_hei_feng_lin: { label: '黑风鳞', materialId: 'mat_long_lin_sui_pian' },
  mat_can_hun_jing: { label: '残魂晶', materialId: 'mat_hun_jing' },
  mat_yin_hun_sui: { label: '阴魂髓', materialId: 'mat_hun_jing' },
  mat_feng_yin_mu_he: { label: '封印木盒', materialId: 'mat_qing_mu_xin' },
  mat_mi_hun_zhen: { label: '迷魂阵图', materialId: 'mat_xian_wen_can_pian' },

  /* ---- 云泽坊市 ---- */
  mat_yun_ze_ling_sha: { label: '云泽灵石砂', materialId: 'mat_xing_sha' },
  mat_yao_xue_jing: { label: '妖血晶', materialId: 'mat_hun_jing' },
  mat_ling_shi_jing: { label: '灵石精', materialId: 'mat_ling_yin' },
  mat_hei_shi_ling_fu: { label: '黑市令符', materialId: 'mat_tai_xu_sha' },
  mat_pai_mai_xing_pai: { label: '拍卖行牌', materialId: 'mat_xing_sha' },
  mat_mi_xin_jian: { label: '密信', materialId: 'mat_xian_wen_can_pian' },
  mat_san_xiu_ling_pai: { label: '散修令牌', materialId: 'mat_ling_yin' },
  mat_yun_wen_dan_ke: { label: '云纹丹壳', materialId: 'mat_huo_jing' },
  mat_hei_shi_dan_yao: { label: '黑市丹药', materialId: 'pill_juqi_dan' },

  /* ---- 落霞山脉 ---- */
  mat_gu_xiu_liu_yan: { label: '古修留言', materialId: 'mat_xian_wen_can_pian' },
  mat_jian_sui: { label: '剑穗', materialId: 'mat_jing_tie' },
  mat_jian_xin_yu: { label: '剑心玉', materialId: 'mat_xuan_bing_yu' },
  mat_jian_zhong_ling: { label: '剑冢铃', materialId: 'mat_ling_yin' },
  mat_wu_ming_jian_qiao: { label: '无名剑鞘', materialId: 'mat_lei_ji_mu' },
  mat_wu_ming_ling_pai: { label: '无名灵牌', materialId: 'mat_qing_mu_xin' },
  mat_jian_tie_sui: { label: '剑铁碎', materialId: 'mat_jing_tie' },

  /* ---- 通用奇遇 ---- */
  mat_san_xiu_xin_wu: { label: '散修信物', materialId: 'mat_ling_yin' },
  mat_ling_shi_sui: { label: '灵石碎', materialId: 'mat_ling_yin' },
  mat_gu_ji_tu: { label: '古迹图', materialId: 'mat_xian_wen_can_pian' },
  mat_ling_cao: { label: '灵草', materialId: 'mat_qing_mu_xin' },
  mat_yao_shou_pi: { label: '妖兽皮', materialId: 'mat_yao_gu' },
  mat_tai_xu_kuang_shi: { label: '太虚矿石', materialId: 'mat_tai_xu_sha' },
  mat_gu_jing_ling_quan: { label: '古井灵泉', materialId: 'mat_han_sui' },
  mat_jing_di_gu: { label: '井底骨', materialId: 'mat_yao_gu' },
  mat_qing_hu_ling_mao: { label: '青狐灵毛', materialId: 'mat_yao_gu' },
  mat_lei_jie_can_tie: { label: '雷劫残铁', materialId: 'mat_zhui_xing_tie' },
  mat_gu_nu_lei_zhu: { label: '古弩雷珠', materialId: 'mat_huo_jing' },
  mat_yao_jing_gu: { label: '妖晶骨', materialId: 'mat_yao_gu' },
  mat_yue_hua_cao: { label: '月华草', materialId: 'mat_qing_mu_xin' },
  mat_gu_suo_yao_shi: { label: '古锁钥匙', materialId: 'mat_ling_yin' },
  mat_mu_ling_zhi: { label: '木灵之息', materialId: 'mat_qing_mu_xin' },
  mat_ling_mu_xin: { label: '灵木心', materialId: 'mat_qing_mu_xin' },
  mat_xiang_tu: { label: '香土', materialId: 'mat_di_mai_shi' },
  mat_liu_li_cao: { label: '琉璃草', materialId: 'mat_qing_mu_xin' },
  mat_zhen_tu_can_ye: { label: '阵图残页', materialId: 'mat_xian_wen_can_pian' },
  mat_huan_jing_can_pian: { label: '幻境残片', materialId: 'mat_xian_wen_can_pian' },
  mat_xin_mo_jing: { label: '心魔镜', materialId: 'mat_hun_jing' },
  mat_qi_pu_can_juan: { label: '棋谱残卷', materialId: 'mat_xian_wen_can_pian' },
  mat_gu_jie_yin_ji: { label: '古界印记', materialId: 'mat_jie_shi' },

  /* ---- 剧情里的丹药别名 ---- */
  pill_ju_qi_dan: { label: '聚气丹', materialId: 'pill_juqi_dan' },
  pill_ning_shen_dan: { label: '凝神丹', materialId: 'pill_qingxin_dan' },
}

/** 解析一个叙事道具 id 到真实材料 id；未登记时原样返回，由调用方兜底 */
export function resolveStoryItem(id: string): string {
  return STORY_ITEM_MAP[id]?.materialId ?? id
}

/** 叙事名（若未登记则返回 null，调用方回落到材料自身名称） */
export function storyItemLabel(id: string): string | null {
  return STORY_ITEM_MAP[id]?.label ?? null
}
