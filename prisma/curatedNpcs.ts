// Cycle 33: hand-curated NPCs — 5 main towns × 6 each = 30 entries.
// Each has a 60-120 char bio and an optional relation graph pointing
// to other curated NPCs by name. Spread across legacy towns + 2 new
// curated towns added to seed.

export type CuratedNpcRelation = {
  name: string;       // target NPC's name (must exist in this catalog)
  relation: string;   // 「幼馴染」「息子のような存在」etc.
  note?: string;      // optional one-line context
};

export type CuratedNpc = {
  townName: string;   // resolved to townId at seed time
  name: string;
  role: string;
  dialogue: string;   // default line shown if no archetype-specific line is generated
  bio: string;
  relations?: CuratedNpcRelation[];
};

// Two new curated-only towns added on top of the legacy 3.
// Seed will upsert these into the towns table.
export type CuratedTown = {
  name: string;
  region: string;
  danger: number;
  economy: number;
  security: number;
  innFee: number;
  rumorTrend: string;
  description: string;
};

export const CURATED_TOWNS: CuratedTown[] = [
  {
    name: "鐘塔の都ベルクラート",
    region: "鐘塔の麓",
    danger: 4,
    economy: 65,
    security: 65,
    innFee: 35,
    rumorTrend: "scholar",
    description: "巨大な鐘塔を中心に栄えた、知識と古文書の都。",
  },
  {
    name: "古王国の都ヴェスペル",
    region: "古王国の遺跡群",
    danger: 5,
    economy: 50,
    security: 50,
    innFee: 40,
    rumorTrend: "ruin",
    description: "滅びた王朝の遺構の上に再建された、王侯の名残漂う都。",
  },
];

