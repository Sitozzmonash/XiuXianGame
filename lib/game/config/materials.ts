import type { Quality } from '../types'

export interface MaterialDef {
  id: string
  name: string
  /** 'forge' 炼器材料 / 'breakthrough' 突破材料 */
  category: 'forge' | 'breakthrough'
  quality: Quality
  icon: string
  desc: string
}

/* 炼器材料：品质即炼器时的品质权重加成来源，低阶材料只做垫底 */
const FORGE_MATERIALS: MaterialDef[] = [
  { id: 'mat_jing_tie', name: '精铁', category: 'forge', quality: 'white', icon: 'ore', desc: '凡间铁匠千锤百炼所得，最寻常的炼器胚料。' },
  { id: 'mat_hei_tie', name: '黑铁', category: 'forge', quality: 'white', icon: 'ore', desc: '蕴有微弱煞气的铁矿，炼出的器物沉重难折。' },
  { id: 'mat_chi_tong', name: '赤铜', category: 'forge', quality: 'green', icon: 'ore', desc: '色如残阳，善导灵力，多用于符器与法印。' },
  { id: 'mat_ling_yin', name: '灵银', category: 'forge', quality: 'green', icon: 'crystal', desc: '银中带青，可纳灵气，是低阶法宝的常见骨材。' },
  { id: 'mat_xing_sha', name: '星砂', category: 'forge', quality: 'blue', icon: 'crystal', desc: '陨星坠落时散落的细砂，夜里隐隐生辉。' },
  { id: 'mat_lei_ji_mu', name: '雷击木', category: 'forge', quality: 'blue', icon: 'wood', desc: '遭天雷劈中而未焚的古木，内藏一线雷意。' },
  { id: 'mat_han_sui', name: '寒髓', category: 'forge', quality: 'blue', icon: 'crystal', desc: '极寒之地万载不化的冰心，触之刺骨。' },
  { id: 'mat_huo_jing', name: '火晶', category: 'forge', quality: 'blue', icon: 'crystal', desc: '地火凝结之晶，入手灼热如握炭火。' },
  { id: 'mat_di_mai_shi', name: '地脉石', category: 'forge', quality: 'purple', icon: 'ore', desc: '承地脉走势而生，厚重沉稳，可镇器物灵性。' },
  { id: 'mat_qing_mu_xin', name: '青木心', category: 'forge', quality: 'purple', icon: 'wood', desc: '万年青木的髓心，生机不散，最合木系宝器。' },
  { id: 'mat_yao_gu', name: '妖骨', category: 'forge', quality: 'purple', icon: 'bone', desc: '妖兽遗骨，煞气未消，炼器需以灵力反复洗炼。' },
  { id: 'mat_zhui_xing_tie', name: '坠星铁', category: 'forge', quality: 'purple', icon: 'ore', desc: '自天外坠落的铁石，凡火难熔，唯真火可锻。' },
  { id: 'mat_hun_jing', name: '魂晶', category: 'forge', quality: 'orange', icon: 'orb', desc: '亡魂执念凝结，阴冷入骨，魔修补魂器之要材。' },
  { id: 'mat_long_lin_sui_pian', name: '龙鳞碎片', category: 'forge', quality: 'orange', icon: 'scale', desc: '真龙遗鳞，坚硬胜铁，一鳞可镇一座法阵。' },
  { id: 'mat_xuan_bing_yu', name: '玄冰玉', category: 'forge', quality: 'orange', icon: 'crystal', desc: '极北冰原深处的玉髓，寒气可冻结神魂。' },
  { id: 'mat_tai_xu_sha', name: '太虚砂', category: 'forge', quality: 'orange', icon: 'crystal', desc: '产自虚天遗迹的砂砾，时空错乱处淘得。' },
  { id: 'mat_jie_shi', name: '界石', category: 'forge', quality: 'red', icon: 'ore', desc: '两界夹缝中析出的石髓，能稳跨界之力。' },
  { id: 'mat_xian_wen_can_pian', name: '仙纹残片', category: 'forge', quality: 'red', icon: 'shard', desc: '刻有仙纹的碎片，纹路会自行游走，多看伤神。' },
  { id: 'mat_zhen_ling_gu', name: '真灵骨', category: 'forge', quality: 'red', icon: 'bone', desc: '上古真灵陨落所遗骨殖，灵性未泯。' },
  { id: 'mat_jiu_jie_shi', name: '九劫石', category: 'forge', quality: 'rainbow', icon: 'crystal', desc: '历九重天劫而不碎的石胎，传说中仙器的唯一种子。' },
]

