// Cycle 31: hand-curated "personality" jobs. Each entry has a quirk
// (one-word hook), a signature outfit (cosmetic string until C35 pixel
// art lands), an 80-150 字 bio, and 1-2 unique skills that aren't drawn
// from the procedural pool.
//
// Phase 1 (this file): 12 curated jobs across the 8 main categories.
// Phase 2 (Cycle 31-d): bulk-generate ~90 more via the AI pipeline
// described in docs/team/CURATED_JOB_BULK.md.

export type CuratedSkill = {
  name: string;
  description: string;
  type: "attack" | "heal" | "buff" | "debuff" | "special";
  element: string | null;
  power: number;
  cost: number;
  cooldown?: number;
  targetType?: string;
};

export type CuratedJob = {
  name: string;
  category: "warrior" | "mage" | "rogue" | "cleric" | "craft" | "support" | "heretic" | "rare";
  rank: "beginner" | "intermediate" | "advanced" | "special" | "legendary";
  description: string;
  quirk: string;
  signatureOutfit: string;
  signatureBio: string;
  baseStats: {
    hp: number;
    mp: number;
    atk: number;
    def: number;
    mat: number;
    mdf: number;
    spd: number;
  };
  uniqueSkills: CuratedSkill[];
};

export const CURATED_JOBS: CuratedJob[] = [
  // ---------- WARRIOR ----------
  {
    name: "眼鏡戦士",
    category: "warrior",
    rank: "intermediate",
    description: "丸眼鏡で敵の挙動を読み解く、知性派の戦士。",
    quirk: "眼鏡",
    signatureOutfit: "丸眼鏡 + 革鎧 + 革表紙の戦術手帳",
    signatureBio: "本屋育ち。剣士には向かないと家族に言われ続けたが、敵の癖を眼鏡越しに観察するだけで一歩先を読めると気づいた。戦術手帳には倒した敵の癖が 87 ページ分書き連ねてあるという。",
    baseStats: { hp: 56, mp: 12, atk: 12, def: 8, mat: 4, mdf: 6, spd: 8 },
    uniqueSkills: [
      {
        name: "観察眼",
        description: "敵を 1 ターン凝視し、弱点属性とおおよその HP を露わにする。",
        type: "buff",
        element: null,
        power: 0,
        cost: 6,
        cooldown: 2,
        targetType: "enemy",
      },
    ],
  },
  {
    name: "巨漢戦士",
    category: "warrior",
    rank: "advanced",
    description: "見た目通りの怪力で大地ごと敵を揺らす。",
    quirk: "巨漢",
    signatureOutfit: "鋲付き胸当て + 巨大両手槌 + 山羊皮のマント",
    signatureBio: "北方の鉱山育ち。子供の頃に落盤事故で岩を素手で押し退けたという伝説があるが、本人たちは『たまたまだ』と笑う。怒鳴り声で動物が逃げる程度には怖い。",
    baseStats: { hp: 80, mp: 8, atk: 16, def: 12, mat: 2, mdf: 4, spd: 4 },
    uniqueSkills: [
      {
        name: "地響き",
        description: "地面を踏み砕き、敵全体に物理ダメージとスタン付与（30%）。",
        type: "attack",
        element: "earth",
        power: 14,
        cost: 12,
        cooldown: 3,
        targetType: "all_enemies",
      },
    ],
  },

  // ---------- MAGE ----------
  {
    name: "猫好き魔導師",
    category: "mage",
    rank: "intermediate",
    description: "塔に住み着いた野良猫たちと対話する、変わり者の魔導師。",
    quirk: "猫好き",
    signatureOutfit: "三毛猫の毛皮ローブ + 木の杖 + 革紐に通した小さな鈴",
    signatureBio: "塔学生だった頃に生贄の儀式に使われそうになった子猫を救い、退学処分を受けた者たち。今は野良猫と暮らし、彼らの夢を読む独自の魔法を編み出した。誰も信じないが、効く。",
    baseStats: { hp: 38, mp: 30, atk: 4, def: 4, mat: 16, mdf: 10, spd: 7 },
    uniqueSkills: [
      {
        name: "招き猫の歌",
        description: "味方全員の運（luk）を 1 ターン上昇させ、ドロップ判定が改善する。",
        type: "buff",
        element: null,
        power: 0,
        cost: 8,
        cooldown: 4,
        targetType: "all_allies",
      },
    ],
  },
  {
    name: "不眠魔導師",
    category: "mage",
    rank: "advanced",
    description: "三日三晩眠らずに研究する病的な探究者。",
    quirk: "不眠",
    signatureOutfit: "目の下のクマ + 黒外套 + 開きっぱなしの夢日記",
    signatureBio: "10 年眠っていないと言われる者たち。『眠ると夢に喰われる』と語る一方で、夢の側からも入れる魔法を発明した。眠る敵の意識に侵入し、悪夢で削る。",
    baseStats: { hp: 32, mp: 36, atk: 3, def: 3, mat: 18, mdf: 8, spd: 9 },
    uniqueSkills: [
      {
        name: "夢渡り",
        description: "敵に【沈黙】+【出血】を同時付与（必中）。",
        type: "debuff",
        element: "dark",
        power: 8,
        cost: 14,
        cooldown: 4,
        targetType: "enemy",
      },
    ],
  },

  // ---------- ROGUE ----------
  {
    name: "甘党盗賊",
    category: "rogue",
    rank: "beginner",
    description: "甘いものに弱い、軽口の盗賊。",
    quirk: "甘党",
    signatureOutfit: "ピンクのフード + 飴の包み紙のポーチ + 短剣 2 本",
    signatureBio: "孤児院の脱走組。甘いケーキを盗むためだけに男爵邸に侵入し、ついでに金庫から銅貨も持ち帰る類の連中。仲間からは『砂糖が動力源』と呼ばれている。",
    baseStats: { hp: 36, mp: 14, atk: 11, def: 5, mat: 6, mdf: 5, spd: 14 },
    uniqueSkills: [
      {
        name: "甘い罠",
        description: "敵 1 体に物理ダメージ。次ターン敵が味方を狙う確率を 30% 下げる。",
        type: "debuff",
        element: null,
        power: 10,
        cost: 8,
        cooldown: 3,
        targetType: "enemy",
      },
    ],
  },
  {
    name: "影語り",
    category: "rogue",
    rank: "advanced",
    description: "自分の影と会話できる暗殺者。",
    quirk: "影",
    signatureOutfit: "黒の半袖 + 黒の細刃 + 自分の影が分離した第二の輪郭",
    signatureBio: "幼い頃に呪術師に呪われ、影が独立して動くようになった者たち。本人より影の方が口数が多い。戦闘中、影が単独で攻撃を仕掛ける。",
    baseStats: { hp: 42, mp: 18, atk: 14, def: 6, mat: 8, mdf: 6, spd: 16 },
    uniqueSkills: [
      {
        name: "影分身",
        description: "次の通常攻撃が 2 回発動する（影が 1 回追加で攻撃）。",
        type: "buff",
        element: "dark",
        power: 0,
        cost: 10,
        cooldown: 4,
        targetType: "self",
      },
    ],
  },

  // ---------- CLERIC ----------
  {
    name: "老師",
    category: "cleric",
    rank: "advanced",
    description: "300 年生きていると噂される、慈悲深い修道士。",
    quirk: "老齢",
    signatureOutfit: "白い長髭 + 木の数珠 + 紺の修道服",
    signatureBio: "実年齢は本人すら覚えていないという者たち。村の老人皆を看取り、その魂を覚えている。死者の名を呼ぶことで生者の傷を癒す独自の祈祷術を持つ。",
    baseStats: { hp: 50, mp: 28, atk: 4, def: 8, mat: 14, mdf: 14, spd: 5 },
    uniqueSkills: [
      {
        name: "古き慈悲",
        description: "味方 1 人を最大 HP の 60% まで一気に回復する。",
        type: "heal",
        element: "light",
        power: 30,
        cost: 16,
        cooldown: 4,
        targetType: "ally",
      },
    ],
  },
  {
    name: "歌う司祭",
    category: "cleric",
    rank: "intermediate",
    description: "祈りの代わりに鎮魂歌を歌う、変則派の司祭。",
    quirk: "歌好き",
    signatureOutfit: "白の祭服 + 銀の小鈴 + 五線譜の刺繍が入ったストール",
    signatureBio: "教会の合唱団から異端宣告で追放された者たち。声に乗せた祈りで死霊を浄化できる。賛美歌より民謡の節回しを好む。怒ると音域が 2 オクターブ広がる。",
    baseStats: { hp: 42, mp: 24, atk: 4, def: 6, mat: 14, mdf: 12, spd: 8 },
    uniqueSkills: [
      {
        name: "鎮魂歌",
        description: "不死系の敵に大ダメージ。それ以外の敵には半減。",
        type: "attack",
        element: "light",
        power: 22,
        cost: 12,
        cooldown: 3,
        targetType: "all_enemies",
      },
    ],
  },

  // ---------- CRAFT ----------
  {
    name: "鍛冶娘",
    category: "craft",
    rank: "intermediate",
    description: "鎚を振るう手は祖父譲り、目は曾祖父譲りの鍛冶屋。",
    quirk: "頑固",
    signatureOutfit: "煤汚れた革エプロン + 一本結びの赤毛 + 重い鉄槌",
    signatureBio: "親の店を継ぐと決めた幼少から鎚を握り続けてきた者たち。村の客の名前と注文をすべて覚えている。『鉄しか信じない』と言いつつ、客への笑顔は本物。",
    baseStats: { hp: 52, mp: 12, atk: 14, def: 10, mat: 4, mdf: 6, spd: 7 },
    uniqueSkills: [
      {
        name: "一閃打ち",
        description: "渾身の一撃。クリティカル率 +50%、ヒット時に敵の def を 1 ターン -20%。",
        type: "attack",
        element: null,
        power: 16,
        cost: 10,
        cooldown: 3,
        targetType: "enemy",
      },
    ],
  },

  // ---------- SUPPORT ----------
  {
    name: "旅芸人",
    category: "support",
    rank: "beginner",
    description: "笛と即興で街を巡る、根なしの楽士。",
    quirk: "風来坊",
    signatureOutfit: "赤いベレー + 木の横笛 + パッチワークのマント",
    signatureBio: "故郷を早くに出て戻らない者たち。各地で覚えた民謡を笛で演奏する。風の流れで敵の動きを読むのが特技。寝床は野原か酒場の隅。",
    baseStats: { hp: 36, mp: 22, atk: 6, def: 4, mat: 8, mdf: 8, spd: 13 },
    uniqueSkills: [
      {
        name: "風読みの笛",
        description: "味方全員の spd を 2 ターン +30%。",
        type: "buff",
        element: "wind",
        power: 0,
        cost: 10,
        cooldown: 4,
        targetType: "all_allies",
      },
    ],
  },

  // ---------- HERETIC ----------
  {
    name: "禁書館の番人",
    category: "heretic",
    rank: "advanced",
    description: "封印された書庫で長年過ごした、口数の少ない者。",
    quirk: "無口",
    signatureOutfit: "灰の髪 + 鎖で繋がれた古書 + 黒い手袋",
    signatureBio: "幼い頃に禁書館に閉じ込められ、長い年月を経てようやく外に出された者たち。そこで読んだ書物の半分は、世界の常識を裏返すような内容だった。語ろうとすると舌が痛むという。",
    baseStats: { hp: 38, mp: 30, atk: 4, def: 6, mat: 16, mdf: 12, spd: 7 },
    uniqueSkills: [
      {
        name: "封じの一節",
        description: "敵の特技 CD を倍化（次の特技まで延長）。",
        type: "debuff",
        element: "dark",
        power: 0,
        cost: 14,
        cooldown: 5,
        targetType: "enemy",
      },
    ],
  },

  // ---------- RARE ----------
  {
    name: "星詠み",
    category: "rare",
    rank: "legendary",
    description: "星の運行から運命を読む、北方の予言者。",
    quirk: "夜行性",
    signatureOutfit: "銀糸の刺繍が入った藍色の外套 + 星座盤 + 銀の指輪 7 つ",
    signatureBio: "生まれた瞬間に天空に新しい星が現れたと語られる者たち。本人たちは否定するが、彼らの通った道では雨が止む現象が観測されている。星辰の力を借りて戦況そのものを書き換える。",
    baseStats: { hp: 40, mp: 36, atk: 4, def: 6, mat: 18, mdf: 14, spd: 9 },
    uniqueSkills: [
      {
        name: "星辰の指針",
        description: "次のターン、味方全員の与ダメージ +25%、被ダメージ -15%。",
        type: "buff",
        element: "light",
        power: 0,
        cost: 18,
        cooldown: 5,
        targetType: "all_allies",
      },
    ],
  },
];