export const CURATED_NPCS: CuratedNpc[] = [
  // ============== 始まりの街アルダ — スターターハブ ==============
  {
    townName: "始まりの街アルダ",
    name: "酒場の主人カイ",
    role: "酒場の主人",
    dialogue: "客の顔は忘れない。お前さんも、今日は何を飲むんだ？",
    bio: "若い頃は街道を荒らした盗賊だった。一人娘が呪い職に就いてから足を洗い、今は酒場の主人。娘の話だけは口にしない。",
    relations: [
      { name: "村医ロサ", relation: "幼馴染", note: "娘の体調を任せている" },
      { name: "見習い騎士アル", relation: "息子のような存在" },
    ],
  },
  {
    townName: "始まりの街アルダ",
    name: "村医ロサ",
    role: "村医",
    dialogue: "怪我は隠さず見せて。手当てが遅れると命に関わるから。",
    bio: "戦地から戻った軍医。前線で看取った仲間の数を毎晩数える。子供の患者には決して泣き顔を見せない。",
    relations: [
      { name: "酒場の主人カイ", relation: "幼馴染" },
      { name: "司祭オリヴァ", relation: "週一の囲碁仲間" },
    ],
  },
  {
    townName: "始まりの街アルダ",
    name: "司祭オリヴァ",
    role: "司祭",
    dialogue: "祈りは弱者の盾。怖気づいた時こそ、声に出して唱えなさい。",
    bio: "アルダ生まれアルダ育ち、村人全員の名と命日を覚えている老司祭。墓碑の刻みも自分で行う。",
    relations: [
      { name: "村医ロサ", relation: "週一の囲碁仲間" },
    ],
  },
  {
    townName: "始まりの街アルダ",
    name: "鍛冶屋ブルム",
    role: "鍛冶屋",
    dialogue: "話しかけるな、鎚が逃げる。…ああ、注文か。三日後だ。",
    bio: "寡黙な鍛冶屋。素面ではほぼ無口だが、酒が入ると 30 年分の昔話が止まらなくなる。",
    relations: [
      { name: "酒場の主人カイ", relation: "酒呑み仲間" },
    ],
  },
  {
    townName: "始まりの街アルダ",
    name: "宿屋の女将リナ",
    role: "宿屋の女将",
    dialogue: "顔は忘れない。あんた、3 年前にもうちに泊まったろ？",
    bio: "元踊り子。一度泊めた客の顔と名前を全て記憶している。記録は紙ではなく頭の中。",
  },
  {
    townName: "始まりの街アルダ",
    name: "見習い騎士アル",
    role: "見習い騎士",
    dialogue: "見張りは退屈じゃない。世界の縁を見ている気がするんだ。",
    bio: "14 歳。街の見張り役を志願し、夢は王宮騎士。剣はカイの酒場の裏で素振りする。",
    relations: [
      { name: "酒場の主人カイ", relation: "師匠のような存在" },
    ],
  },

  // ============== 湖畔の街ミルレ — 商人・職人系 ==============
  {
    townName: "湖畔の街ミルレ",
    name: "商会主ヴェル",
    role: "商会主",
    dialogue: "信用は通貨より重い。一度失えば取り戻せん。",
    bio: "ミルレ最大の商会を率いる。隣街に妹を残しており、年に二度だけ会いに行く。表情を変えないと評される。",
    relations: [
      { name: "両替商ゾロス", relation: "ライバル兼共犯" },
    ],
  },
  {
    townName: "湖畔の街ミルレ",
    name: "網元の老人タオ",
    role: "網元",
    dialogue: "湖の主は朝靄の中にしか出ん。お前さん、見たいなら 4 時に来な。",
    bio: "50 年湖で網を打ってきた漁師の長。湖の主と呼ばれる巨魚を一度だけ見たという。誰も信じないが、本人は確信している。",
  },
  {
    townName: "湖畔の街ミルレ",
    name: "織工の娘リン",
    role: "織工",
    dialogue: "色は混ぜないと出ない色がある。失敗の中にしか答えがないことも。",
    bio: "父の織物店を継ぐ予定の若き職人。染料の調合に独特の感覚を持ち、村人皆が彼女に布を頼む。",
    relations: [
      { name: "酒場の歌い手ピラ", relation: "親友" },
    ],
  },
  {
    townName: "湖畔の街ミルレ",
    name: "酒場の歌い手ピラ",
    role: "歌い手",
    dialogue: "曲は港町ごとに違う。お前さんの故郷の歌、今夜歌ってやるよ。",
    bio: "流れ者。各地の港町で覚えた民謡を毎晩歌う。手紙のような曲を歌い、客はそれぞれの故郷を思い出す。",
    relations: [
      { name: "織工の娘リン", relation: "親友" },
    ],
  },
  {
    townName: "湖畔の街ミルレ",
    name: "両替商ゾロス",
    role: "両替商",
    dialogue: "金の流れを見れば世界が見える。戦争の予兆も、恋の終わりも。",
    bio: "ミルレで 30 年両替を続けるベテラン。世界の経済の動きを誰よりも早く察知すると言われる。",
    relations: [
      { name: "商会主ヴェル", relation: "ライバル兼共犯" },
    ],
  },
  {
    townName: "湖畔の街ミルレ",
    name: "港の監視員モート",
    role: "港の監視員",
    dialogue: "密航は見抜く。同じ手をかつて使った身だからな。",
    bio: "若い頃は海賊船の航海士。今は港で密航を取り締まる側に立つ。元仲間が現れたら見逃すか、捕まえるか、毎度迷う。",
  },

  // ============== 霧の街ヴェルナ — 暗部・密儀系 ==============
  {
    townName: "霧の街ヴェルナ",
    name: "賭場の主シャズ",
    role: "賭場の主",
    dialogue: "勝率は 6 割で十分。10 割を狙う奴から金を巻き上げるのが商売。",
    bio: "霧の街で最大の賭場を経営。貴族の借金証文を多数握っており、政治的にも無視できない存在。",
  },
  {
    townName: "霧の街ヴェルナ",
    name: "古書店主エラ",
    role: "古書店主",
    dialogue: "禁書はあるよ。買うのは構わんが、教団の追手が来ても私のせいじゃない。",
    bio: "禁書を扱う寡黙な店主。教団に追われており、店の奥には脱出口がある。",
    relations: [
      { name: "元神官の流れ者ナス", relation: "情報源" },
    ],
  },
  {
    townName: "霧の街ヴェルナ",
    name: "薬師の老婆ヌル",
    role: "薬師",
    dialogue: "薬と毒は同じ手で作る。お前さんが何を欲しいかは聞かんよ。",
    bio: "ヴェルナの裏路地で薬を調合する老婆。子供には甘く、大人には厳しい。子供の患者には毒を売らない。",
  },
  {
    townName: "霧の街ヴェルナ",
    name: "影使いの仲介人ゴン",
    role: "仲介人",
    dialogue: "依頼は受ける。実行はしない。ただ繋ぐだけだ。",
    bio: "暗殺の依頼を受け、実行者に繋ぐ仲介役。本人は人を殺さない。中継料だけで生計を立てる。",
  },
  {
    townName: "霧の街ヴェルナ",
    name: "占い師のミラ",
    role: "占い師",
    dialogue: "嘘はつかない。料金は心の重さでもらう。決まりは無い。",
    bio: "嘘をつかず、嘘を見抜く占い師。料金は決まっておらず、客の心の重さに応じて受け取る。",
  },
  {
    townName: "霧の街ヴェルナ",
    name: "元神官の流れ者ナス",
    role: "流れ者",
    dialogue: "教団から逃げてきた。今は霧の中で息を潜めている。",
    bio: "元神官。教義に異を唱えて追放され、霧の街に潜む。教団の内情を多く知っており、古書店主エラに情報を流す。",
    relations: [
      { name: "古書店主エラ", relation: "協力者" },
    ],
  },

  // ============== 鐘塔の都ベルクラート — 知識・古き者系 ==============
  {
    townName: "鐘塔の都ベルクラート",
    name: "鐘番の老人ベルル",
    role: "鐘番",
    dialogue: "鐘の音色で天気が分かる。重い音は雨、澄んだ音は晴れ。",
    bio: "100 年近く鐘を鳴らし続ける老人。鐘の振動から街全体の気配を読む。歩く時計とも呼ばれる。",
    relations: [
      { name: "巫女のセラフィ", relation: "共に鐘を守る" },
    ],
  },
  {
    townName: "鐘塔の都ベルクラート",
    name: "書庫司書グレタ",
    role: "司書",
    dialogue: "5 つの言語が読めれば、世界の半分が見える。半分だけだがね。",
    bio: "鐘塔書庫の司書。5 言語を流暢に操り、古文書の真贋を一目で見分ける。本人は本以外を信じない。",
    relations: [
      { name: "異界研究者ノル", relation: "研究仲間" },
    ],
  },
  {
    townName: "鐘塔の都ベルクラート",
    name: "時計職人サフォ",
    role: "時計職人",
    dialogue: "時間は流れない。刻むものだ。鐘塔の大時計が証拠さ。",
    bio: "鐘塔の大時計を管理する技工師。世界一精密な機構を組むと評され、各国の貴族から修理依頼が絶えない。",
  },
  {
    townName: "鐘塔の都ベルクラート",
    name: "鳥語使いコロ",
    role: "鳥語使い",
    dialogue: "鳩には鳩の言葉、烏には烏の言葉。お前さんの伝言、どっちで送る？",
    bio: "鳥と会話できる伝令。街中の連絡を一手に担う。鳥が選ぶ会話相手しか信用しない。",
  },
  {
    townName: "鐘塔の都ベルクラート",
    name: "異界研究者ノル",
    role: "研究者",
    dialogue: "異界の文字は読めるが、意味は半分しか分からん。残りは祈りで埋める。",
    bio: "禁書館出身。異界の文字を研究中で、本人の言うところでは『翻訳が完成すれば世界の理が一行で書ける』らしい。",
    relations: [
      { name: "書庫司書グレタ", relation: "研究仲間" },
    ],
  },
  {
    townName: "鐘塔の都ベルクラート",
    name: "巫女のセラフィ",
    role: "巫女",
    dialogue: "鐘の音は神の声に最も近い。雑音を恐れず、ただ聞きなさい。",
    bio: "鐘塔の聖性を保つ巫女。年に三度、鐘の鳴り方が変わる日に神託を授かるという。",
    relations: [
      { name: "鐘番の老人ベルル", relation: "共に鐘を守る" },
    ],
  },

  // ============== 古王国の都ヴェスペル — 王侯・遺跡系 ==============
  {
    townName: "古王国の都ヴェスペル",
    name: "遺跡守ザカリ",
    role: "遺跡守",
    dialogue: "王の墓を踏むな。王家の血は今も地中で流れている。",
    bio: "古王朝の最後の王の墓を守り続ける老兵。王家の血筋を全て暗唱でき、王朝崩壊の真相を一人だけ知る。",
    relations: [
      { name: "元王宮魔導師ドラン", relation: "旧友" },
    ],
  },
  {
    townName: "古王国の都ヴェスペル",
    name: "元王宮料理人テレザ",
    role: "料理人",
    dialogue: "王の食卓は今も再現できる。だが、誰のために作ろうかね。",
    bio: "滅びた王朝の最後の宮廷料理人。王の好物の塩釜焼きの作り方を、街の小さな食堂で振る舞う。",
  },
  {
    townName: "古王国の都ヴェスペル",
    name: "石工の頭領ガラム",
    role: "石工",
    dialogue: "石像に魂は宿る。彫り終えた像が動き出す日もあるさ。",
    bio: "ヴェスペルの石工頭領。古王朝の彫像修復を一手に引き受ける。彫った像が一夜で位置を変えていたという伝説の継承者。",
  },
  {
    townName: "古王国の都ヴェスペル",
    name: "王宮道化師ピエト",
    role: "道化師",
    dialogue: "笑いは歴史を運ぶ。王の死も、笑い話に変えられる。",
    bio: "王朝崩壊後に亡命した貴族の末裔。今は街角で道化師として歴史を語る。一見軽口だが、語る内容は史書より正確。",
  },
  {
    townName: "古王国の都ヴェスペル",
    name: "元王宮魔導師ドラン",
    role: "魔導師",
    dialogue: "王朝が崩れる時、私は塔の上で星を見ていた。何も止められなかった。",
    bio: "古王朝最後の宮廷魔導師。王朝崩壊を目撃した数少ない生き残り。塔の上で世界の動きを観測し続ける。",
    relations: [
      { name: "遺跡守ザカリ", relation: "旧友" },
      { name: "黒衣の使者ヴァレン", relation: "王命を共に受けた" },
    ],
  },
  {
    townName: "古王国の都ヴェスペル",
    name: "黒衣の使者ヴァレン",
    role: "使者",
    dialogue: "王の遺命は果たさねばならん。50 年経っても、命令は命令だ。",
    bio: "古王朝最後の王の遺命を受け、50 年世界を旅する使者。何を運んでいるのか、本人以外誰も知らない。",
    relations: [
      { name: "元王宮魔導師ドラン", relation: "王命を共に受けた" },
    ],
  },
];
