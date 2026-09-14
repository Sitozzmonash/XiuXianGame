import type { StoryNode } from '../../types'

/* ------------------------------------------------------------------ *
 * 奇遇池。trigger 均为 stage，stageRange 覆盖第一至第四章关卡区间；
 * 由 rollEncounter 按 weight 加权抽取，once 保证只遇一次。
 * ------------------------------------------------------------------ */

export const ENCOUNTERS: StoryNode[] = [
  {
    id: 'e001_ruined_temple',
    chapter: 1,
    type: 'encounter',
    title: '雨夜破庙',
    trigger: 'stage',
    stageRange: [4, 18],
    weight: 16,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '雨里有一座塌了半边的破庙。庙中火堆旁靠着一名散修，腿上伤口翻着白肉。',
      },
      { speaker: 'narration', text: '他听见脚步，手先摸到了刀柄上。' },
    ],
    choices: [
      {
        id: 'e001_medicine',
        text: '递上伤药，替他包扎',
        effects: [
          { type: 'flag_set', key: 'e001_helped', value: true },
          { type: 'relation_add', key: 'luo_qi', value: 6 },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_item', key: 'mat_san_xiu_xin_wu', count: 1 },
          { type: 'log', value: '破庙里的散修伤愈后留下一包信物，说日后相遇必还此情。' },
        ],
        reply: [{ speaker: 'narration', text: '他没道谢，只把你的脸看了很久。' }],
      },
      {
        id: 'e001_search',
        text: '趁他伤重，搜他的行囊',
        effects: [
          { type: 'flag_set', key: 'e001_robbed', value: true },
          { type: 'karma_add', key: 'daoHeart', value: -1 },
          { type: 'give_stone', value: 350 },
          { type: 'give_item', key: 'mat_ling_shi_sui', count: 2 },
          { type: 'log', value: '你取走了破庙散修的行囊。他一句话没说，只是记住了你。' },
        ],
        reply: [
          { speaker: 'narration', text: '出庙时雨更大了。你听见身后传来一声很轻的、忍着痛的笑。' },
        ],
      },
      {
        id: 'e001_leave',
        text: '退回雨里，另寻他处',
        effects: [
          { type: 'flag_set', key: 'e001_left', value: true },
          { type: 'give_cultivation', value: 200 },
          { type: 'log', value: '你没有进破庙。雨里赶路一夜，反倒把一门吐纳的法子想通了。' },
        ],
      },
    ],
  },
  {
    id: 'e002_broken_stele',
    chapter: 1,
    type: 'encounter',
    title: '残破剑碑',
    trigger: 'stage',
    stageRange: [8, 24],
    weight: 14,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '半截青石断碑斜插在坡上，碑面剑痕已旧，指腹贴上去仍有麻意。',
      },
      { speaker: 'narration', text: '碑缝里嵌着一柄断剑，剑柄朝上，像有人故意留在这里。' },
    ],
    choices: [
      {
        id: 'e002_meditate',
        text: '静坐碑前参悟剑意',
        effects: [
          { type: 'flag_set', key: 'e002_insight', value: true },
          { type: 'karma_add', key: 'jadeResonance', value: 1 },
          { type: 'give_cultivation', value: 500 },
          { type: 'give_technique', key: 'tech_jianxin_jue' },
          { type: 'log', value: '你在断碑前坐了一夜，得《残篇·剑意》。' },
        ],
        reply: [
          { speaker: 'narration', text: '天亮时剑痕还是那些剑痕，你眼里的它们却变了形状。' },
        ],
      },
      {
        id: 'e002_pull',
        text: '强拔断剑',
        effects: [
          { type: 'flag_set', key: 'e002_pulled', value: true },
          { type: 'give_equipment', quality: 'green', key: 'weapon' },
          { type: 'give_stone', value: 200 },
          { type: 'log', value: '断剑离碑的瞬间，一股剑意炸开，你受了些伤，也得了柄好兵器。' },
        ],
        reply: [
          { speaker: 'narration', text: '掌心裂开一道口子，断剑上的旧血纹却活了。' },
        ],
      },
      {
        id: 'e002_mark',
        text: '记下位置，不动分毫',
        effects: [
          { type: 'flag_set', key: 'e002_marked', value: true },
          { type: 'give_item', key: 'mat_gu_ji_tu', count: 1 },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'log', value: '你把断碑画进舆图。有些机缘，留着比拿走值钱。' },
        ],
      },
    ],
  },
  {
    id: 'e003_herb_field',
    chapter: 1,
    type: 'encounter',
    title: '无主药田',
    trigger: 'stage',
    stageRange: [6, 22],
    weight: 15,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '一畦灵药长在山坳背阴处，叶上凝着白霜，根须已能入药。田埂边倒着半具骸骨。',
      },
      { speaker: 'narration', text: '药是熟的，人是死的。这地方原本有人守着。' },
    ],
    choices: [
      {
        id: 'e003_pick',
        text: '尽数采下',
        effects: [
          { type: 'flag_set', key: 'e003_picked', value: true },
          { type: 'give_item', key: 'mat_ling_cao', count: 5 },
          { type: 'give_item', key: 'pill_ju_qi_dan', count: 2 },
          { type: 'log', value: '你采空了那畦灵药，连根带土装了两大包。' },
        ],
        reply: [
          { speaker: 'narration', text: '拔起最后一株时，你听见山坳里有什么东西动了一下。' },
        ],
      },
      {
        id: 'e003_seed',
        text: '只取熟株，留下根种',
        effects: [
          { type: 'flag_set', key: 'e003_seeded', value: true },
          { type: 'give_item', key: 'mat_ling_cao', count: 2 },
          { type: 'give_item', key: 'mat_ling_tian_zhong', count: 1 },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'log', value: '你留了根种与半畦药苗。来年这处山坳还会绿。' },
        ],
      },
      {
        id: 'e003_ward',
        text: '布下小阵据为己有',
        effects: [
          { type: 'flag_set', key: 'e003_warded', value: true },
          { type: 'give_item', key: 'mat_ling_cao', count: 4 },
          { type: 'karma_add', key: 'immortalErosion', value: 1 },
          { type: 'log', value: '你以阵旗圈住药田。三天后阵还在，药少了一半。' },
        ],
        reply: [
          { speaker: 'narration', text: '阵旗完好，田里却有人来过——脚印是赤脚的。' },
        ],
      },
    ],
  },
  {
    id: 'e004_beast_tide',
    chapter: 1,
    type: 'encounter',
    title: '兽潮前兆',
    trigger: 'stage',
    stageRange: [10, 26],
    weight: 13,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '山谷忽然静了。鸟不叫，虫不鸣，脚下的碎石在轻轻跳。',
      },
      { speaker: 'narration', text: '远处林线倒伏，像有一整片林子正在朝你走过来。' },
    ],
    choices: [
      {
        id: 'e004_meet',
        text: '结阵迎战',
        effects: [
          { type: 'flag_set', key: 'e004_fought', value: true },
          { type: 'give_stone', value: 500 },
          { type: 'give_equipment', quality: 'green', key: 'bracer' },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'log', value: '你在谷口硬接兽潮，捡回一条命与一副护腕。' },
        ],
        reply: [
          { speaker: 'narration', text: '兽群退去时，你数了数，地上躺着的妖尸里有三头是被人驱来的。' },
        ],
      },
      {
        id: 'e004_detour',
        text: '绕路而行',
        effects: [
          { type: 'flag_set', key: 'e004_detoured', value: true },
          { type: 'give_cultivation', value: 300 },
          { type: 'give_stone', value: 120 },
          { type: 'log', value: '你绕开兽潮，多走了两日路，也顺路捡了些散落灵材。' },
        ],
      },
      {
        id: 'e004_trap',
        text: '设陷阱引其自困',
        effects: [
          { type: 'flag_set', key: 'e004_trapped', value: true },
          { type: 'give_item', key: 'mat_yao_shou_pi', count: 4 },
          { type: 'give_stone', value: 260 },
          { type: 'log', value: '你用落石与藤索困住兽群前队，割了四张妖兽皮。' },
        ],
        reply: [
          { speaker: 'narration', text: '兽群后队绕过了陷阱。它们中有一头，回头看了你一眼。' },
        ],
      },
    ],
  },
  {
    id: 'e005_old_man_stone',
    chapter: 1,
    type: 'encounter',
    title: '神秘老者',
    trigger: 'stage',
    stageRange: [5, 30],
    weight: 12,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '道旁坐着个蓑衣老人，面前铺一块破布，布上只有一块黑黢黢的石头。',
      },
      { speaker: 'narration', text: '「两百灵石。有缘你自己看，无缘你也自己看。」' },
    ],
    choices: [
      {
        id: 'e005_buy',
        text: '买下石头',
        requirements: [{ type: 'item', key: 'stone', value: 200 }],
        effects: [
          { type: 'give_stone', value: -200 },
          { type: 'flag_set', key: 'e005_bought', value: true },
          { type: 'give_item', key: 'mat_tai_xu_kuang_shi', count: 1 },
          { type: 'give_item', key: 'mat_ling_shi_sui', count: 3 },
          { type: 'log', value: '你买下那块黑石，剖开一看，里头裹着一小块太虚矿。' },
        ],
        reply: [
          { speaker: 'narration', text: '老人收了灵石就走，蓑衣上连雨都没沾。' },
        ],
      },
      {
        id: 'e005_appraise',
        text: '先请人鉴定再定夺',
        effects: [
          { type: 'flag_set', key: 'e005_appraised', value: true },
          { type: 'give_stone', value: -60 },
          { type: 'give_item', key: 'mat_ling_shi_sui', count: 1 },
          { type: 'give_cultivation', value: 260 },
          { type: 'log', value: '鉴定师傅说那石头不值两百，但你顺手学了点看料的门道。' },
        ],
      },
      {
        id: 'e005_refuse',
        text: '摇头走开',
        effects: [
          { type: 'flag_set', key: 'e005_refused', value: true },
          { type: 'log', value: '你没有买那块石头。老人在你身后笑了一声。' },
        ],
      },
    ],
  },
  {
    id: 'e006_well_whisper',
    chapter: 1,
    type: 'encounter',
    title: '古井低语',
    trigger: 'stage',
    stageRange: [12, 34],
    weight: 12,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '荒村的井口盖着半块石板。你走近时，井底传来人声，很轻，像在喊救命。',
      },
      { speaker: 'narration', text: '井边的青苔是断的——有人常常站在这里，听。' },
    ],
    choices: [
      {
        id: 'e006_descend',
        text: '系绳下井',
        effects: [
          { type: 'flag_set', key: 'e006_well_down', value: true },
          { type: 'give_item', key: 'mat_gu_jing_ling_quan', count: 1 },
          { type: 'give_cultivation', value: 700 },
          { type: 'karma_add', key: 'immortalErosion', value: 1 },
          { type: 'log', value: '井底没有活人，只有一泓灵泉与一面刻满人名的石壁。' },
        ],
        reply: [
          { speaker: 'narration', text: '你取水时，石壁上新刻的那一行，正是你自己的名字。' },
        ],
      },
      {
        id: 'e006_seal',
        text: '搬石封井',
        effects: [
          { type: 'flag_set', key: 'e006_sealed', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_stone', value: 180 },
          { type: 'log', value: '你封死了那口井。井声在石板落下的那一刻停了。' },
        ],
        reply: [
          { speaker: 'narration', text: '夜里你梦见井上站着一个背影，它没有回头。' },
        ],
      },
      {
        id: 'e006_test',
        text: '投石试探',
        effects: [
          { type: 'flag_set', key: 'e006_probed', value: true },
          { type: 'give_item', key: 'mat_jing_di_gu', count: 1 },
          { type: 'flag_set', key: 'heart_demon_seed', value: 1 },
          { type: 'log', value: '石头落下去，没有回声。你听见有人在下面数数：一、二、三……' },
        ],
        reply: [
          { speaker: 'narration', text: '数到「七」时，声音停了。你发现自己也在心里数。' },
        ],
      },
    ],
  },
  {
    id: 'e007_wounded_fox',
    chapter: 1,
    type: 'encounter',
    title: '受伤灵狐',
    trigger: 'stage',
    stageRange: [10, 40],
    weight: 14,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '一只青灵狐倒在被夹断的灌木里，后腿陷在铁齿夹中，血把白毛浸成一缕缕。',
      },
      { speaker: 'narration', text: '它看见你，没有挣扎，只是把眼睛闭上了。' },
    ],
    choices: [
      {
        id: 'e007_heal',
        text: '掰开铁夹，替它敷药',
        effects: [
          { type: 'flag_set', key: 'e007_healed', value: true },
          { type: 'karma_add', key: 'yaozuFame', value: 2 },
          { type: 'give_item', key: 'mat_qing_hu_ling_mao', count: 2 },
          { type: 'give_cultivation', value: 400 },
          { type: 'unlock', key: 'yaozu_line' },
          { type: 'log', value: '你救下青灵狐。它临走前绕着你转了三圈，留下两缕灵毛。' },
        ],
        reply: [
          { speaker: 'narration', text: '灵狐消失在林间时，回头看了你一眼——那眼神不像兽。' },
        ],
      },
      {
        id: 'e007_capture',
        text: '活捉回去驯养',
        effects: [
          { type: 'flag_set', key: 'e007_captured', value: true },
          { type: 'karma_add', key: 'yaozuFame', value: -2 },
          { type: 'give_pet', key: 'pet_qingling_fox' },
          { type: 'log', value: '你用藤索缚住灵狐。它一路没叫，到洞府后才开始绝食。' },
        ],
        reply: [
          { speaker: 'narration', text: '第三日它终于吃了东西，却始终背对着你。' },
        ],
      },
      {
        id: 'e007_leave',
        text: '不插手，走开',
        effects: [
          { type: 'flag_set', key: 'e007_left', value: true },
          { type: 'give_cultivation', value: 260 },
          { type: 'log', value: '你走开了。林子很静，静得让人记不住路。' },
        ],
      },
    ],
  },
  {
    id: 'e008_roadside_corpse',
    chapter: 1,
    type: 'encounter',
    title: '路边尸体',
    trigger: 'stage',
    stageRange: [6, 28],
    weight: 13,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '驿道旁的草丛里躺着一名修士，储物袋还系在腰上，袋口完好。',
      },
      { speaker: 'narration', text: '他面色发青，嘴唇却是笑的。' },
    ],
    choices: [
      {
        id: 'e008_take',
        text: '取下储物袋',
        effects: [
          { type: 'flag_set', key: 'e008_looted', value: true },
          { type: 'give_stone', value: 420 },
          { type: 'give_item', key: 'mat_san_xiu_ling_pai', count: 1 },
          { type: 'log', value: '你取走储物袋，里头有灵石与一枚无名散修令牌。' },
        ],
        reply: [
          { speaker: 'narration', text: '袋底压着一张字条：「若见此字，速离此地。」字迹很新。' },
        ],
      },
      {
        id: 'e008_bury',
        text: '就地挖坑安葬',
        effects: [
          { type: 'flag_set', key: 'e008_buried', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 2 },
          { type: 'give_cultivation', value: 500 },
          { type: 'log', value: '你葬了那名修士，替他理好衣襟。心里那点烦乱，忽然散了。' },
        ],
        reply: [
          { speaker: 'narration', text: '填土时你摸到他颈后有一枚极小的针孔。' },
        ],
      },
      {
        id: 'e008_inspect',
        text: '细查死因',
        effects: [
          { type: 'flag_set', key: 'e008_clue', value: true },
          { type: 'give_item', key: 'mat_mi_hun_zhen', count: 1 },
          { type: 'karma_add', key: 'taixuAttention', value: 1 },
          { type: 'log', value: '你从他颈后取出一枚迷魂针，针尾刻着半个太虚纹。' },
        ],
        reply: [
          { speaker: 'narration', text: '你抬头四望。驿道上无人，风里有一点极淡的香气。' },
        ],
      },
    ],
  },
  {
    id: 'e009_two_cultivators',
    chapter: 2,
    type: 'encounter',
    title: '两修争宝',
    trigger: 'stage',
    stageRange: [4, 30],
    weight: 14,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '两名修士隔着一株琉璃草对峙。左边那个袖口破了，右边那个手里还攥着半截草根。',
      },
      { speaker: 'narration', text: '「我先见的。」「我先摘的。」两人同时看向你。' },
    ],
    choices: [
      {
        id: 'e009_first',
        text: '替先到者说话',
        effects: [
          { type: 'flag_set', key: 'e009_side_a', value: true },
          { type: 'give_stone', value: 300 },
          { type: 'give_item', key: 'mat_liu_li_cao', count: 1 },
          { type: 'log', value: '你替先到者说了句话。琉璃草归他，他分了你三成灵石。' },
        ],
        reply: [
          { speaker: 'narration', text: '败者一言不发地走了。你记住了他袖口的断线。' },
        ],
      },
      {
        id: 'e009_second',
        text: '替摘草者说话',
        effects: [
          { type: 'flag_set', key: 'e009_side_b', value: true },
          { type: 'give_item', key: 'mat_liu_li_cao', count: 2 },
          { type: 'log', value: '你替摘草者说了句话。他把草分你一半，另附一句谢。' },
        ],
      },
      {
        id: 'e009_mediate',
        text: '提议对半分',
        effects: [
          { type: 'flag_set', key: 'e009_mediated', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_item', key: 'mat_liu_li_cao', count: 1 },
          { type: 'relation_add', key: 'luo_wuyi', value: 3 },
          { type: 'log', value: '你把草从中剖开，一人一半。两人都骂了你，也都谢了你。' },
        ],
      },
      {
        id: 'e009_snatch',
        text: '趁乱夺草便走',
        effects: [
          { type: 'flag_set', key: 'e009_snatched', value: true },
          { type: 'karma_add', key: 'daoHeart', value: -1 },
          { type: 'karma_add', key: 'taixuAttention', value: 1 },
          { type: 'give_item', key: 'mat_liu_li_cao', count: 3 },
          { type: 'log', value: '你夺草而走。身后两句骂声叠在一起，你没回头。' },
        ],
      },
    ],
  },
  {
    id: 'e010_thunder_fire',
    chapter: 2,
    type: 'encounter',
    title: '天降雷火',
    trigger: 'stage',
    stageRange: [8, 40],
    weight: 12,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '天上一声闷响，一道紫雷劈在山脊，碎石与火雨溅开十里。',
      },
      { speaker: 'narration', text: '落点处有什么东西在发红，像一块还没凉透的铁。' },
    ],
    choices: [
      {
        id: 'e010_grab',
        text: '立刻冲上去取',
        effects: [
          { type: 'flag_set', key: 'e010_grabbed', value: true },
          { type: 'give_item', key: 'mat_lei_jie_can_tie', count: 2 },
          { type: 'flag_set', key: 'thunder_scar', value: 1 },
          { type: 'give_cultivation', value: 400 },
          { type: 'log', value: '你抢在雷气散尽前取走两块雷劫残铁，双臂焦了一层皮。' },
        ],
        reply: [
          { speaker: 'narration', text: '残铁入手发烫，你听见自己骨头里有嗡嗡的响声。' },
        ],
      },
      {
        id: 'e010_wait',
        text: '等雷散尽再取',
        effects: [
          { type: 'flag_set', key: 'e010_waited', value: true },
          { type: 'give_item', key: 'mat_lei_jie_can_tie', count: 1 },
          { type: 'give_stone', value: 260 },
          { type: 'log', value: '雷气散后，残铁只余一块。旁边多了几道别人的脚印。' },
        ],
      },
      {
        id: 'e010_skip',
        text: '不涉险地',
        effects: [
          { type: 'flag_set', key: 'e010_skipped', value: true },
          { type: 'give_cultivation', value: 240 },
          { type: 'log', value: '你退到远处。第二道雷落下时，山脊整片塌了。' },
        ],
      },
    ],
  },
  {
    id: 'e011_weeping_ghost',
    chapter: 2,
    type: 'encounter',
    title: '哭泣女鬼',
    trigger: 'stage',
    stageRange: [6, 34],
    weight: 11,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '月色下有女子蹲在坟前哭，哭声隔得很远也听得清。她没有影子。',
      },
      {
        speaker: 'narration',
        text: '她抬起头：「我的骨头被人拿去垫了路。你肯替我找回来么？」',
      },
    ],
    choices: [
      {
        id: 'e011_promise',
        text: '应下此事，替她寻骨',
        effects: [
          { type: 'flag_set', key: 'e011_promised', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'relation_add', key: 'luo_wuyi', value: 8 },
          { type: 'give_item', key: 'mat_gu_nu_lei_zhu', count: 1 },
          { type: 'log', value: '你应下女鬼的请求。她化成一粒泪珠，落在你掌心里。' },
        ],
        reply: [
          { speaker: 'narration', text: '泪珠冰冷。你听见它在你掌心轻轻说了一声「谢」。' },
        ],
      },
      {
        id: 'e011_release',
        text: '念往生咒超度她',
        effects: [
          { type: 'flag_set', key: 'e011_released', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 2 },
          { type: 'karma_add', key: 'youmingFame', value: 1 },
          { type: 'give_cultivation', value: 460 },
          { type: 'log', value: '你念咒超度了她。她的影子在月光里慢慢变淡，没有再回头。' },
        ],
      },
      {
        id: 'e011_strike',
        text: '挥剑斩之',
        effects: [
          { type: 'flag_set', key: 'e011_attacked', value: true },
          { type: 'karma_add', key: 'demonThought', value: 1 },
          { type: 'karma_add', key: 'youmingFame', value: -2 },
          { type: 'give_item', key: 'mat_yin_hun_sui', count: 1 },
          { type: 'log', value: '你斩了那只女鬼。她散开前说：我只是想回家。' },
        ],
      },
    ],
  },
  {
    id: 'e012_sealed_box',
    chapter: 2,
    type: 'encounter',
    title: '封印木盒',
    trigger: 'stage',
    stageRange: [10, 44],
    weight: 11,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '废宅的供桌上摆着一只乌木盒，盒面贴满黄符，符上朱砂还新。',
      },
      { speaker: 'narration', text: '盒盖上刻着四个字：莫开。以及一行更小的字：开了别怪我。' },
    ],
    choices: [
      {
        id: 'e012_open',
        text: '揭符开盒',
        effects: [
          { type: 'flag_set', key: 'e012_opened', value: true },
          { type: 'give_treasure', key: 'tr_qingmu_gourd' },
          { type: 'karma_add', key: 'immortalErosion', value: 1 },
          { type: 'log', value: '盒中躺着一枚温润古珠。你握住它时，指尖闪过一片陌生的星空。' },
        ],
        reply: [
          { speaker: 'narration', text: '珠子很暖。夜里你梦见有人在你耳边数着星子。' },
        ],
      },
      {
        id: 'e012_take',
        text: '不启封，整盒带走',
        effects: [
          { type: 'flag_set', key: 'e012_carried', value: true },
          { type: 'give_item', key: 'mat_feng_yin_mu_he', count: 1 },
          { type: 'give_stone', value: 300 },
          { type: 'log', value: '你把封盒整个收进行囊。此后它偶尔会在夜里轻轻响一声。' },
        ],
      },
      {
        id: 'e012_report',
        text: '交给宗门处置',
        effects: [
          { type: 'flag_set', key: 'e012_reported', value: true },
          { type: 'karma_add', key: 'qingxuanFame', value: 2 },
          { type: 'relation_add', key: 'shen_qinghe', value: 6 },
          { type: 'give_stone', value: 500 },
          { type: 'log', value: '你把封盒上交。执事看了一眼就说：这是魂器，交得好。' },
        ],
      },
    ],
  },
  {
    id: 'e013_drunken_daoist',
    chapter: 2,
    type: 'encounter',
    title: '醉道人',
    trigger: 'stage',
    stageRange: [8, 42],
    weight: 12,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '一个道人抱着空酒葫芦躺在树杈上，见你路过，翻身坐起。',
      },
      { speaker: 'narration', text: '「有酒么？有酒，我教你这世上最不值钱、也最有用的一门诀。」' },
    ],
    choices: [
      {
        id: 'e013_give_wine',
        text: '去邻近村口买一囊酒给他',
        requirements: [{ type: 'item', key: 'stone', value: 100 }],
        effects: [
          { type: 'give_stone', value: -100 },
          { type: 'flag_set', key: 'e013_wine', value: true },
          { type: 'give_technique', key: 'tech_wuxing_lunzhuan' },
          { type: 'relation_add', key: 'luo_qi', value: 5 },
          { type: 'log', value: '道人饮尽一囊酒，口述一段口诀，末了又说：记不住就算了。' },
        ],
        reply: [
          { speaker: 'narration', text: '他念得东倒西歪，你偏偏一字不落记住了。' },
        ],
      },
      {
        id: 'e013_steal',
        text: '趁他醉，偷看他的功法',
        effects: [
          { type: 'flag_set', key: 'e013_stolen', value: true },
          { type: 'karma_add', key: 'daoHeart', value: -1 },
          { type: 'give_technique', key: 'tech_wuxing_lunzhuan' },
          { type: 'give_cultivation', value: 300 },
          { type: 'log', value: '你偷看了他的功法。道人翻了个身，酒后哼了一句：偷就偷了。' },
        ],
      },
      {
        id: 'e013_leave',
        text: '不搭理，继续赶路',
        effects: [
          { type: 'flag_set', key: 'e013_left', value: true },
          { type: 'give_cultivation', value: 180 },
          { type: 'log', value: '你走开了。道人从树上丢下一句：赶路的人，一辈子都在赶路。' },
        ],
      },
    ],
  },
  {
    id: 'e014_demon_caravan',
    chapter: 3,
    type: 'encounter',
    title: '妖族商队',
    trigger: 'stage',
    stageRange: [3, 40],
    weight: 11,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '山谷里走着一支商队，驮兽的角上缠着红绳，赶队的人眼底都是竖瞳。',
      },
      { speaker: 'narration', text: '领头的老者看你一眼：「人族。买，还是走？」' },
    ],
    choices: [
      {
        id: 'e014_trade',
        text: '以灵石交易',
        requirements: [{ type: 'item', key: 'stone', value: 400 }],
        effects: [
          { type: 'give_stone', value: -400 },
          { type: 'flag_set', key: 'e014_traded', value: true },
          { type: 'give_item', key: 'mat_yao_jing_gu', count: 2 },
          { type: 'give_item', key: 'mat_yue_hua_cao', count: 3 },
          { type: 'karma_add', key: 'yaozuFame', value: 1 },
          { type: 'unlock', key: 'yaozu_line' },
          { type: 'log', value: '你用四百灵石换得妖晶骨与月华草。老者多看了你一眼。' },
        ],
        reply: [
          { speaker: 'narration', text: '老者收灵石时，手背上的鳞一闪：「下回，报玄羽的名。」' },
        ],
      },
      {
        id: 'e014_raid',
        text: '动手夺取商货',
        effects: [
          { type: 'flag_set', key: 'e014_raided', value: true },
          { type: 'karma_add', key: 'yaozuFame', value: -3 },
          { type: 'give_stone', value: 900 },
          { type: 'give_item', key: 'mat_yao_jing_gu', count: 3 },
          { type: 'log', value: '你劫了妖族商队。老者退走前说：人族还是人族。' },
        ],
        reply: [
          { speaker: 'narration', text: '驮兽死了一头。血渗进土里，很久都没有蚂蚁来。' },
        ],
      },
      {
        id: 'e014_escort',
        text: '护送商队过岭',
        effects: [
          { type: 'flag_set', key: 'e014_escorted', value: true },
          { type: 'karma_add', key: 'yaozuFame', value: 3 },
          { type: 'relation_add', key: 'xuan_yu', value: 12 },
          { type: 'give_item', key: 'mat_yue_hua_cao', count: 2 },
          { type: 'unlock', key: 'yaozu_line' },
          { type: 'log', value: '你护送商队过了黑风岭。分别时，车队里一个少年朝你挥了挥手。' },
        ],
        reply: [
          { speaker: 'narration', text: '那少年背上有一对没长成的羽骨。他叫玄羽。' },
        ],
      },
    ],
  },
  {
    id: 'e015_herb_and_snake',
    chapter: 2,
    type: 'encounter',
    title: '仙草与毒蛇',
    trigger: 'stage',
    stageRange: [14, 46],
    weight: 12,
    once: true,
    lines: [
      {
        speaker: 'narration',
        text: '崖壁上生着一株九叶灵芝，灵芝下面盘着一条青鳞巨蟒，蟒首正对着你。',
      },
      { speaker: 'narration', text: '它没有动。它只是把身子又盘紧了一圈。' },
    ],
    choices: [
      {
        id: 'e015_kill',
        text: '强杀妖兽取草',
        effects: [
          { type: 'flag_set', key: 'e015_killed', value: true },
          { type: 'give_item', key: 'mat_jiu_ye_ling_zhi', count: 1 },
          { type: 'give_item', key: 'mat_qing_lin_pi', count: 2 },
          { type: 'log', value: '你斩了那条青蟒，取了灵芝与两张鳞皮。' },
        ],
        reply: [
          { speaker: 'narration', text: '蟒腹里有一只未消化的鸟。鸟爪上还系着一根红绳。' },
        ],
      },
      {
        id: 'e015_lure',
        text: '引开它再采',
        effects: [
          { type: 'flag_set', key: 'e015_lured', value: true },
          { type: 'give_item', key: 'mat_jiu_ye_ling_zhi', count: 1 },
          { type: 'give_cultivation', value: 320 },
          { type: 'log', value: '你用死兔引开青蟒，采走灵芝。它回来时，崖上已经空了。' },
        ],
      },
      {
        id: 'e015_leave',
        text: '放弃，退下山崖',
        effects: [
          { type: 'flag_set', key: 'e015_left', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'log', value: '你退了。巨蟒低下头，又把眼睛闭上了。' },
        ],
      },
    ],
  },
  {
    id: 'e016_broken_bridge',
    chapter: 2,
    type: 'encounter',
    title: '断桥',
    trigger: 'stage',
    stageRange: [12, 44],
    weight: 10,
    once: true,
    lines: [
      { speaker: 'narration', text: '山涧上的石桥断了三丈。对岸石台上摆着一只上锁的铜箱。' },
      { speaker: 'narration', text: '涧水很急，水下有什么东西的影子一闪而过。' },
    ],
    choices: [
      {
        id: 'e016_fly',
        text: '御气踏空跃过',
        requirements: [{ type: 'karma_gte', key: 'daoHeart', value: 1 }],
        effects: [
          { type: 'flag_set', key: 'e016_leapt', value: true },
          { type: 'give_stone', value: 700 },
          { type: 'give_item', key: 'mat_gu_suo_yao_shi', count: 1 },
          { type: 'log', value: '你一跃过涧，开了铜箱。箱中是灵石与一把古锁钥匙。' },
        ],
      },
      {
        id: 'e016_build',
        text: '伐木修桥',
        effects: [
          { type: 'flag_set', key: 'e016_built', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_stone', value: 400 },
          { type: 'log', value: '你花了两日修好断桥。过路的凡人对你行了个礼。' },
        ],
        reply: [
          { speaker: 'narration', text: '桥修好那日，铜箱上的锁自己开了。里面只有一句话：有桥自通。' },
        ],
      },
      {
        id: 'e016_detour',
        text: '绕远路下山',
        effects: [
          { type: 'flag_set', key: 'e016_detoured', value: true },
          { type: 'give_cultivation', value: 240 },
          { type: 'log', value: '你绕了半日山路，铜箱始终在对岸。' },
        ],
      },
    ],
  },
  {
    id: 'e017_spirit_spring',
    chapter: 2,
    type: 'encounter',
    title: '灵气泉眼',
    trigger: 'stage',
    stageRange: [8, 46],
    weight: 13,
    once: true,
    lines: [
      { speaker: 'narration', text: '石缝里涌出一线乳白泉水，落地即成薄雾，吸一口胸腹发暖。' },
      { speaker: 'narration', text: '这样的泉眼，在野外撑不过一夜就会被人堵死。' },
    ],
    choices: [
      {
        id: 'e017_cultivate',
        text: '就地打坐吸纳',
        effects: [
          { type: 'flag_set', key: 'e017_cultivated', value: true },
          { type: 'give_cultivation', value: 1400 },
          { type: 'log', value: '你在泉眼旁坐了一夜，修为涨得比闭关十日还快。' },
        ],
      },
      {
        id: 'e017_bottle',
        text: '装瓶带走',
        effects: [
          { type: 'flag_set', key: 'e017_bottled', value: true },
          { type: 'give_item', key: 'mat_ling_quan_shui', count: 3 },
          { type: 'log', value: '你装了三瓶灵泉。泉水离了石缝，温度一点点冷下去。' },
        ],
      },
      {
        id: 'e017_seal',
        text: '封存坐标，记入舆图',
        effects: [
          { type: 'flag_set', key: 'e017_sealed', value: true },
          { type: 'give_item', key: 'mat_ling_quan_zuo_biao', count: 1 },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'log', value: '你把泉眼坐标封进舆图，留待他日。' },
        ],
      },
    ],
  },
  {
    id: 'e018_amnesiac',
    chapter: 3,
    type: 'encounter',
    title: '失忆修士',
    trigger: 'stage',
    stageRange: [5, 48],
    weight: 10,
    once: true,
    lines: [
      { speaker: 'narration', text: '溪边坐着个衣衫整齐的修士，眼神空茫，反复摩挲着自己空空的剑鞘。' },
      { speaker: 'narration', text: '「我叫什么……我想不起来了。」' },
    ],
    choices: [
      {
        id: 'e018_take_in',
        text: '带他同行',
        effects: [
          { type: 'flag_set', key: 'e018_taken_in', value: true },
          { type: 'relation_add', key: 'luo_qi', value: 4 },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_item', key: 'mat_wu_ming_jian_qiao', count: 1 },
          { type: 'log', value: '你收留了那名失忆修士。他每日只做一件事：擦那只空剑鞘。' },
        ],
        reply: [
          { speaker: 'narration', text: '第七日清晨，他忽然说：我记得我要杀一个人。然后就不说了。' },
        ],
      },
      {
        id: 'e018_search',
        text: '搜他的身',
        effects: [
          { type: 'flag_set', key: 'e018_searched', value: true },
          { type: 'give_item', key: 'mat_wu_ming_ling_pai', count: 1 },
          { type: 'give_stone', value: 260 },
          { type: 'log', value: '你搜出一枚无字令牌。他任你搜，全程没有反应。' },
        ],
      },
      {
        id: 'e018_hand_in',
        text: '送往宗门安置',
        effects: [
          { type: 'flag_set', key: 'e018_handed', value: true },
          { type: 'karma_add', key: 'qingxuanFame', value: 2 },
          { type: 'relation_add', key: 'shen_qinghe', value: 5 },
          { type: 'log', value: '你把失忆修士交给青玄剑宗。执事见他剑鞘，脸色变了。' },
        ],
      },
    ],
  },
  {
    id: 'e019_black_market_invite',
    chapter: 3,
    type: 'encounter',
    title: '黑市邀请',
    trigger: 'stage',
    stageRange: [6, 48],
    weight: 11,
    once: true,
    lines: [
      { speaker: 'narration', text: '一名挑担货郎擦身而过，往你袖里塞了块木牌，牌上只有「三更」二字。' },
      { speaker: 'narration', text: '他头也不回，混进人堆里就没了影。' },
    ],
    choices: [
      {
        id: 'e019_go',
        text: '三更赴约',
        requirements: [{ type: 'item', key: 'stone', value: 200 }],
        effects: [
          { type: 'flag_set', key: 'e019_went', value: true },
          { type: 'give_item', key: 'mat_hei_shi_dan_yao', count: 1 },
          { type: 'give_stone', value: -200 },
          { type: 'unlock', key: 'black_market' },
          { type: 'log', value: '你赴了黑市。摊子上卖的东西，坊面上一样都见不到。' },
        ],
      },
      {
        id: 'e019_report',
        text: '把木牌交给执法堂',
        effects: [
          { type: 'flag_set', key: 'e019_reported', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_stone', value: 350 },
          { type: 'log', value: '执法堂收了木牌，赏你灵石，却没人去查那个货郎。' },
        ],
      },
      {
        id: 'e019_ignore',
        text: '丢进河里',
        effects: [
          { type: 'flag_set', key: 'e019_ignored', value: true },
          { type: 'give_cultivation', value: 200 },
          { type: 'log', value: '木牌沉下去时，河面浮起一层很薄的墨色。' },
        ],
      },
    ],
  },
  {
    id: 'e020_heart_demon',
    chapter: 3,
    type: 'encounter',
    title: '心魔幻象',
    trigger: 'stage',
    stageRange: [16, 48],
    weight: 12,
    once: true,
    lines: [
      { speaker: 'narration', text: '雾里忽然站着一个你。他手里握着你最想拿到的那件东西，正朝你笑。' },
      { speaker: 'narration', text: '「伸手啊。这不就是你一路走来的目的？」' },
    ],
    choices: [
      {
        id: 'e020_accept',
        text: '伸手接下',
        effects: [
          { type: 'flag_set', key: 'e020_accepted', value: true },
          { type: 'karma_add', key: 'demonThought', value: 2 },
          { type: 'give_stone', value: 800 },
          { type: 'give_item', key: 'mat_xin_mo_jing', count: 1 },
          { type: 'log', value: '你接下了那件东西。雾散后手上空空，心里却多了一块石头。' },
        ],
      },
      {
        id: 'e020_cut',
        text: '一剑斩破幻象',
        effects: [
          { type: 'flag_set', key: 'e020_cut', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 2 },
          { type: 'give_cultivation', value: 900 },
          { type: 'log', value: '你斩了那个自己。剑过之处，雾里传出一声和你一样的叹息。' },
        ],
      },
      {
        id: 'e020_watch',
        text: '退后观察，不出手',
        effects: [
          { type: 'flag_set', key: 'e020_watched', value: true },
          { type: 'karma_add', key: 'taixuAttention', value: 1 },
          { type: 'give_item', key: 'mat_huan_jing_can_pian', count: 1 },
          { type: 'log', value: '你退后三步。那个你没有动，只是慢慢转过身，露出背后的东西。' },
        ],
        reply: [
          { speaker: 'narration', text: '他背后没有影子，只有一道细长的裂痕。' },
        ],
      },
    ],
  },
  {
    id: 'e021_battlefield_weapons',
    chapter: 3,
    type: 'encounter',
    title: '古战场兵器',
    trigger: 'stage',
    stageRange: [10, 48],
    weight: 11,
    once: true,
    lines: [
      { speaker: 'narration', text: '一片缓坡上插满了残剑，剑锋朝上，密得像一畦庄稼。' },
      { speaker: 'narration', text: '没有坟，没有碑。这些剑是有人一柄一柄插下去的。' },
    ],
    choices: [
      {
        id: 'e021_pull',
        text: '拔一柄最直的剑',
        effects: [
          { type: 'flag_set', key: 'e021_pulled', value: true },
          { type: 'give_equipment', quality: 'blue', key: 'weapon' },
          { type: 'give_cultivation', value: 400 },
          { type: 'log', value: '你拔出一柄剑。剑身离土的瞬间，四周的残剑齐齐颤了一下。' },
        ],
      },
      {
        id: 'e021_worship',
        text: '向剑丛行礼',
        effects: [
          { type: 'flag_set', key: 'e021_worshipped', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 2 },
          { type: 'give_cultivation', value: 700 },
          { type: 'log', value: '你行了一礼。风穿过剑丛，声音像很多人在回礼。' },
        ],
      },
      {
        id: 'e021_collect',
        text: '收拢碎铁',
        effects: [
          { type: 'flag_set', key: 'e021_collected', value: true },
          { type: 'give_item', key: 'mat_jian_tie_sui', count: 6 },
          { type: 'log', value: '你收了一大包碎铁。这些铁比寻常精铁重得多。' },
        ],
      },
    ],
  },
  {
    id: 'e022_wandering_alchemist',
    chapter: 3,
    type: 'encounter',
    title: '流浪炼丹师',
    trigger: 'stage',
    stageRange: [8, 48],
    weight: 11,
    once: true,
    lines: [
      { speaker: 'narration', text: '一个背着破丹炉的老者在路边叹气：「就差一味寒心草，这炉丹就废了。」' },
      { speaker: 'narration', text: '炉里飘出的药香，闻着就让人心静。' },
    ],
    choices: [
      {
        id: 'e022_give',
        text: '把身上的灵草给他',
        requirements: [{ type: 'item', key: 'mat_ling_cao', value: 3 }],
        effects: [
          { type: 'consume_item', key: 'mat_ling_cao', count: 3 },
          { type: 'flag_set', key: 'e022_gave', value: true },
          { type: 'give_item', key: 'pill_ning_shen_dan', count: 2 },
          { type: 'give_technique', key: 'tech_qingmu_changsheng' },
          { type: 'relation_add', key: 'luo_wuyi', value: 4 },
          { type: 'log', value: '老者收下灵草，回赠你两枚凝神丹与半篇丹方。' },
        ],
        reply: [
          { speaker: 'narration', text: '丹成时炉盖轻响，香气散开，路边的枯草直起腰来。' },
        ],
      },
      {
        id: 'e022_ask',
        text: '索要丹方为报',
        effects: [
          { type: 'flag_set', key: 'e022_asked', value: true },
          { type: 'give_technique', key: 'tech_qingmu_changsheng' },
          { type: 'karma_add', key: 'daoHeart', value: -1 },
          { type: 'log', value: '你讨了丹方。老者笑了笑就给了，笑得有点淡。' },
        ],
      },
      {
        id: 'e022_refuse',
        text: '摇头走开',
        effects: [
          { type: 'flag_set', key: 'e022_refused', value: true },
          { type: 'give_cultivation', value: 200 },
          { type: 'log', value: '你没有停留。走远之后，药香还是跟着你走了一里。' },
        ],
      },
    ],
  },
  {
    id: 'e023_wandering_smith',
    chapter: 3,
    type: 'encounter',
    title: '流浪炼器师',
    trigger: 'stage',
    stageRange: [14, 48],
    weight: 11,
    once: true,
    lines: [
      { speaker: 'narration', text: '道旁支着铁砧，一个赤膊汉子正锤打一块暗红矿料。火花溅到草上，草就焦了。' },
      { speaker: 'narration', text: '「缺一块灵矿。有矿，我给你打一件，工钱不收。」' },
    ],
    choices: [
      {
        id: 'e023_give_ore',
        text: '给出灵矿，请他打造',
        requirements: [{ type: 'item', key: 'mat_ling_shi_sui', value: 2 }],
        effects: [
          { type: 'consume_item', key: 'mat_ling_shi_sui', count: 2 },
          { type: 'flag_set', key: 'e023_forged', value: true },
          { type: 'give_equipment', quality: 'purple', key: 'bracer' },
          { type: 'log', value: '他替你打了一副护腕，淬火时用的是自己的血。' },
        ],
        reply: [
          { speaker: 'narration', text: '他递给你东西时，手上全是旧疤，一层压着一层。' },
        ],
      },
      {
        id: 'e023_spar',
        text: '与他比试一场',
        effects: [
          { type: 'flag_set', key: 'e023_sparred', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_equipment', quality: 'blue', key: 'weapon' },
          { type: 'give_cultivation', value: 500 },
          { type: 'log', value: '你与他空手拆了三十招。他输了，把新打的兵器塞给你。' },
        ],
      },
      {
        id: 'e023_buy',
        text: '直接买他的成品',
        requirements: [{ type: 'item', key: 'stone', value: 500 }],
        effects: [
          { type: 'give_stone', value: -500 },
          { type: 'flag_set', key: 'e023_bought', value: true },
          { type: 'give_equipment', quality: 'blue', key: 'belt' },
          { type: 'log', value: '你买下一件成品腰带。他反复叮嘱：别用灵力硬灌，会裂。' },
        ],
      },
    ],
  },
  {
    id: 'e024_mysterious_egg',
    chapter: 3,
    type: 'encounter',
    title: '神秘蛋',
    trigger: 'stage',
    stageRange: [12, 48],
    weight: 10,
    once: true,
    lines: [
      { speaker: 'narration', text: '巢里卧着一枚巴掌大的蛋，蛋壳上有淡淡的云纹，摸上去是温的。' },
      { speaker: 'narration', text: '巢边的枯枝是新的。母兽，随时可能回来。' },
    ],
    choices: [
      {
        id: 'e024_hatch',
        text: '带回洞府孵化',
        effects: [
          { type: 'flag_set', key: 'e024_hatched', value: true },
          { type: 'give_pet', key: 'pet_xuanjia_turtle' },
          { type: 'karma_add', key: 'yaozuFame', value: -1 },
          { type: 'log', value: '你带回那枚蛋。第七夜它裂了，出来的东西先看你，再看这间屋子。' },
        ],
        reply: [
          { speaker: 'narration', text: '幼兽睁眼第一件事，是叼住你的衣角不放。' },
        ],
      },
      {
        id: 'e024_sell',
        text: '带去坊市卖掉',
        effects: [
          { type: 'flag_set', key: 'e024_sold', value: true },
          { type: 'give_stone', value: 900 },
          { type: 'log', value: '你卖了那枚蛋。买主是个沉默的妖族妇人，付钱极爽快。' },
        ],
      },
      {
        id: 'e024_study',
        text: '留在原地观察研究',
        effects: [
          { type: 'flag_set', key: 'e024_studied', value: true },
          { type: 'give_item', key: 'mat_yun_wen_dan_ke', count: 1 },
          { type: 'give_cultivation', value: 420 },
          { type: 'log', value: '你守在巢外一日一夜，记下蛋壳云纹的走向，取走一片碎壳。' },
        ],
        reply: [
          { speaker: 'narration', text: '入夜时母兽回来了。它没有看你，只是把蛋护在腹下。' },
        ],
      },
    ],
  },
  {
    id: 'e025_bandit_ambush',
    chapter: 2,
    type: 'encounter',
    title: '劫修埋伏',
    trigger: 'stage',
    stageRange: [5, 40],
    weight: 12,
    once: true,
    lines: [
      { speaker: 'narration', text: '路中央躺着个「重伤」的人，正朝你伸手呼救。他身下的血，颜色太鲜了。' },
      { speaker: 'narration', text: '两侧林子里，鸟一只都不叫。' },
    ],
    choices: [
      {
        id: 'e025_counter',
        text: '假装靠近，反手先发制人',
        effects: [
          { type: 'flag_set', key: 'e025_countered', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_stone', value: 600 },
          { type: 'give_equipment', quality: 'green', key: 'boots' },
          { type: 'log', value: '你反手掀了那场埋伏，从劫修身上搜出一副好靴子。' },
        ],
      },
      {
        id: 'e025_pay',
        text: '丢下灵石买路',
        requirements: [{ type: 'item', key: 'stone', value: 300 }],
        effects: [
          { type: 'give_stone', value: -300 },
          { type: 'flag_set', key: 'e025_paid', value: true },
          { type: 'log', value: '你留下三百灵石。那「重伤」的人立刻站了起来，走得比谁都快。' },
        ],
      },
      {
        id: 'e025_flee',
        text: '转身退回原路',
        effects: [
          { type: 'flag_set', key: 'e025_fled', value: true },
          { type: 'give_cultivation', value: 220 },
          { type: 'log', value: '你退回三里。身后的林子里，有人骂了一句。' },
        ],
      },
    ],
  },
  {
    id: 'e026_shrine_altar',
    chapter: 1,
    type: 'encounter',
    title: '山神祭坛',
    trigger: 'stage',
    stageRange: [5, 30],
    weight: 11,
    once: true,
    lines: [
      { speaker: 'narration', text: '坛上绑着一头活羊，几个村民跪着磕头，嘴里念着「山君息怒」。' },
      { speaker: 'narration', text: '坛后的神像没有脸，只有一团凿平的凹痕。' },
    ],
    choices: [
      {
        id: 'e026_stop',
        text: '喝止村民，解开祭礼',
        effects: [
          { type: 'flag_set', key: 'e026_stopped', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 2 },
          { type: 'relation_add', key: 'su_wan', value: 6 },
          { type: 'give_item', key: 'mat_shan_shen_xiang_hui', count: 2 },
          { type: 'log', value: '你拦下了祭礼。村民骂你不敬神，散开时却都松了口气。' },
        ],
      },
      {
        id: 'e026_accept',
        text: '收下祭礼，替他们走一趟山',
        effects: [
          { type: 'flag_set', key: 'e026_accepted', value: true },
          { type: 'give_stone', value: 320 },
          { type: 'give_item', key: 'mat_xiang_huo_zhi', count: 1 },
          { type: 'log', value: '你收了祭礼，往山里走了一遭，把一头游荡的妖物赶远了些。' },
        ],
      },
      {
        id: 'e026_investigate',
        text: '细查祭坛与神像',
        effects: [
          { type: 'flag_set', key: 'e026_investigated', value: true },
          { type: 'give_item', key: 'mat_wu_mian_shen_xiang_tuo', count: 1 },
          { type: 'karma_add', key: 'taixuAttention', value: 1 },
          { type: 'log', value: '你拓下神像背后的刻字，认出其中两个是符纹，不是祷文。' },
        ],
      },
    ],
  },
  {
    id: 'e027_chess_game',
    chapter: 4,
    type: 'encounter',
    title: '神秘棋局',
    trigger: 'stage',
    stageRange: [18, 48],
    weight: 10,
    once: true,
    lines: [
      { speaker: 'narration', text: '石亭里摆着一副棋盘，黑白子自行落子，啪、啪，一声接一声。' },
      { speaker: 'narration', text: '对面没有人。但你坐下时，白子停了。' },
    ],
    choices: [
      {
        id: 'e027_play',
        text: '执黑与它对弈',
        effects: [
          { type: 'flag_set', key: 'e027_played', value: true },
          { type: 'give_cultivation', value: 1300 },
          { type: 'give_item', key: 'mat_qi_pu_can_juan', count: 1 },
          { type: 'log', value: '你与空盘对弈一夜。中盘时你忽然明白，棋盘正是这座山的阵法。' },
        ],
        reply: [
          { speaker: 'narration', text: '你投子认负。棋盘上所有白子齐齐一转，指向北面。' },
        ],
      },
      {
        id: 'e027_break',
        text: '打乱棋局',
        effects: [
          { type: 'flag_set', key: 'e027_broke', value: true },
          { type: 'karma_add', key: 'demonThought', value: 1 },
          { type: 'give_stone', value: 500 },
          { type: 'log', value: '你搅乱了棋盘。棋子散落时，石亭里响起一声很轻的叹息。' },
        ],
      },
      {
        id: 'e027_record',
        text: '只记下棋路',
        effects: [
          { type: 'flag_set', key: 'e027_recorded', value: true },
          { type: 'give_item', key: 'mat_zhen_tu_can_ye', count: 1 },
          { type: 'karma_add', key: 'jadeResonance', value: 1 },
          { type: 'log', value: '你把棋路一一抄下。抄到第七十三手时，笔尖自己停住了。' },
        ],
      },
    ],
  },
  {
    id: 'e028_possession_spirit',
    chapter: 4,
    type: 'encounter',
    title: '夺舍残魂',
    trigger: 'stage',
    stageRange: [22, 50],
    weight: 10,
    once: true,
    lines: [
      { speaker: 'narration', text: '一枚玉坠从土里滚出来，坠中一缕灰气直往你眉心钻。' },
      { speaker: 'narration', text: '「小友，识海借我一住，我传你一门通天的法。」' },
    ],
    choices: [
      {
        id: 'e028_suppress',
        text: '运功镇压',
        effects: [
          { type: 'flag_set', key: 'e028_suppressed', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_cultivation', value: 800 },
          { type: 'log', value: '你以神念镇住那缕残魂，炼化了它散出来的魂力。' },
        ],
      },
      {
        id: 'e028_bargain',
        text: '与它谈条件',
        effects: [
          { type: 'flag_set', key: 'e028_bargained', value: true },
          { type: 'give_technique', key: 'tech_ranshou_modian' },
          { type: 'karma_add', key: 'demonThought', value: 1 },
          { type: 'karma_add', key: 'immortalErosion', value: 1 },
          { type: 'log', value: '它口述了一篇夺舍术，你记下之后立刻封了玉坠。' },
        ],
      },
      {
        id: 'e028_devour',
        text: '以神识吞了它',
        effects: [
          { type: 'flag_set', key: 'e028_devoured', value: true },
          { type: 'karma_add', key: 'demonThought', value: 2 },
          { type: 'give_cultivation', value: 1600 },
          { type: 'give_item', key: 'mat_can_hun_jing', count: 1 },
          { type: 'log', value: '你吞了那缕残魂。它的记忆碎片在你识海里翻了很多天。' },
        ],
      },
    ],
  },
  {
    id: 'e029_plant_spirit',
    chapter: 3,
    type: 'encounter',
    title: '灵植化形',
    trigger: 'stage',
    stageRange: [8, 44],
    weight: 10,
    once: true,
    lines: [
      { speaker: 'narration', text: '一株小木灵抱着一片枯叶，躲在被砍断的树桩后面发抖。' },
      { speaker: 'narration', text: '它看见你，把整株身子缩成了一根枝条。' },
    ],
    choices: [
      {
        id: 'e029_protect',
        text: '替它立一圈木栅',
        effects: [
          { type: 'flag_set', key: 'e029_protected', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'karma_add', key: 'yaozuFame', value: 2 },
          { type: 'give_item', key: 'mat_mu_ling_zhi', count: 2 },
          { type: 'log', value: '你替小木灵围了栅栏。它从枝头摘下一片叶，塞进你手里。' },
        ],
      },
      {
        id: 'e029_refine',
        text: '炼作药材',
        effects: [
          { type: 'flag_set', key: 'e029_refined', value: true },
          { type: 'karma_add', key: 'yaozuFame', value: -2 },
          { type: 'karma_add', key: 'daoHeart', value: -1 },
          { type: 'give_item', key: 'mat_ling_mu_xin', count: 3 },
          { type: 'give_stone', value: 400 },
          { type: 'log', value: '你把小木灵炼成了三份灵木心。它的叶子到最后还是绿的。' },
        ],
      },
      {
        id: 'e029_send',
        text: '送往百草谷',
        effects: [
          { type: 'flag_set', key: 'e029_sent', value: true },
          { type: 'karma_add', key: 'qingxuanFame', value: 1 },
          { type: 'give_stone', value: 300 },
          { type: 'log', value: '你把小木灵送去百草谷。谷中人说：这东西若是活了百年，会记你的恩。' },
        ],
      },
    ],
  },
  {
    id: 'e030_village_relic',
    chapter: 4,
    type: 'encounter',
    title: '青石村旧物',
    trigger: 'stage',
    stageRange: [30, 50],
    weight: 9,
    once: true,
    conditions: [{ type: 'flag', key: 'leave_qingshi', value: true }],
    lines: [
      { speaker: 'narration', text: '行囊底压着一块磨得光滑的木牌，是林伯当年挂在你颈上的，上面刻着「凡尘」。' },
      { speaker: 'narration', text: '木牌侧面有一道新裂痕，像是被什么东西硌开的。' },
    ],
    choices: [
      {
        id: 'e030_keep',
        text: '重新系回颈上',
        effects: [
          { type: 'flag_set', key: 'e030_kept', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 2 },
          { type: 'give_cultivation', value: 600 },
          { type: 'log', value: '你把木牌系回颈上。此后打坐时，心里总有一点稳当。' },
        ],
      },
      {
        id: 'e030_refine',
        text: '以灵力祭炼它',
        effects: [
          { type: 'flag_set', key: 'e030_refined', value: true },
          { type: 'give_equipment', quality: 'purple', key: 'necklace' },
          { type: 'karma_add', key: 'immortalErosion', value: 1 },
          { type: 'log', value: '你把凡木炼成了一件佩饰。它的木纹里，浮出几道不属于木头的纹路。' },
        ],
        reply: [
          { speaker: 'narration', text: '祭炼到第七日，木牌上的两个字自己变亮了。' },
        ],
      },
      {
        id: 'e030_return',
        text: '托人送回青石村',
        effects: [
          { type: 'flag_set', key: 'e030_returned', value: true },
          { type: 'relation_add', key: 'lin_bo', value: 10 },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_item', key: 'mat_xiang_tu', count: 2 },
          { type: 'log', value: '你托商队把木牌送回青石村。半月后带回一包祖坟上的香土。' },
        ],
      },
    ],
  },
]