/* 突破材料：按十境顺序排列，数量需求随境界递增（见 realms.ts 的 breakthroughMaterials） */
const BREAKTHROUGH_MATERIALS: MaterialDef[] = [
  { id: 'mat_di_mai_ling_sui', name: '地脉灵髓', category: 'breakthrough', quality: 'orange', icon: 'crystal', desc: '地脉灵气凝成的髓液，筑基洗骨之根本。' },
  { id: 'mat_zhu_ji_ling_cao', name: '筑基灵草', category: 'breakthrough', quality: 'blue', icon: 'herb', desc: '生于灵脉之上的药草，服之可平复筑基时的血气翻涌。' },
  { id: 'mat_san_yang_hua', name: '三阳花', category: 'breakthrough', quality: 'purple', icon: 'herb', desc: '一株三花，各承朝、午、暮之阳，为凝气化元之引。' },
  { id: 'mat_yin_yang_xuan_sui', name: '阴阳玄髓', category: 'breakthrough', quality: 'purple', icon: 'orb', desc: '生死之间的玄髓，结丹者以此调和阴阳二气。' },
  { id: 'mat_jin_dan_sha', name: '金丹砂', category: 'breakthrough', quality: 'orange', icon: 'sand', desc: '丹火淬炼万年所余的砂金，凝丹之基。' },
  { id: 'mat_ying_ling_guo', name: '婴灵果', category: 'breakthrough', quality: 'orange', icon: 'herb', desc: '形如婴胎的灵果，服之可养元婴雏形。' },
  { id: 'mat_yang_hun_mu', name: '养魂木', category: 'breakthrough', quality: 'purple', icon: 'wood', desc: '以魂为壤而生，长期佩之可固神魂。' },
  { id: 'mat_shen_nian_jing', name: '神念晶', category: 'breakthrough', quality: 'red', icon: 'crystal', desc: '神念高度凝聚所成的晶石，化神之关必需。' },
  { id: 'mat_hua_shen_lu', name: '化神露', category: 'breakthrough', quality: 'orange', icon: 'drop', desc: '月华入夜凝结的灵露，可洗去识海尘埃。' },
  { id: 'mat_xu_kong_shi', name: '虚空石', category: 'breakthrough', quality: 'red', icon: 'ore', desc: '自空间裂缝中取出，重量会随时间无序变化。' },
  { id: 'mat_jie_ling_hua', name: '界灵花', category: 'breakthrough', quality: 'red', icon: 'herb', desc: '只在两界交汇处开花，花期仅一刻。' },
  { id: 'mat_he_tian_yu', name: '合天玉', category: 'breakthrough', quality: 'red', icon: 'jade', desc: '合天道之玉，可暂合肉身与元神为一体。' },
  { id: 'mat_zhen_ling_xue', name: '真灵血', category: 'breakthrough', quality: 'red', icon: 'drop', desc: '真灵之血，一滴入体如万刃齐割，却是大乘之阶。' },
  { id: 'mat_da_cheng_guo', name: '大乘果', category: 'breakthrough', quality: 'red', icon: 'herb', desc: '万年一熟的道果，入口即见半生因果。' },
  { id: 'mat_tian_lei_ye', name: '天雷液', category: 'breakthrough', quality: 'rainbow', icon: 'drop', desc: '以容器接引天雷而得的液雷，渡劫者护身之物。' },
  { id: 'mat_jiu_jie_mu', name: '九劫木', category: 'breakthrough', quality: 'rainbow', icon: 'wood', desc: '经九次雷劫而不死的枯木，雷痕即是道纹。' },
  { id: 'mat_xian_men_sui_pian', name: '仙门碎片', category: 'breakthrough', quality: 'rainbow', icon: 'shard', desc: '破碎仙门的一角，靠近时会听见万千低语。' },
  { id: 'mat_jie_jue_can_guang', name: '界玦残光', category: 'breakthrough', quality: 'rainbow', icon: 'orb', desc: '问道界玦碎片上剥离的一缕光，能短暂照见天门。' },
  { id: 'mat_dao_xin_lian', name: '道心莲', category: 'breakthrough', quality: 'rainbow', icon: 'lotus', desc: '以道心为种、以岁月为水开出的莲，心不坚者不可得。' },
  { id: 'mat_tian_men_he_xin', name: '天门核心', category: 'breakthrough', quality: 'rainbow', icon: 'orb', desc: '天门的中枢残核，飞升之路上唯一的钥匙。' },
]

export const MATERIALS: MaterialDef[] = [...FORGE_MATERIALS, ...BREAKTHROUGH_MATERIALS]

export const MATERIAL_BY_ID: Record<string, MaterialDef> = Object.fromEntries(
  MATERIALS.map((m) => [m.id, m]),
)

export const FORGE_MATERIAL_IDS = FORGE_MATERIALS.map((m) => m.id)
export const BREAKTHROUGH_MATERIAL_IDS = BREAKTHROUGH_MATERIALS.map((m) => m.id)
