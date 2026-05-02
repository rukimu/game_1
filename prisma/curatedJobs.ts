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
  {
    name: "隻腕戦士",
    category: "warrior",
    rank: "advanced",
    description: "片腕を失っても剣を捨てない、執念の戦士。",
    quirk: "隻腕",
    signatureOutfit: "鋼の義手 + 重ね革鎧 + 革紐の片肩当て",
    signatureBio: "戦場で右腕を失った後、左腕一本で剣を振るう道を選んだ者たち。義手の重みで体幹を鍛え、片腕でしか出せない斜め斬り上げを編み出した。挫折は剣士を磨く。",
    baseStats: { hp: 70, mp: 10, atk: 15, def: 11, mat: 3, mdf: 5, spd: 6 },
    uniqueSkills: [
      {
        name: "片刃の覚悟",
        description: "次の通常攻撃が必中 + クリティカル率 +30%。",
        type: "buff",
        element: null,
        power: 0,
        cost: 8,
        cooldown: 3,
        targetType: "self",
      },
    ],
  },
  {
    name: "双子戦士",
    category: "warrior",
    rank: "intermediate",
    description: "息の合った双子の連携で敵を翻弄する。",
    quirk: "双子",
    signatureOutfit: "色違いの鏡像鎧 + 細身の双剣 + 双子結び目の腕章",
    signatureBio: "幼少から二人で一人として育った者たち。互いの呼吸を読み、片方が攻める間にもう片方が守る。一人になっても、もう一人の影を背負って戦う。",
    baseStats: { hp: 60, mp: 12, atk: 13, def: 9, mat: 4, mdf: 6, spd: 9 },
    uniqueSkills: [
      {
        name: "鏡像連携",
        description: "次の 2 ターン、通常攻撃が確定で 2 段ヒットする。",
        type: "buff",
        element: null,
        power: 0,
        cost: 12,
        cooldown: 4,
        targetType: "self",
      },
    ],
  },
  {
    name: "元踊り子戦士",
    category: "warrior",
    rank: "intermediate",
    description: "踊りの動作を剣の運びに転じた、舞型の剣士。",
    quirk: "元踊り子",
    signatureOutfit: "薄絹のスカーフ + 軽量胸当て + 踊り用の細刃刀",
    signatureBio: "舞踊団で生まれ育ち、ある日剣を握るように転じた者たち。流麗な歩法と回転を活かし、敵の側面を素早く取る。剣の軌跡が踊りの軌道と重なる。",
    baseStats: { hp: 50, mp: 14, atk: 12, def: 7, mat: 4, mdf: 5, spd: 12 },
    uniqueSkills: [
      {
        name: "舞剣の旋",
        description: "敵全体に風属性ダメージ。自身の回避率 +15% 1 ターン。",
        type: "attack",
        element: "wind",
        power: 12,
        cost: 10,
        cooldown: 3,
        targetType: "all_enemies",
      },
    ],
  },
  {
    name: "元医者戦士",
    category: "warrior",
    rank: "intermediate",
    description: "人の体を熟知した、急所狙いの戦士。",
    quirk: "元医者",
    signatureOutfit: "白衣の上に革鎧 + 解剖図の彫られた小剣 + 包帯の腰巻",
    signatureBio: "戦場で多くの命を看取り、剣を取って戦う側に転じた者たち。骨格と筋繊維の知識から急所を読み、最小の動作で最大の傷を与える。",
    baseStats: { hp: 56, mp: 14, atk: 13, def: 8, mat: 5, mdf: 6, spd: 8 },
    uniqueSkills: [
      {
        name: "急所突き",
        description: "敵 1 体に物理ダメージ。クリティカル時に【出血】付与。",
        type: "attack",
        element: null,
        power: 14,
        cost: 8,
        cooldown: 2,
        targetType: "enemy",
      },
    ],
  },
  {
    name: "元囚人戦士",
    category: "warrior",
    rank: "advanced",
    description: "牢獄で死を覚悟した日々を経た、捨て身の戦士。",
    quirk: "元囚人",
    signatureOutfit: "破れた囚人服 + 鎖が残った手枷 + 即席の鈍刀",
    signatureBio: "理不尽な罪で投獄され、運命の隙間で逃げ出した者たち。獄中で鍛えた捨て身の戦い方は常識外れ。鎖を武器にも使う。",
    baseStats: { hp: 78, mp: 8, atk: 15, def: 10, mat: 2, mdf: 4, spd: 6 },
    uniqueSkills: [
      {
        name: "鎖鳴り",
        description: "敵 1 体に物理ダメージ + スタン付与（50%）。",
        type: "attack",
        element: null,
        power: 13,
        cost: 10,
        cooldown: 3,
        targetType: "enemy",
      },
    ],
  },
  {
    name: "雪国戦士",
    category: "warrior",
    rank: "intermediate",
    description: "極寒の地で生まれ育った、寒さに動じない戦士。",
    quirk: "雪国育ち",
    signatureOutfit: "白熊の毛皮マント + 氷柄の長剣 + 銀のブローチ",
    signatureBio: "雪深い北の集落で育ち、零下の朝を平気で歩く者たち。寒さを敵にする魔法に強い耐性を持ち、剣に氷を纏わせる古い技を伝えている。",
    baseStats: { hp: 64, mp: 10, atk: 13, def: 10, mat: 4, mdf: 8, spd: 6 },
    uniqueSkills: [
      {
        name: "凍刃の一撃",
        description: "敵 1 体に水属性ダメージ + spd 低下 1 ターン。",
        type: "attack",
        element: "water",
        power: 14,
        cost: 9,
        cooldown: 2,
        targetType: "enemy",
      },
    ],
  },
  {
    name: "海賊崩れの戦士",
    category: "warrior",
    rank: "advanced",
    description: "船を捨て、陸で剣を振るう元海賊。",
    quirk: "海賊崩れ",
    signatureOutfit: "塩で擦り切れたバンダナ + 短刀と曲刀 + 金の耳輪",
    signatureBio: "船と仲間を一夜にして失い、陸に上がった者たち。海上で鍛えた足捌きと、不規則な揺れの中で身につけた間合いの取り方は陸の剣士には真似できない。",
    baseStats: { hp: 60, mp: 12, atk: 14, def: 8, mat: 3, mdf: 5, spd: 11 },
    uniqueSkills: [
      {
        name: "船揺れ斬り",
        description: "敵 1 体に物理ダメージ + 自身の回避率 +20% 1 ターン。",
        type: "attack",
        element: null,
        power: 13,
        cost: 9,
        cooldown: 3,
        targetType: "enemy",
      },
    ],
  },
  {
    name: "元騎士団長",
    category: "warrior",
    rank: "legendary",
    description: "栄光と挫折の両方を知る、老練の指揮官。",
    quirk: "元騎士団長",
    signatureOutfit: "白銀の儀礼鎧 + 紋章入りの大剣 + 紅のマント",
    signatureBio: "千の兵を率い、千の戦場で勝敗を分けた者たち。称号は遠い記憶でも、戦場での目の配りと味方への号令は今も衰えない。",
    baseStats: { hp: 75, mp: 16, atk: 16, def: 12, mat: 4, mdf: 8, spd: 6 },
    uniqueSkills: [
      {
        name: "総攻撃の号令",
        description: "味方全員の atk +20% 2 ターン。",
        type: "buff",
        element: null,
        power: 0,
        cost: 16,
        cooldown: 5,
        targetType: "all_allies",
      },
    ],
  },
  {
    name: "退役老兵",
    category: "warrior",
    rank: "advanced",
    description: "百戦を生き延びた、戦場の生き字引。",
    quirk: "退役老兵",
    signatureOutfit: "傷だらけの兜 + 銀の鎖帷子 + 古い軍剣",
    signatureBio: "若き戦士が皆死ぬ戦場を、何故か生き残り続けた者たち。死なないコツを知っているのか、死神に呆れられただけなのかは本人にも分からない。",
    baseStats: { hp: 68, mp: 12, atk: 14, def: 12, mat: 3, mdf: 6, spd: 5 },
    uniqueSkills: [
      {
        name: "退き際の一撃",
        description: "自身の HP が 30% 以下なら威力 1.5 倍の物理攻撃。",
        type: "attack",
        element: null,
        power: 18,
        cost: 10,
        cooldown: 4,
        targetType: "enemy",
      },
    ],
  },
  {
    name: "元獣狩り戦士",
    category: "warrior",
    rank: "intermediate",
    description: "野獣との一対一を生き抜いた、獣の心を読む戦士。",
    quirk: "元獣狩り",
    signatureOutfit: "毛皮の肩当て + 骨で柄を作った狩剣 + 罠用ロープ",
    signatureBio: "山中で巨大な獣を狩り続けた者たち。獣の呼吸を読む経験は、対人戦闘にも活きる。獣系の敵への直感的な対処に長ける。",
    baseStats: { hp: 60, mp: 10, atk: 14, def: 9, mat: 3, mdf: 5, spd: 9 },
    uniqueSkills: [
      {
        name: "獣狩りの一閃",
        description: "獣系の敵に大ダメージ。それ以外は半減。",
        type: "attack",
        element: null,
        power: 22,
        cost: 11,
        cooldown: 3,
        targetType: "enemy",
      },
    ],
  },
  {
    name: "元密漁者戦士",
    category: "warrior",
    rank: "intermediate",
    description: "禁猟区で生計を立てた、影の刈り手。",
    quirk: "元密漁者",
    signatureOutfit: "革のフード + 投網と短刀 + 防水ブーツ",
    signatureBio: "夜の禁漁区を渡り歩いた者たち。森や水辺の音を読む耳を持ち、誰も気付かない位置から仕掛ける。違法だった日々の経験が今は剣の腕に化けた。",
    baseStats: { hp: 56, mp: 12, atk: 13, def: 8, mat: 4, mdf: 6, spd: 10 },
    uniqueSkills: [
      {
        name: "投網の妨害",
        description: "敵 1 体の spd を 2 ターン -30%。",
        type: "debuff",
        element: null,
        power: 0,
        cost: 8,
        cooldown: 3,
        targetType: "enemy",
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
