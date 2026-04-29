// Curated word banks for template-based generation.
// Designed to feel like a classic fantasy world without leaning on real
// people, religions, or politics. Keep entries PG-13 / age 15+.

export const JOB_PARTS = {
  warrior: {
    prefix: ["猛き", "鉄壁の", "鋼の", "竜殺しの", "百戦の", "黒鉄の"],
    base: ["戦士", "剣士", "重装兵", "槍兵", "盾騎士", "蛮戦士"],
    suffix: ["", "", "の継承者", "の末裔"],
  },
  mage: {
    prefix: ["碧き", "星詠みの", "灰銀の", "深淵の", "薄明の", "古き"],
    base: ["魔導士", "賢者", "術士", "詠唱者", "黒魔導", "蒼炎師"],
    suffix: ["", "", "の徒", "の門弟"],
  },
  rogue: {
    prefix: ["影なる", "夜霧の", "風喰みの", "月歩く", "葬送の", "薄羽の"],
    base: ["盗賊", "暗殺者", "斥候", "詐欺師", "風使い", "暗夜剣"],
    suffix: ["", "", "の遣い"],
  },
  cleric: {
    prefix: ["白翼の", "祈りの", "癒しの", "誓いの", "蒼穹の", "灯火の"],
    base: ["神官", "僧侶", "聖騎士", "巫女", "祈祷師", "癒師"],
    suffix: ["", "", "の徒"],
  },
  craft: {
    prefix: ["遍歴の", "鉄槌の", "練磨の", "古都の", "雪原の"],
    base: ["鍛冶師", "錬金術師", "細工師", "薬師", "革細工師"],
    suffix: [""],
  },
  support: {
    prefix: ["旅する", "陽だまりの", "風読みの", "詩を奏でる"],
    base: ["吟遊詩人", "踊り子", "占星術師", "御者", "司書"],
    suffix: [""],
  },
  heretic: {
    prefix: ["禁書の", "忘れられた", "微睡みの", "誰も知らない"],
    base: ["異端学者", "霊媒", "夢喰い", "古き者の血族"],
    suffix: ["", "の末弟", "の影"],
  },
  rare: {
    prefix: ["蒼に選ばれし", "星に呼ばれし", "ただ一人の"],
    base: ["竜騎士", "聖魔導", "封印者", "天秤の使者"],
    suffix: ["", "の継承者"],
  },
  cursed: {
    prefix: ["呪い喰らいの", "失われた", "灰塵の", "牢獄の"],
    base: ["獣憑き", "屍呼び", "影縫い", "血誓いの剣"],
    suffix: ["", "（呪）"],
  },
};

export const SKILL_PARTS = {
  attack: ["斬撃", "強打", "貫き", "閃光剣", "螺旋突き", "影刃", "蒼焔斬"],
  heal: ["癒しの祈り", "回復の唄", "薬草療法", "聖光の癒し"],
  buff: ["鼓舞", "戦の歌", "鉄の意志", "神速の祝福"],
  debuff: ["呪詛", "毒霧", "鈍足の罠", "暗黒の囁き"],
  special: ["秘技：流星", "封印の唄", "万象の理", "深淵の眼差し"],
};

export const ELEMENTS = ["fire", "water", "earth", "wind", "light", "dark", "none"] as const;

export const ENEMY_PARTS = {
  prefix: ["古びた", "森を彷徨う", "夜に潜む", "錆びついた", "枯野の", "霧深き", "崩れた"],
  base: ["ゴブリン", "コボルト", "オオカミ", "スケルトン", "スライム", "盗賊", "オーク", "ハーピー", "リッチ", "鎧人形"],
  suffix: ["", "の戦士", "の長", "の影", "の番人"],
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
];

export const ROLES = ["旅人", "鍛冶屋", "司書", "踊り子", "錬金術師", "歩哨", "占い師", "宿屋の娘"];

export const QUEST_TEMPLATES = [
  { kind: "defeat", text: "{place}周辺で増えている{enemy}を{count}体討伐してほしい。", goalType: "defeat_enemy" },
  { kind: "defeat", text: "夜に現れる{enemy}を、街の門番に代わって{count}体始末してくれ。", goalType: "defeat_enemy" },
  { kind: "defeat", text: "森の奥に巣食う{enemy}の群れを{count}体排除する仕事だ。", goalType: "defeat_enemy" },
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
