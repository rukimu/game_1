// Curated word banks for template-based generation.
// Designed to feel like a classic fantasy world without leaning on real
// people, religions, or politics. Keep entries PG-13 / age 15+.
//
// Cycle 21 expanded these pools by 3-5x to reduce repetition for long-time
// players. The combinatorial spaces are now large enough that a 100-hour
// player will rarely see the same surface text twice.

export const JOB_PARTS = {
  warrior: {
    prefix: ["猛き", "鉄壁の", "鋼の", "竜殺しの", "百戦の", "黒鉄の", "雷霆の", "山稜の", "鬨の声の", "深紅の", "猪突の", "怒涛の", "孤高の", "無傷の"],
    base: ["戦士", "剣士", "重装兵", "槍兵", "盾騎士", "蛮戦士", "斧使い", "鉾持ち", "傭兵", "近衛", "決闘者", "刃隠し"],
    suffix: ["", "", "の継承者", "の末裔", "の守護", "・最後の一人", "の長", "・第二代"],
  },
  mage: {
    prefix: ["碧き", "星詠みの", "灰銀の", "深淵の", "薄明の", "古き", "霜の", "閃光の", "月詠みの", "黒檀の", "陽炎の", "玻璃の", "緋色の"],
    base: ["魔導士", "賢者", "術士", "詠唱者", "黒魔導", "蒼炎師", "氷結師", "雷紋師", "幻惑師", "古文の徒", "星読み", "封印者"],
    suffix: ["", "", "の徒", "の門弟", "の研究者", "・遺書記者"],
  },
  rogue: {
    prefix: ["影なる", "夜霧の", "風喰みの", "月歩く", "葬送の", "薄羽の", "音無しの", "翡翠の", "灰被りの", "煙の", "硝子の", "黄昏の"],
    base: ["盗賊", "暗殺者", "斥候", "詐欺師", "風使い", "暗夜剣", "影縫い", "詐術師", "薄羽刺", "鎖断ち", "金庫破り", "拾い屋"],
    suffix: ["", "", "の遣い", "・無名", "の影武者"],
  },
  cleric: {
    prefix: ["白翼の", "祈りの", "癒しの", "誓いの", "蒼穹の", "灯火の", "鎮魂の", "黎明の", "聖印の", "苦行の", "誠の", "深紅の"],
    base: ["神官", "僧侶", "聖騎士", "巫女", "祈祷師", "癒師", "司祭", "聖歌士", "巡礼者", "懺悔者", "破邪師"],
    suffix: ["", "", "の徒", "の遣い", "・最後の祈り"],
  },
  craft: {
    prefix: ["遍歴の", "鉄槌の", "練磨の", "古都の", "雪原の", "霧深き", "古老の", "黄金手の", "銀の指の", "鬼火の", "塩の", "古図の"],
    base: ["鍛冶師", "錬金術師", "細工師", "薬師", "革細工師", "宝飾師", "陶工", "魔具師", "刻印師", "塩師", "薬草学者"],
    suffix: ["", "の徒弟", "・三代目"],
  },
  support: {
    prefix: ["旅する", "陽だまりの", "風読みの", "詩を奏でる", "陽光の", "月明かりの", "祝祭の", "霜降りの", "雪原の", "風の", "唄の"],
    base: ["吟遊詩人", "踊り子", "占星術師", "御者", "司書", "話し手", "大道芸人", "占術師", "歌い手", "詩読み"],
    suffix: ["", "・流浪", "・古老"],
  },
  heretic: {
    prefix: ["禁書の", "忘れられた", "微睡みの", "誰も知らない", "封印の外の", "暦から消された", "黒水の", "閉じた目の"],
    base: ["異端学者", "霊媒", "夢喰い", "古き者の血族", "禁術士", "影読み", "巫女裔", "黒陽の徒"],
    suffix: ["", "の末弟", "の影", "・残響"],
  },
  rare: {
    prefix: ["蒼に選ばれし", "星に呼ばれし", "ただ一人の", "夜明けの", "終わりの", "雷霆に触れた", "薄明に降りた"],
    base: ["竜騎士", "聖魔導", "封印者", "天秤の使者", "光輪の戦士", "白竜の御者", "星宿りの剣"],
    suffix: ["", "の継承者", "・たった一人"],
  },
  cursed: {
    prefix: ["呪い喰らいの", "失われた", "灰塵の", "牢獄の", "禁忌の", "黒誓いの", "歪んだ", "舌を失った"],
    base: ["獣憑き", "屍呼び", "影縫い", "血誓いの剣", "灰の踊り手", "詠まずの口", "禁書の写し手"],
    suffix: ["", "（呪）", "・贄"],
  },
};

