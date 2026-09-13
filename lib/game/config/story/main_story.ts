import type { StoryNode } from '../../types'

/* ------------------------------------------------------------------ *
 * 第 1~4 章主线节点。id 与地图配置 mapStage.storyId 一一对应；
 * stageRange 使用地图内关卡序号（每图 50 关）。
 * ------------------------------------------------------------------ */

export const STORY_NODES: StoryNode[] = [
  {
    id: 'qs_01_missing',
    chapter: 1,
    type: 'dialogue',
    title: '山中失踪',
    trigger: 'stage',
    stageRange: [3, 3],
    once: true,
    npc: 'zhao_shi',
    lines: [
      { speaker: 'narration', text: '青石村的第三夜，村口老槐树上又挂起一盏白纸灯。第七个人不见了。' },
      { speaker: 'lin_bo', text: '又是后山。凡尘，别去。今年山里不太平。' },
      { speaker: 'player', text: '林伯，赵石哥已经进山两回了。这回我跟着。' },
      { speaker: 'zhao_shi', text: '跟紧我。见了不对的东西，别逞能。' },
      {
        speaker: 'narration',
        text: '林深处一道暗红的影子贴着树影一闪而过。那不是狼——狼没有这样一双眼睛。',
      },
      { speaker: 'zhao_shi', text: '……那东西，不像是畜生该有的眼神。' },
    ],
    choices: [
      {
        id: 'c_chase',
        text: '循着血迹追下去',
        effects: [
          { type: 'flag_set', key: 'qs_traced_beast', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'relation_add', key: 'zhao_shi', value: 5 },
          { type: 'give_stone', value: 200 },
          {
            type: 'log',
            value: '你循血迹追入后山，看清了那道影子掠过的方式——快得不像活物。',
          },
        ],
        reply: [
          { speaker: 'zhao_shi', text: '你脚底下倒是稳。往后巡山，你走前头。' },
          { speaker: 'player', text: '它踩过的地方，草是焦的。' },
        ],
      },
      {
        id: 'c_fallback',
        text: '先护送村民退回村口',
        effects: [
          { type: 'flag_set', key: 'qs_cautious', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_cultivation', value: 300 },
          { type: 'relation_add', key: 'lin_bo', value: 4 },
          { type: 'log', value: '你选择先护住活人。归途无事，心底却记下了那片焦草。' },
        ],
        reply: [{ speaker: 'lin_bo', text: '活着回来，比什么都要紧。' }],
      },
    ],
  },
  {
    id: 'qs_02_jade',
    chapter: 1,
    type: 'choice',
    title: '山匪尸上的古玉',
    trigger: 'stage',
    stageRange: [10, 10],
    once: true,
    npc: 'su_wan',
    lines: [
      { speaker: 'narration', text: '山匪横在乱石堆里，血尚未冷透。他五指抠进泥里，死死攥着一样东西。' },
      { speaker: 'player', text: '一枚玉。……是温的。' },
      { speaker: 'su_wan', text: '死人攥得这样紧的东西，多半不干净。' },
      { speaker: 'player', text: '可它在我掌心，一直是热的。' },
      {
        speaker: 'narration',
        text: '入夜，你梦见一座倒悬云海的宫殿。有人自天上开口：「九劫未尽……此世，又是谁得了它？」',
      },
    ],
    choices: [
      {
        id: 'c_elder',
        text: '交给村中老人辨认',
        effects: [
          { type: 'flag_set', key: 'jade_given_elder', value: true },
          { type: 'karma_add', key: 'jadeResonance', value: 1 },
          { type: 'relation_add', key: 'lin_bo', value: 6 },
          { type: 'give_item', key: 'mat_chen_xiang_mu', count: 2 },
          {
            type: 'log',
            value: '村中最老的人捧着古玉看了半炷香，只说：这东西，不该落在山里。',
          },
        ],
        reply: [
          { speaker: 'narration', text: '老人指尖发抖，从柜底翻出一片同样色泽的碎屑递给你。' },
          { speaker: 'lin_bo', text: '三十年前，也有个修士上山来过。他没下来。' },
        ],
      },
      {
        id: 'c_keep',
        text: '自己收下，只字不提',
        effects: [
          { type: 'flag_set', key: 'jade_kept', value: true },
          { type: 'karma_add', key: 'jadeResonance', value: 2 },
          { type: 'karma_add', key: 'taixuAttention', value: 1 },
          { type: 'flag_set', key: 'jade_warm_nights', value: 3 },
          { type: 'log', value: '你把古玉贴身收起。此后三夜，它都在发烫。' },
        ],
        reply: [
          { speaker: 'narration', text: '玉贴着心口，像一颗很小的、别人的心跳。' },
          { speaker: 'player', text: '……你到底想告诉我什么？' },
        ],
      },
      {
        id: 'c_monk',
        text: '交给路过的那名修士',
        effects: [
          { type: 'flag_set', key: 'jade_given_cultivator', value: true },
          { type: 'karma_add', key: 'taixuAttention', value: 2 },
          { type: 'karma_add', key: 'qingxuanFame', value: 1 },
          { type: 'relation_add', key: 'shen_qinghe', value: 3 },
          { type: 'give_treasure', key: 'tres_yin_yu_fu' },
          {
            type: 'log',
            value: '那修士接过古玉，神色骤变，反手塞你一道阴玉符便匆匆离去。',
          },
        ],
        reply: [
          {
            speaker: 'narration',
            text: '那人一身青灰道袍，袖口绣着一枚太虚纹。他走得极快，像在逃。',
          },
          { speaker: 'player', text: '他连名字都没留。' },
        ],
      },
    ],
  },
  {
    id: 'qs_03_shrine',
    chapter: 1,
    type: 'dialogue',
    title: '山神庙地下',
    trigger: 'stage',
    stageRange: [25, 25],
    once: true,
    npc: 'su_wan',
    lines: [
      {
        speaker: 'narration',
        text: '山神庙断了香火多年，神像脸上落满灰。可泥地上有新脚印，一直走进神像背后。',
      },
      { speaker: 'su_wan', text: '这后面是空的。我小时候躲雨，听见过里头有喘气声。' },
      { speaker: 'player', text: '推开。' },
      {
        speaker: 'narration',
        text: '石壁后是一间丈许见方的暗室，七名失踪村民挤在墙角，气息尚存。',
      },
      { speaker: 'zhao_shi', text: '他们身上没伤……只是睡着了一样。' },
      { speaker: 'player', text: '神像里头有东西。' },
      {
        speaker: 'narration',
        text: '神像腹中空腔里嵌着一枚刻满符纹的铁钉。符纹是新的，刀口也是新的——这不是神迹，是人为。',
      },
      { speaker: 'su_wan', text: '这钉子……在驱赶它们。' },
    ],
    choices: [
      {
        id: 'c_take_nail',
        text: '取下御兽符带走',
        effects: [
          { type: 'flag_set', key: 'has_yushou_fu', value: true },
          { type: 'give_treasure', key: 'tres_yu_shou_fu' },
          { type: 'karma_add', key: 'jadeResonance', value: 1 },
          { type: 'log', value: '御兽符离了神像，庙外的兽吼在这一刻齐齐停了。' },
        ],
        reply: [{ speaker: 'su_wan', text: '它们停了……符在你手上。' }],
      },
      {
        id: 'c_leave_nail',
        text: '原地封存，只拓下符纹',
        effects: [
          { type: 'flag_set', key: 'shrine_sealed', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_item', key: 'mat_fu_wen_tuo_pian', count: 1 },
          { type: 'relation_add', key: 'zhao_shi', value: 4 },
          { type: 'log', value: '你用拓片记下符纹，把神像重新封好，留它继续镇着。' },
        ],
        reply: [
          { speaker: 'zhao_shi', text: '留着它镇着？……也好。可这山里，怕是还有别人。' },
        ],
      },
    ],
  },
  {
    id: 'qs_04_depart',
    chapter: 1,
    type: 'choice',
    title: '御兽钉与离村',
    trigger: 'stage',
    stageRange: [50, 50],
    once: true,
    npc: 'lin_bo',
    lines: [
      {
        speaker: 'narration',
        text: '血眼山君倒在山涧里，猩红的眼睛慢慢失了光。你从它颈后拔出一枚三寸铁钉。',
      },
      { speaker: 'player', text: '和山神庙里那枚，一模一样。' },
      { speaker: 'su_wan', text: '有人在拿钉子驱使它们。山里，村外，到处都有人在。' },
      { speaker: 'lin_bo', text: '你要走。' },
      { speaker: 'player', text: '林伯，我得知道是谁在钉它们。' },
      {
        speaker: 'lin_bo',
        text: '……十三年前我从雪地里抱你回来时，你也是这么看着我。',
      },
      {
        speaker: 'narration',
        text: '老人转身进屋，再出来时手里多了一柄磨得发亮的柴刀与一包干粮。',
      },
      { speaker: 'lin_bo', text: '走吧。别学那些修士，把命看得比人轻。' },
    ],
    choices: [
      {
        id: 'c_bring_nail',
        text: '带着御兽钉上路',
        effects: [
          { type: 'flag_set', key: 'leave_qingshi', value: true },
          { type: 'flag_set', key: 'nail_carried', value: true },
          { type: 'karma_add', key: 'taixuAttention', value: 1 },
          { type: 'give_item', key: 'mat_yu_shou_ding', count: 1 },
          { type: 'give_equipment', quality: 'green', key: 'weapon' },
          { type: 'unlock', key: 'chapter_2' },
          {
            type: 'log',
            value: '你带着御兽钉离开青石村。此物会替你找到钉它的人。',
          },
        ],
        reply: [
          { speaker: 'su_wan', text: '我替你收着药囊。……早些回来。' },
          {
            speaker: 'narration',
            text: '出村时你回了一次头。老槐树上的白纸灯，已经取下来了。',
          },
        ],
      },
      {
        id: 'c_burn_nail',
        text: '焚钉明志，空手上路',
        effects: [
          { type: 'flag_set', key: 'leave_qingshi', value: true },
          { type: 'flag_set', key: 'nail_burned', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 2 },
          { type: 'give_cultivation', value: 800 },
          { type: 'give_pet', key: 'pet_qing_mu_lu' },
          { type: 'unlock', key: 'chapter_2' },
          {
            type: 'log',
            value: '御兽钉在火里烧了整夜，纹路寸寸断裂。你心里的那点火，反倒亮了些。',
          },
        ],
        reply: [
          {
            speaker: 'narration',
            text: '灰烬被风卷起时，一只青鹿自林中走出，低头蹭了蹭你的手背。',
          },
          { speaker: 'player', text: '你也要走？' },
        ],
      },
    ],
  },
  {
    id: 'hf_01_shen',
    chapter: 2,
    type: 'choice',
    title: '三具尸体与一个活人',
    trigger: 'stage',
    stageRange: [5, 5],
    once: true,
    npc: 'shen_qinghe',
    lines: [
      {
        speaker: 'narration',
        text: '黑风岭的雾是灰的。三具邪修尸体倒在溪边，血把水染成了暗紫。',
      },
      {
        speaker: 'narration',
        text: '溪石上靠着一名年轻女修，唇色发青，胸口开着一道冒着黑气的伤口。',
      },
      { speaker: 'shen_qinghe', text: '……别过来。' },
      { speaker: 'player', text: '你中了阴煞毒。再拖半个时辰，那三具尸体就要多一个伴。' },
      { speaker: 'shen_qinghe', text: '你一个凡人，懂什么毒。' },
      {
        speaker: 'player',
        text: '我不懂毒。可我懂事。他们三个是冲你来的，那你的仇家还没到齐。',
      },
      {
        speaker: 'narration',
        text: '她的手一直按在剑上，指节泛白——剑柄已经裂了。',
      },
    ],
    choices: [
      {
        id: 'c_save',
        text: '用随身药草替她逼毒',
        effects: [
          { type: 'flag_set', key: 'saved_shen', value: true },
          { type: 'relation_add', key: 'shen_qinghe', value: 25 },
          { type: 'npc_state', key: 'shen_qinghe', value: 'healed' },
          { type: 'karma_add', key: 'qingxuanFame', value: 1 },
          { type: 'give_item', key: 'mat_qinghe_yu_fu', count: 1 },
          {
            type: 'log',
            value: '你救下沈青禾。她留下一句：云泽坊市，凭玉符找我。',
          },
        ],
        reply: [
          { speaker: 'shen_qinghe', text: '……沈青禾，青玄剑宗。' },
          { speaker: 'shen_qinghe', text: '这枚玉符你收着。云泽坊市，我欠你一个人情。' },
        ],
      },
      {
        id: 'c_search',
        text: '先搜那三具尸体',
        effects: [
          { type: 'flag_set', key: 'searched_shen', value: true },
          { type: 'relation_add', key: 'shen_qinghe', value: -15 },
          { type: 'npc_state', key: 'shen_qinghe', value: 'wary' },
          { type: 'give_item', key: 'mat_yin_sha_gu', count: 2 },
          { type: 'give_stone', value: 400 },
          {
            type: 'log',
            value: '你翻了那三具尸体。女修一直看着你，没说话，眼神却冷了下去。',
          },
        ],
        reply: [
          { speaker: 'shen_qinghe', text: '手很快。可惜算错了时候。' },
          {
            speaker: 'narration',
            text: '她撑着断剑站起来，一步一步走进雾里，没再回头。',
          },
        ],
      },
      {
        id: 'c_leave',
        text: '转身离开，不沾因果',
        effects: [
          { type: 'flag_set', key: 'left_shen', value: true },
          { type: 'karma_add', key: 'daoHeart', value: -1 },
          { type: 'relation_add', key: 'shen_qinghe', value: -10 },
          { type: 'npc_state', key: 'shen_qinghe', value: 'unknown' },
          { type: 'give_cultivation', value: 400 },
          { type: 'log', value: '你走开了。雾里有剑鸣声，很轻，像谁在咬牙。' },
        ],
        reply: [
          {
            speaker: 'narration',
            text: '走出半里，身后传来一声极轻的剑鸣，随即被雾吞了。',
          },
        ],
      },
    ],
  },
  {
    id: 'hf_02_luoqi',
    chapter: 2,
    type: 'dialogue',
    title: '散修罗七的消息',
    trigger: 'stage',
    stageRange: [30, 30],
    once: true,
    npc: 'luo_qi',
    lines: [
      {
        speaker: 'narration',
        text: '黑风岭半腰有间漏风的山棚，棚里烧着一小堆火。一个瘦高的散修正烤手。',
      },
      { speaker: 'luo_qi', text: '别拔家伙。我这人只会卖消息，不会打架。' },
      { speaker: 'player', text: '黑风道人。' },
      {
        speaker: 'luo_qi',
        text: '痛快。那老道近来在收凡人魂魄，一魂三石，岭下已经空了两个村子。',
      },
      { speaker: 'player', text: '他要魂做什么？' },
      {
        speaker: 'luo_qi',
        text: '炼兽魂。钉驱兽、幡收魂——钉与幡本是一套。你手上那枚，就是他这套里掉出来的。',
      },
      {
        speaker: 'narration',
        text: '火堆啪地爆了一声。罗七盯着你的袖子，笑得很淡。',
      },
      {
        speaker: 'luo_qi',
        text: '洞府在后山断崖下，第三道裂缝。我欠人灵石，话说完了——你也该走了。',
      },
    ],
    choices: [
      {
        id: 'c_pay_info',
        text: '付他一百灵石，买下洞府舆图',
        requirements: [{ type: 'item', key: 'stone', value: 100 }],
        effects: [
          { type: 'give_stone', value: -100 },
          { type: 'flag_set', key: 'luoqi_map', value: true },
          { type: 'relation_add', key: 'luo_qi', value: 10 },
          { type: 'karma_add', key: 'qingxuanFame', value: 1 },
          { type: 'unlock', key: 'map_danger_sense' },
          {
            type: 'log',
            value: '罗七收了灵石，把洞府舆图塞给你，顺口报了自己欠债的数目。',
          },
        ],
        reply: [
          {
            speaker: 'luo_qi',
            text: '断崖下三条岔道，走中间那条。左边那条……喂过三个人了。',
          },
        ],
      },
      {
        id: 'c_promise',
        text: '应下替他还债的承诺',
        effects: [
          { type: 'flag_set', key: 'luoqi_debt_owed', value: true },
          { type: 'relation_add', key: 'luo_qi', value: 20 },
          { type: 'give_item', key: 'mat_hei_feng_lin', count: 2 },
          {
            type: 'log',
            value: '你应下罗七的债。他把舆图与两片黑风鳞一并交到你手上。',
          },
        ],
        reply: [
          { speaker: 'luo_qi', text: '……你倒是敢。行，我这条命，先记在你账上。' },
        ],
      },
      {
        id: 'c_decline',
        text: '不接话，直接走人',
        effects: [
          { type: 'flag_set', key: 'luoqi_refused', value: true },
          { type: 'relation_add', key: 'luo_qi', value: -5 },
          { type: 'log', value: '你没有接他的话。罗七在身后笑了笑：那你慢慢找。' },
        ],
        reply: [
          { speaker: 'luo_qi', text: '啧。断崖那道裂缝，你可别走左边。' },
        ],
      },
    ],
  },
  {
    id: 'hf_03_blackwind',
    chapter: 2,
    type: 'choice',
    title: '黑风道人的三个结局',
    trigger: 'stage',
    stageRange: [50, 50],
    once: true,
    npc: 'heifeng_daoren',
    lines: [
      {
        speaker: 'narration',
        text: '洞府深处，魂幡垂下黑气，幡面浮着几十张扭曲的脸。黑风道人跌坐在幡下，道袍尽碎。',
      },
      { speaker: 'heifeng_daoren', text: '你手里那枚钉……是我的。' },
      { speaker: 'player', text: '你钉了多少头畜生，又收了多少条人命。' },
      {
        speaker: 'heifeng_daoren',
        text: '畜生？你当我愿意？太虚盟给我钉，我替它找魂。我取的是凡人，不是修士——凡人，谁记得？',
      },
      {
        speaker: 'narration',
        text: '他咳出一口黑血，从怀中摸出一卷薄薄的帛书，摊在地上。',
      },
      {
        speaker: 'heifeng_daoren',
        text: '《残篇·噬魂诀》。拿去。你若不修，总会有人修。',
      },
      {
        speaker: 'narration',
        text: '魂幡上那些脸无声地张着嘴。你听见其中一张，在叫一个人的名字。',
      },
    ],
    choices: [
      {
        id: 'c_kill',
        text: '一剑杀之，焚幡断业',
        effects: [
          { type: 'flag_set', key: 'heifeng_dead', value: true },
          { type: 'npc_state', key: 'heifeng_daoren', value: 'dead' },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'karma_add', key: 'qingxuanFame', value: 3 },
          { type: 'karma_add', key: 'demonThought', value: -1 },
          { type: 'give_treasure', key: 'tres_hun_fan' },
          {
            type: 'log',
            value: '黑风道人死于你剑下。魂幡焚尽，幡上数十张脸在火里散开。',
          },
        ],
        reply: [
          { speaker: 'narration', text: '火起时，幡上那些嘴终于都闭上了。' },
          { speaker: 'player', text: '欠的，总要还。' },
        ],
      },
      {
        id: 'c_accept',
        text: '接过噬魂诀残篇',
        effects: [
          { type: 'flag_set', key: 'took_shihun', value: true },
          { type: 'karma_add', key: 'demonThought', value: 1 },
          { type: 'karma_add', key: 'daoHeart', value: -1 },
          { type: 'give_technique', key: 'tech_canpian_shihun_jue' },
          { type: 'npc_state', key: 'heifeng_daoren', value: 'crippled' },
          {
            type: 'log',
            value: '你收下噬魂诀残篇。帛书到手时，指尖凉了一瞬。',
          },
        ],
        reply: [
          { speaker: 'heifeng_daoren', text: '好。好……你比他们认得清。' },
          {
            speaker: 'narration',
            text: '帛书头一行写着：魂者，人之余也。取余而不取人，则无咎。',
          },
        ],
      },
      {
        id: 'c_spare',
        text: '废去其修为，留他一条命',
        effects: [
          { type: 'flag_set', key: 'heifeng_crippled', value: true },
          { type: 'npc_state', key: 'heifeng_daoren', value: 'crippled' },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'karma_add', key: 'taixuAttention', value: 1 },
          { type: 'relation_add', key: 'shen_qinghe', value: 5 },
          { type: 'unlock', key: 'karma_panel' },
          {
            type: 'log',
            value: '你废了黑风道人的修为。他活了下来，眼里那点恨意被你记住了。',
          },
        ],
        reply: [
          { speaker: 'heifeng_daoren', text: '不杀我……你会后悔。' },
          {
            speaker: 'player',
            text: '我要的不是你的命，是你嘴里那句「太虚盟」。',
          },
        ],
      },
    ],
  },
  {
    id: 'yz_01_market',
    chapter: 3,
    type: 'dialogue',
    title: '初入坊市',
    trigger: 'stage',
    stageRange: [10, 10],
    once: true,
    npc: 'shen_qinghe',
    conditions: [{ type: 'flag', key: 'leave_qingshi', value: true }],
    lines: [
      {
        speaker: 'narration',
        text: '云泽坊市悬在三山之间的云桥上，灯笼串成一条河。叫卖声里夹着灵石的脆响。',
      },
      { speaker: 'player', text: '一块灵石，能换三十斤米？' },
      { speaker: 'shen_qinghe', text: '在这里，米是最不值钱的东西。' },
      {
        speaker: 'narration',
        text: '一名执事拦住去路，手按在你的肩上。坊市不认凡人的脸——除非有人替你担着。',
      },
      { speaker: 'shen_qinghe', text: '他是我带的。' },
      {
        speaker: 'narration',
        text: '她递出一枚玉符，执事神色一变，侧身让开。符上刻着一个「沈」字，压着青玄剑徽。',
      },
      { speaker: 'shen_qinghe', text: '临时身份，七日为期。这七日你若惹事，我担。' },
      { speaker: 'player', text: '为什么帮我？' },
      { speaker: 'shen_qinghe', text: '因为你救我的时候，没问我是谁。' },
    ],
    choices: [
      {
        id: 'c_ask_taixu',
        text: '问她太虚盟的事',
        effects: [
          { type: 'flag_set', key: 'knows_taixu_rumor', value: true },
          { type: 'relation_add', key: 'shen_qinghe', value: 8 },
          { type: 'karma_add', key: 'taixuAttention', value: 1 },
          {
            type: 'log',
            value: '沈青禾说：太虚盟在找一样东西，找了不止百年。',
          },
        ],
        reply: [
          {
            speaker: 'shen_qinghe',
            text: '我师父失踪前，最后查的就是他们。这事你别深问——问了，就有人盯你。',
          },
        ],
      },
      {
        id: 'c_ask_trade',
        text: '先摸清坊市的买卖门道',
        effects: [
          { type: 'flag_set', key: 'knows_market', value: true },
          { type: 'give_stone', value: 300 },
          { type: 'give_item', key: 'mat_yun_ze_ling_sha', count: 3 },
          {
            type: 'log',
            value: '你摸清了坊市的规矩：灵石、丹药、矿材，各有各的盘子。',
          },
        ],
        reply: [
          {
            speaker: 'narration',
            text: '半日下来，你已经能一眼分出灵石的成色。',
          },
        ],
      },
    ],
  },
  {
    id: 'yz_02_ali',
    chapter: 3,
    type: 'choice',
    title: '偷灵石的少女',
    trigger: 'stage',
    stageRange: [40, 40],
    once: true,
    npc: 'a_li',
    lines: [
      {
        speaker: 'narration',
        text: '人群一挤，你腰间的灵石袋轻了。你反手抓住一只细瘦的手腕。',
      },
      { speaker: 'a_li', text: '放手！放开我……' },
      { speaker: 'player', text: '你手上有药味。是给谁煎的？' },
      {
        speaker: 'a_li',
        text: '……我哥。他躺在客栈后巷，烧了七天。药铺说，要三块灵石才肯给药。',
      },
      {
        speaker: 'narration',
        text: '她没有挣扎，只是瞪着你。那双眼睛里有一点极淡的、不属于人族的金线。',
      },
      { speaker: 'a_li', text: '你要抓我去执法堂，就快点。我哥等不了。' },
    ],
    choices: [
      {
        id: 'c_help_ali',
        text: '给她灵石，还替她请了医修',
        requirements: [{ type: 'item', key: 'stone', value: 300 }],
        effects: [
          { type: 'flag_set', key: 'ali_helped', value: true },
          { type: 'give_stone', value: -300 },
          { type: 'relation_add', key: 'a_li', value: 30 },
          { type: 'karma_add', key: 'yaozuFame', value: 2 },
          { type: 'npc_state', key: 'a_li', value: 'trusted' },
          { type: 'give_item', key: 'mat_yao_xue_jing', count: 1 },
          { type: 'unlock', key: 'yaozu_line' },
          {
            type: 'log',
            value: '你替阿梨付了药钱。她哥哥退了烧，醒来第一句话是问她有没有偷东西。',
          },
        ],
        reply: [
          { speaker: 'a_li', text: '……你为什么？我偷了你的。' },
          { speaker: 'player', text: '因为你没跑。' },
          {
            speaker: 'a_li',
            text: '我叫阿梨。你要找黑市的路，我知道三条。',
          },
        ],
      },
      {
        id: 'c_hand_over',
        text: '把她交给执法堂',
        effects: [
          { type: 'flag_set', key: 'ali_handed_over', value: true },
          { type: 'relation_add', key: 'a_li', value: -30 },
          { type: 'npc_state', key: 'a_li', value: 'captured' },
          { type: 'karma_add', key: 'daoHeart', value: -1 },
          { type: 'give_stone', value: 500 },
          { type: 'give_item', key: 'mat_ling_shi_jing', count: 2 },
          { type: 'unlock', key: 'market' },
          {
            type: 'log',
            value: '执法堂赏了你五百灵石。阿梨被带走时没有回头，只把那只药包捏碎了。',
          },
        ],
        reply: [
          {
            speaker: 'narration',
            text: '执法堂的赏钱沉甸甸的。你走出一段路，才想起她哥哥还在后巷。',
          },
        ],
      },
      {
        id: 'c_buy_info',
        text: '买下她手里的消息',
        requirements: [{ type: 'item', key: 'stone', value: 150 }],
        effects: [
          { type: 'flag_set', key: 'ali_sold_info', value: true },
          { type: 'give_stone', value: -150 },
          { type: 'relation_add', key: 'a_li', value: 10 },
          { type: 'npc_state', key: 'a_li', value: 'informant' },
          { type: 'unlock', key: 'black_market' },
          { type: 'give_item', key: 'mat_hei_shi_ling_fu', count: 1 },
          {
            type: 'log',
            value: '阿梨收了灵石，画给你一张黑市暗号图，末了说：我哥要是死了，我会恨你。',
          },
        ],
        reply: [
          {
            speaker: 'a_li',
            text: '黑市在城南废丹炉底下，入夜开一刻钟。暗号是「三更问炉」。',
          },
        ],
      },
    ],
  },
  {
    id: 'yz_03_auction',
    chapter: 3,
    type: 'choice',
    title: '第二枚残片',
    trigger: 'stage',
    stageRange: [50, 50],
    once: true,
    npc: 'gu_changfeng',
    conditions: [{ type: 'flag', key: 'leave_qingshi', value: true }],
    lines: [
      {
        speaker: 'narration',
        text: '拍卖行的铜钟敲了三下。托盘上摆着一枚巴掌大的玉片，边缘断口新而齐。',
      },
      {
        speaker: 'narration',
        text: '你怀里的古玉忽然烫了一下——和你梦里那声叹息，是同一个温度。',
      },
      { speaker: 'player', text: '……它在认它。' },
      {
        speaker: 'gu_changfeng',
        text: '太虚盟，顾长风。此物我出三千灵石。诸位，还请行个方便。',
      },
      {
        speaker: 'narration',
        text: '满场无声。执事手中木槌抬起，又停在半空——他在等一个能压住顾长风的人开口。',
      },
      { speaker: 'gu_changfeng', text: '怎么，还有人要争？' },
    ],
    choices: [
      {
        id: 'c_bid',
        text: '倾灵石竞价',
        requirements: [{ type: 'item', key: 'stone', value: 3000 }],
        effects: [
          { type: 'give_stone', value: -3000 },
          { type: 'karma_add', key: 'jadeShards', value: 1 },
          { type: 'karma_add', key: 'jadeResonance', value: 2 },
          { type: 'karma_add', key: 'taixuAttention', value: 3 },
          { type: 'relation_add', key: 'gu_changfeng', value: -10 },
          { type: 'flag_set', key: 'owns_jade_shard', value: true },
          {
            type: 'log',
            value: '你以三千灵石拍下古玉残片。顾长风看了你很久，记下了你的脸。',
          },
        ],
        reply: [
          { speaker: 'gu_changfeng', text: '……好胆量。留个名字。' },
          {
            speaker: 'narration',
            text: '残片到手，与你的古玉隔着衣袖轻轻一响，像两片骨头对上。',
          },
        ],
      },
      {
        id: 'c_observe',
        text: '不出手，记住买家与来路',
        effects: [
          { type: 'flag_set', key: 'watched_auction', value: true },
          { type: 'relation_add', key: 'gu_changfeng', value: 5 },
          { type: 'karma_add', key: 'taixuAttention', value: 1 },
          { type: 'give_item', key: 'mat_pai_mai_xing_pai', count: 1 },
          {
            type: 'log',
            value: '你没有举牌。你记住了顾长风，也记住了那枚残片的断口形状。',
          },
        ],
        reply: [
          {
            speaker: 'narration',
            text: '木槌落下。残片被锦盒收走时，顾长风回头扫了一眼全场——目光在你身上停了一瞬。',
          },
        ],
      },
      {
        id: 'c_rumor',
        text: '散场后找情报贩子打听太虚盟',
        requirements: [{ type: 'item', key: 'stone', value: 200 }],
        effects: [
          { type: 'give_stone', value: -200 },
          { type: 'flag_set', key: 'knows_taixu_hunt', value: true },
          { type: 'karma_add', key: 'taixuAttention', value: 2 },
          { type: 'give_item', key: 'mat_mi_xin_jian', count: 1 },
          {
            type: 'log',
            value: '情报贩子说：太虚盟找这种玉，找了数百年，找的不是玉，是门。',
          },
        ],
        reply: [
          {
            speaker: 'narration',
            text: '贩子又叮嘱一句：别在坊市里叫「界玦」这两个字。叫了，就有人来。',
          },
        ],
      },
    ],
  },
  {
    id: 'lx_01_ruins',
    chapter: 4,
    type: 'dialogue',
    title: '古修洞府',
    trigger: 'stage',
    stageRange: [20, 20],
    once: true,
    npc: 'shen_qinghe',
    lines: [
      {
        speaker: 'narration',
        text: '落霞山脉的红叶下压着一层旧阵。你踩错一步，山壁裂开一道门。',
      },
      { speaker: 'player', text: '有人住过这里。很久以前。' },
      {
        speaker: 'narration',
        text: '洞中三重：前庭是塌了半边的石桌，中庭是一畦荒了不知多少年的药田，最深处的石台上盘着一具枯骨。',
      },
      { speaker: 'shen_qinghe', text: '药田的土被人翻过。他临死前还在种。' },
      {
        speaker: 'narration',
        text: '石壁上刻着几行小字，刀痕由深到浅，像是写了很久：',
      },
      {
        speaker: 'narration',
        text: '「吾与陈兄同入此山，得筑基丹一枚。吾杀之。丹成，道不成。此后三十年，药田长草。」',
      },
      {
        speaker: 'shen_qinghe',
        text: '他后来一直没有结丹。杀友取丹，取到的是丹药，丢的是路。',
      },
    ],
    choices: [
      {
        id: 'c_take_relics',
        text: '收走遗物与完整丹药',
        effects: [
          { type: 'flag_set', key: 'looted_ruins', value: true },
          { type: 'karma_add', key: 'daoHeart', value: -1 },
          { type: 'give_stone', value: 600 },
          { type: 'give_item', key: 'mat_zhu_ji_ling_cao', count: 2 },
          { type: 'give_equipment', quality: 'blue', key: 'jade' },
          {
            type: 'log',
            value: '你带走了洞中遗物，也把那位古修的名字一并带走了。',
          },
        ],
        reply: [
          { speaker: 'shen_qinghe', text: '……东西你拿。但把名字刻上，别让他烂在这里。' },
        ],
      },
      {
        id: 'c_bury',
        text: '替他收骨立碑，药田留下',
        effects: [
          { type: 'flag_set', key: 'buried_ancient', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 2 },
          { type: 'give_cultivation', value: 1200 },
          { type: 'relation_add', key: 'shen_qinghe', value: 8 },
          { type: 'give_item', key: 'mat_gu_xiu_liu_yan', count: 1 },
          {
            type: 'log',
            value: '你埋了那具枯骨，在石上刻了他的名字。风过药田，草叶齐齐伏了一寸。',
          },
        ],
        reply: [
          {
            speaker: 'narration',
            text: '立碑之后的第三日，你在打坐时忽然想通了一处关窍——像是有人在你耳边轻轻点了一句。',
          },
        ],
      },
    ],
  },
  {
    id: 'lx_02_stele',
    chapter: 4,
    type: 'choice',
    title: '剑碑共鸣',
    trigger: 'stage',
    stageRange: [45, 45],
    once: true,
    npc: 'shen_qinghe',
    lines: [
      {
        speaker: 'narration',
        text: '洞府最深处立着一块无字剑碑，碑面被剑气切出千百道浅痕。你走近时，怀里的古玉震了一下。',
      },
      {
        speaker: 'narration',
        text: '碑上那些浅痕忽然亮起，连成一片残破的画面：一道横贯天穹的裂痕，裂痕之下，山塌海枯。',
      },
      { speaker: 'player', text: '那是什么……天碎了？' },
      {
        speaker: 'shen_qinghe',
        text: '断天之劫。宗门典籍里只写了四个字，没有一个字讲清它是什么。',
      },
      {
        speaker: 'narration',
        text: '碑前另有一具骸骨，盘坐端正，肋骨间夹着一枚剑穗。骨是白的，没有伤——他是坐化的。',
      },
    ],
    choices: [
      {
        id: 'c_bury_stele',
        text: '安葬骸骨，恭敬三拜',
        effects: [
          { type: 'flag_set', key: 'stele_buried', value: true },
          { type: 'karma_add', key: 'daoHeart', value: 2 },
          { type: 'karma_add', key: 'jadeResonance', value: 1 },
          { type: 'give_cultivation', value: 1500 },
          { type: 'relation_add', key: 'shen_qinghe', value: 6 },
          { type: 'give_item', key: 'mat_jian_sui', count: 1 },
          {
            type: 'log',
            value: '你葬了那位坐化的剑修。三拜之后，碑上剑痕自行合拢了一半。',
          },
        ],
        reply: [
          {
            speaker: 'shen_qinghe',
            text: '我师门有一句话说，剑碑无字，因为话都刻在拜它的人心里。',
          },
        ],
      },
      {
        id: 'c_search_stele',
        text: '搜检骸骨与碑缝',
        effects: [
          { type: 'flag_set', key: 'stele_searched', value: true },
          { type: 'karma_add', key: 'daoHeart', value: -1 },
          { type: 'give_item', key: 'mat_jian_xin_yu', count: 1 },
          { type: 'give_stone', value: 800 },
          { type: 'give_equipment', quality: 'blue', key: 'weapon' },
          {
            type: 'log',
            value: '你在碑缝里摸到一枚剑心玉，又在骸骨下翻出一柄未锈的古剑。',
          },
        ],
        reply: [
          {
            speaker: 'shen_qinghe',
            text: '……你连死人的东西都不放过。不过，这剑确实是好剑。',
          },
        ],
      },
      {
        id: 'c_meditate_stele',
        text: '盘坐碑前参悟剑痕',
        effects: [
          { type: 'flag_set', key: 'stele_insight', value: true },
          { type: 'karma_add', key: 'jadeResonance', value: 2 },
          { type: 'give_technique', key: 'tech_wuming_jianzhang_shang' },
          { type: 'give_cultivation', value: 900 },
          { type: 'unlock', key: 'sword_insight' },
          {
            type: 'log',
            value: '你参悟剑痕三日，得《无名剑章·上卷》。碑上裂痕，自此与你剑势同向。',
          },
        ],
        reply: [
          {
            speaker: 'narration',
            text: '收功时天已黄昏。你抬手虚划，指尖带出一线极细的剑鸣。',
          },
          { speaker: 'shen_qinghe', text: '这一剑……不是我教你的。' },
        ],
      },
    ],
  },
  {
    id: 'lx_03_xiewuchen',
    chapter: 4,
    type: 'choice',
    title: '谢无尘',
    trigger: 'stage',
    stageRange: [50, 50],
    once: true,
    npc: 'xie_wuchen',
    lines: [
      {
        speaker: 'narration',
        text: '你出洞府时，一名白衣剑修正倚在洞口老树上擦剑。他脚边的落霞红叶，已经被剑气削成了粉。',
      },
      { speaker: 'xie_wuchen', text: '碑里的东西，你得了。' },
      { speaker: 'player', text: '你是谁。' },
      {
        speaker: 'xie_wuchen',
        text: '青玄剑宗，谢无尘。那块剑碑是宗门遗物，我找了三年。',
      },
      {
        speaker: 'narration',
        text: '他抬剑，剑尖离你三尺，风停了，红叶却在他周身打转。',
      },
      { speaker: 'xie_wuchen', text: '交出来，我不为难一个炼气。' },
      { speaker: 'shen_qinghe', text: '谢师兄。宗门遗物也好，机缘也好——先讲个「理」。' },
      { speaker: 'xie_wuchen', text: '……沈师妹，你也在这。' },
    ],
    choices: [
      {
        id: 'c_fight_xie',
        text: '拔剑，凭本事说话',
        effects: [
          { type: 'flag_set', key: 'fought_xie', value: true },
          { type: 'relation_add', key: 'xie_wuchen', value: 15 },
          { type: 'karma_add', key: 'qingxuanFame', value: 2 },
          { type: 'karma_add', key: 'daoHeart', value: 1 },
          { type: 'give_item', key: 'mat_jian_zhong_ling', count: 1 },
          {
            type: 'log',
            value: '你接下谢无尘三十剑。第三十一剑时，他收了手，说：够看。',
          },
        ],
        reply: [
          {
            speaker: 'xie_wuchen',
            text: '炼气能有这个剑势。碑归你，我不夺了——但你欠我一场。',
          },
        ],
      },
      {
        id: 'c_share_xie',
        text: '以碑上剑痕相换，共参剑意',
        effects: [
          { type: 'flag_set', key: 'coop_xie', value: true },
          { type: 'relation_add', key: 'xie_wuchen', value: 25 },
          { type: 'karma_add', key: 'qingxuanFame', value: 2 },
          { type: 'give_technique', key: 'tech_luoxia_jian_yi' },
          { type: 'give_treasure', key: 'tres_liu_xia_jian_pai' },
          {
            type: 'log',
            value: '你把碑上剑痕拓给谢无尘。他看了很久，把一枚落霞剑牌按进你掌心。',
          },
        ],
        reply: [
          { speaker: 'xie_wuchen', text: '你拓的不是字，是路。这条路你走，我陪你走一段。' },
        ],
      },
      {
        id: 'c_refuse_xie',
        text: '不与纠缠，取道回城',
        effects: [
          { type: 'flag_set', key: 'avoided_xie', value: true },
          { type: 'relation_add', key: 'xie_wuchen', value: -10 },
          { type: 'karma_add', key: 'qingxuanFame', value: -1 },
          { type: 'give_cultivation', value: 1000 },
          {
            type: 'log',
            value: '你收了剑绕道下山，谢无尘在身后说：避剑的人，剑也不认他。',
          },
        ],
        reply: [
          {
            speaker: 'narration',
            text: '走出很远，身后传来一声长啸，像是剑劈开了风。',
          },
        ],
      },
    ],
  },
]