export const SKILL_PARTS = {
  attack: ["斬撃", "強打", "貫き", "閃光剣", "螺旋突き", "影刃", "蒼焔斬", "霜割り", "雷貫", "月光斬", "二段突き", "風裂", "鉄拳", "獣牙撃", "百舌斬", "縫い止め", "閃迅"],
  heal: ["癒しの祈り", "回復の唄", "薬草療法", "聖光の癒し", "祈祷術", "蘇らせの息吹", "夜露の癒し", "繭の祈り", "白翼の祝福"],
  buff: ["鼓舞", "戦の歌", "鉄の意志", "神速の祝福", "勇士の誇り", "霊感", "陽光の盾", "風読みの加護", "守りの祈祷"],
  debuff: ["呪詛", "毒霧", "鈍足の罠", "暗黒の囁き", "錆び付きの霧", "封印の文字", "影の鎖", "霜縛り", "麻痺の唄", "畏れの目"],
  special: ["秘技：流星", "封印の唄", "万象の理", "深淵の眼差し", "鏡像連撃", "灰の唄", "千刃舞", "封呪一閃", "塔の囁き", "蒼炎滅殺"],
};

export const ELEMENTS = ["fire", "water", "earth", "wind", "light", "dark", "none"] as const;

export const ENEMY_PARTS = {
  prefix: [
    "古びた", "森を彷徨う", "夜に潜む", "錆びついた", "枯野の", "霧深き", "崩れた",
    "亡き街道の", "霜結びの", "鉄錆の", "祠を荒らす", "灰被りの", "黄昏の", "影喰みの",
    "湖底の", "塔陰の", "群れを率いる", "牙を研ぐ", "古道の", "井戸の底の",
  ],
  base: [
    "ゴブリン", "コボルト", "オオカミ", "スケルトン", "スライム", "盗賊", "オーク",
    "ハーピー", "リッチ", "鎧人形", "魔狼", "獅子鷲", "ワーム", "幽霊兵", "古代魚",
    "石巨人", "蜥蜴人", "蝙蝠", "屍兵", "ナーガ", "蜘蛛", "霊狐", "屍鳥", "巨大蟲",
    "影法師", "コウモリ獣", "ゴーレム", "魔導機巧", "腐肉喰み", "ガーゴイル",
  ],
  suffix: [
    "", "の戦士", "の長", "の影", "の番人",
    "の頭", "の哀れ", "・百年", "・群"," の幼体", "の頭目", "の老体", "の堕落体",
  ],
};

export const RUMOR_TEMPLATES = [
  "{place}では最近、{element}に弱い獣が増えているらしい。",
  "夜だけ酒場に現れる{role}が、聞いたこともない職の話をしていた。",
  "{place}の井戸の底で、何かが息をしているという。",
  "{role}が、ここから北東の塔に灯る光を毎晩数えているそうだ。",
  "古い{place}の鐘が、{element}の気配がある日にだけ鳴るらしい。",
  "{role}を救った旅人は、奇妙な紋章の刻まれた剣を授かったとか。",
  "森に踏み入った{role}が、誰にも知られていない泉を見たと話していた。",
  "海から流れ着いた瓶の中に、{element}の力を封じる呪文があるという噂だ。",
  "{place}の市場で、誰のものか分からない遺品が値もつかずに置かれていたらしい。",
  "{role}の家の屋根裏から、夜だけ歌う子供の声が聞こえると噂になっている。",
  "{place}の城門の影に、{element}の気配を持つ幼い獣が住み着いたという。",
  "古い旅日記に『{place}の三つ目の井戸』と書かれているが、二つしか見つからない。",
  "{role}が貸し出した馬車が、誰も乗っていないのに勝手に戻ってきたそうだ。",
  "{place}の地下道で、{element}属性の魔法陣が描き直されているのが見つかった。",
  "{role}が幼少期に拾ったという石が、最近になって温度を持ち始めたらしい。",
  "{place}の墓地の石碑が、夜のうちに少しずつ位置を変えているという。",
  "湖を渡った{role}が、戻ってきた時にはなぜか左利きになっていた。",
  "{place}の長老が、自分の名前を忘れた朝が三度続いたという。",
  "{role}の靴底に、覚えのない街の砂がついていることが続いている。",
  "{place}の風車が、風がない日でも一時間に一度だけ回るらしい。",
  "古道で見かけた{role}が、地図にない街の名を口走っていた。",
  "{place}の図書館の最深部に、誰も鍵を持たない書架があるという。",
  "{role}が見送ったはずの旅人と、別の街でまた出会ったという話がある。",
  "{place}の井戸水を汲んだ朝、桶の中で小さな魚が泳いでいたという報告がある。",
];

// Templates that splice in a season-specific "world keyword" so the central
// mystery slowly bleeds into every town the player visits. Used when a season
// keyword is supplied; otherwise we fall back to RUMOR_TEMPLATES.
export const SEASONAL_RUMOR_TEMPLATES = [
  "{place}の年寄りが、夜更けになるたび『{seasonWord}』の話をするらしい。",
  "{role}の口から、こぼれ落ちるように『{seasonWord}』という言葉が出たという。",
  "誰も読めないはずの『{seasonWord}』を、酔った旅人が酒場でずっと呟いていた。",
  "{place}の壁に、夜のうちに『{seasonWord}』とだけ刻まれた跡があったそうだ。",
  "{role}が見た夢には、いつも『{seasonWord}』が出てくると怯えていた。",
  "古地図の隅に、子どもの落書きのような『{seasonWord}』の文字を見つけた者がいる。",
  "{place}の祠で、{role}が『{seasonWord}』を三度唱えると鳴き声が止んだという。",
  "{role}が拾った古銭の裏に、『{seasonWord}』と刻印されていた。",
  "{place}の墓守が、夜風に乗って『{seasonWord}』という呼び声を聞いたと言う。",
  "古い祝祭の歌詞の中に『{seasonWord}』だけ意味が分からない単語があった。",
  "{role}が病に伏した夜、譫言で『{seasonWord}』とだけ繰り返したらしい。",
  "{place}の煙突から立ち昇る煙が、ある日『{seasonWord}』の形に見えたという。",
  "新しく雇われた{role}が、初日に『{seasonWord}』の場所を知っていたという。",
  "{place}に来た旅芸人の演目の一節に、『{seasonWord}』が織り込まれていた。",
  "{role}の店先に、『{seasonWord}』とだけ書かれた紙片が朝に落ちていた。",
];

export const ROLES = [
  "旅人", "鍛冶屋", "司書", "踊り子", "錬金術師", "歩哨", "占い師", "宿屋の娘",
  "古老", "墓守", "薬売り", "幼い子供", "猟師", "石工", "船頭", "祠の管理人",
  "市場の番頭", "古銭収集家", "馬丁", "図書館の見習い",
];

export const QUEST_TEMPLATES = [
  // Defeat variants — direct combat objectives.
  { kind: "defeat", text: "{place}周辺で増えている{enemy}を{count}体討伐してほしい。", goalType: "defeat_enemy" },
  { kind: "defeat", text: "夜に現れる{enemy}を、街の門番に代わって{count}体始末してくれ。", goalType: "defeat_enemy" },
  { kind: "defeat", text: "森の奥に巣食う{enemy}の群れを{count}体排除する仕事だ。", goalType: "defeat_enemy" },
  { kind: "defeat", text: "{place}の用心棒が音を上げた。{enemy}を{count}体狩り尽くしてくれ。", goalType: "defeat_enemy" },
  { kind: "defeat", text: "村の家畜を襲った{enemy}を{count}体、見せしめとして仕留めてほしい。", goalType: "defeat_enemy" },
  { kind: "defeat", text: "古道に巣食う{enemy}が商隊を脅している。{count}体始末してくれ。", goalType: "defeat_enemy" },
  { kind: "defeat", text: "祠を汚した{enemy}を{count}体清めの剣で討つ仕事だ。", goalType: "defeat_enemy" },
  { kind: "defeat", text: "井戸の底から這い上がった{enemy}が{count}体目撃された。封じ直してきてくれ。", goalType: "defeat_enemy" },
  // Collect — gathering loot from defeated foes (counts equip drops).
  { kind: "collect", text: "{place}の鍛冶屋が素材を欲している。古い装備を{count}個持ち込んでほしい。", goalType: "collect_drop" },
  { kind: "collect", text: "失われた装備の手がかりを集めている。装備品を{count}個提示してくれ。", goalType: "collect_drop" },
  { kind: "collect", text: "墓守が祠の供物として古い装備を{count}個求めている。", goalType: "collect_drop" },
  { kind: "collect", text: "古銭収集家が、刻印付きの装備を{count}個探している。", goalType: "collect_drop" },
  // Explore — visit a target town or fight in the field.
  { kind: "explore", text: "{place}から{otherPlace}まで街道を辿ってほしい。誰かが安否を待っている。", goalType: "visit_town" },
  { kind: "explore", text: "{otherPlace}に伝わる古い書物を確かめてきてくれ。", goalType: "visit_town" },
  { kind: "explore", text: "{otherPlace}の市場に出る品物の真偽を見てきてほしい。", goalType: "visit_town" },
  { kind: "explore", text: "古い友人が{otherPlace}で病に伏している。様子を見に行ってくれ。", goalType: "visit_town" },
  { kind: "explore", text: "{otherPlace}の祠に、お守りを届けてくれないか。", goalType: "visit_town" },
  // Endure — survive multiple battles (any wins) within the day.
  { kind: "endure", text: "今日中に戦闘で{count}勝してくれ。腕の鈍りを払いたい。", goalType: "win_battles" },
  { kind: "endure", text: "{place}に巣食う敵に{count}回勝ってきてくれ。意地を見せてやれ。", goalType: "win_battles" },
  { kind: "endure", text: "古老が言うには、ここから{count}戦勝てば才を見極めるという。", goalType: "win_battles" },
  { kind: "endure", text: "ギルドの試練として、本日中に{count}回戦って勝つこと。", goalType: "win_battles" },
];

export const NPC_TEMPLATES = [
  { role: "酒場の主人", line: "ようこそ。今日はちょっと変わった噂が流れているよ。" },
  { role: "宿屋の主人", line: "一晩{innFee}Gでベッドと温かい飯を出すよ。" },
  { role: "旅の吟遊詩人", line: "新しい歌を覚えたんだ、聴いていくかい？" },
  { role: "占い師", line: "あんたの星には、まだ見ぬ職が浮かんでいる…。" },
  { role: "転職屋の老人", line: "心当たりがあるなら、そこを開いてみるといい。鍵はあんた自身だ。" },
];

export const ITEM_NAMES = {
  weapon: ["古びた剣", "鉄の槍", "森人の弓", "練習用の杖", "錆びた短刀", "蒼炎のロッド"],
  head: ["布の帽子", "鉄兜", "革のフード", "羽根飾りの兜"],
  body: ["布の服", "革の鎧", "鎖帷子", "蒼の長衣"],
  arm: ["布の手袋", "革の腕当て", "鋼の籠手"],
  leg: ["布のズボン", "革のズボン", "鎖のすね当て"],
  foot: ["布の靴", "革のブーツ", "鋼のサバトン"],
  accessory: ["銅の指輪", "銀の腕輪", "翡翠のペンダント"],
  charm: ["治癒のお守り", "風読みの羽", "古き紋章の欠片"],
  consumable: ["薬草", "癒しの霊薬", "魔力の小瓶", "携帯食"],
  material: ["獣の牙", "魔石のかけら", "薄絹", "古びた金貨袋"],
};

// Dungeon name parts — generateDungeonName picks one from each pool.
export const DUNGEON_NAME_PARTS = {
  prefix: [
    "忘れられた", "古き", "深淵の", "蒼の", "黄昏の", "渇きの", "霜の",
    "鏡映る", "灰被りの", "塔陰の", "封じられた", "湖底の", "祠なき",
    "詠まれぬ", "夜の底の", "古道果ての", "薄明の", "牢獄の",
  ],
  suffix: [
    "地下廊", "遺跡", "封印迷宮", "鍾乳洞", "水底回廊", "塔", "巣", "谷", "祠",
    "螺旋階", "墓所", "鏡の間", "水脈", "岩窟", "図書館", "詠戸", "灰窯",
    "獣道", "石棺の道", "風の通り路",
  ],
};
