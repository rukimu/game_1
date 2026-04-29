// Procedural town generator. Used by the seed step to populate 100+ towns
// with regional variation, so the world map is large enough that a single
// player rarely visits the same town twice in a session.
//
// The generator is fully deterministic given (regionIdx, slotIdx, themeIdx)
// so re-running the seed produces stable IDs / names / descriptions.

import { makeRng, pick, intBetween } from "@/lib/rng";

export type GeneratedTown = {
  name: string;
  region: string;
  danger: number;
  economy: number;
  security: number;
  innFee: number;
  description: string;
  rumorTrend: string;
};

// 14 regions × 8 slot styles = 112 town themes possible. Town count grows
// linearly: REGIONS.length × townsPerRegion.
const REGIONS = [
  { name: "中央高原", danger: 1, economy: 65, security: 70, theme: "central" },
  { name: "湖畔地方", danger: 2, economy: 60, security: 60, theme: "lakeside" },
  { name: "霧の北縁", danger: 4, economy: 35, security: 35, theme: "mist" },
  { name: "黄金の南海岸", danger: 2, economy: 75, security: 55, theme: "gold" },
  { name: "黒森地方", danger: 5, economy: 30, security: 30, theme: "darkforest" },
  { name: "霜の高山", danger: 4, economy: 40, security: 50, theme: "frost" },
  { name: "塩の砂漠", danger: 3, economy: 45, security: 40, theme: "desert" },
  { name: "古王国の遺跡群", danger: 6, economy: 25, security: 25, theme: "ruin" },
  { name: "東風の谷", danger: 2, economy: 55, security: 60, theme: "valley" },
  { name: "影海岸", danger: 5, economy: 35, security: 30, theme: "shadow" },
  { name: "聖印の高原", danger: 2, economy: 50, security: 70, theme: "holy" },
  { name: "灰落としの平原", danger: 4, economy: 40, security: 40, theme: "ash" },
  { name: "鏡映の湖沼", danger: 3, economy: 45, security: 50, theme: "mirror" },
  { name: "鐘塔の麓", danger: 3, economy: 50, security: 55, theme: "bell" },
];

// Per-theme name pool: prefix nouns (theme-flavored) × base settlement nouns.
const THEME_PREFIX: Record<string, string[]> = {
  central:    ["陽だまりの", "中央", "古道の", "市の", "黄金穂の", "高原の", "碧色の", "杏の"],
  lakeside:   ["湖畔の", "波音の", "蒼穂の", "浅瀬の", "霧入りの", "湖風の", "葦原の", "玻璃の"],
  mist:       ["霧深き", "薄明の", "靄の", "白燭の", "夜霧の", "灰銀の", "黎明前の", "閉ざされた"],
  gold:       ["陽光の", "黄金の", "海風の", "塩漬けの", "南海の", "珊瑚の", "錨の", "古船の"],
  darkforest: ["黒森の", "苔生す", "影差す", "獣道の", "幽闇の", "蔦絡みの", "葉裏の", "牙喰みの"],
  frost:      ["霜の", "凍てつく", "氷牙の", "白雪の", "結晶の", "晶華の", "雪眠りの", "極寒の"],
  desert:     ["塩風の", "蜃気楼の", "砂塵の", "白燼の", "陽炎の", "古い隊商の", "石灰の", "干上がった"],
  ruin:       ["古王国の", "崩れた", "風化した", "封印の", "礎を失った", "遺された", "石棺の", "石碑の"],
  valley:     ["東風の", "鈴音の", "稲穂の", "谷霧の", "渓水の", "藤の", "若葉の", "棚田の"],
  shadow:     ["影の", "黒潮の", "闇月の", "夜潮の", "黒岩の", "影渡りの", "閉漁の", "黄昏の"],
  holy:       ["聖印の", "白翼の", "鎮魂の", "聖鐘の", "祈りの", "巡礼の", "黎明の", "祝祭の"],
  ash:        ["灰被りの", "燃え跡の", "炭塵の", "煙の", "焼け野の", "鉄錆の", "黒煙の", "余燼の"],
  mirror:     ["鏡映りの", "対の", "境界の", "もう一つの", "影合わせの", "玻璃湖の", "湖面の", "二重の"],
  bell:       ["鐘塔の", "鐘の麓の", "響きの", "古鐘の", "祝祭鐘の", "詠み手の", "歌う鐘の", "深音の"],
};
const TOWN_BASE = [
  "街アルダ", "街ミルレ", "街ヴェルナ", "街オラテ", "街ベルム", "街シャルナ",
  "街レイル", "街ノアム", "街シルク", "街ハティス", "街ヴェレイ", "街オクト",
  "街ティウェ", "街アルカ", "街グラム", "街イヴァ", "街ティルナ", "街オウム",
  "街ファルマ", "街ザフィエ", "街ヴィント", "街ロウム", "街エレム", "街サフィラ",
];
// Used to add subtle regional flavor to descriptions.
const THEME_DESC: Record<string, string[]> = {
  central:    ["旅人が最初に立ち寄る、平穏な街。", "市が立つ広場の中心に古い時計塔がある。", "街道が交差する地点に栄えた商人の町。"],
  lakeside:   ["湖の畔に栄えた商人の街。", "桟橋から漁船が出入りする小さな港町。", "湖風が吹き抜ける静かな水郷。"],
  mist:       ["深い霧に覆われた、噂の絶えぬ街。", "夜は霧鐘が鳴り、迷い人を呼び戻す。", "薄明の頃、街の輪郭がぼやけて見える。"],
  gold:       ["珊瑚と塩で栄えた南の港町。", "陽光が常に強く、市場には海の幸が溢れる。", "古い造船所が今も稼働する活気ある街。"],
  darkforest: ["森の縁に張り付くように建つ、用心深い街。", "獣道に近く、夜は門を堅く閉ざす。", "苔と蔦に覆われた、緑深き町。"],
  frost:      ["積雪に閉ざされる時期が長い、辛抱の街。", "氷柱が街路を彩る冬深い町。", "暖炉の煤で空気が常に温い。"],
  desert:     ["隊商の中継地として栄える乾いた町。", "蜃気楼が時折街並みを揺らがせる。", "井戸の数で町の格が決まると言われる。"],
  ruin:       ["古王国の遺跡群を守るように建つ町。", "石棺と廃墟の間で人々が暮らす。", "風化した石碑が街の至る所に立つ。"],
  valley:     ["谷間に拓かれた田園都市。", "棚田が幾重にも連なり、稲穂が黄金色に揺れる。", "渓水に沿って集落が並ぶ。"],
  shadow:     ["黒潮が打ち寄せる薄暗い海岸の町。", "夜の海から物が打ち上げられる。", "黄昏が長く、夕餉が早い。"],
  holy:       ["巡礼者が絶えない聖なる街。", "白い石造りの建物が陽に映える。", "夜明けと夕暮れに鐘が鳴る。"],
  ash:        ["過去の戦火の名残が今も残る街。", "煤けた家々が並び、煙の匂いがする。", "地面のあちこちに灰の堆積がある。"],
  mirror:     ["湖面が街並みを映す不思議な立地。", "建物が左右対称に並ぶ計画都市。", "夜になると湖の中にもう一つの街が見えるという。"],
  bell:       ["古い鐘塔の麓に拓かれた町。", "三時間に一度、鐘が鳴る。", "鐘の響きが家々の屋根に染み込んでいる。"],
};

// Picks a theme-flavored rumorTrend tag for the town.
const THEME_TREND: Record<string, string> = {
  central: "neutral", lakeside: "neutral", mist: "ominous",
  gold: "festive", darkforest: "anxious", frost: "anxious",
  desert: "neutral", ruin: "ominous", valley: "festive",
  shadow: "ominous", holy: "festive", ash: "anxious",
  mirror: "anxious", bell: "neutral",
};

// Generates `townsPerRegion` towns for every region. With the default of 8
// per region × 14 regions, the seed produces 112 unique towns.
export function generateAllTowns(townsPerRegion: number = 8): GeneratedTown[] {
  const out: GeneratedTown[] = [];
  for (let ri = 0; ri < REGIONS.length; ri++) {
    const region = REGIONS[ri];
    const prefixPool = THEME_PREFIX[region.theme] ?? THEME_PREFIX.central;
    const descPool = THEME_DESC[region.theme] ?? THEME_DESC.central;
    for (let si = 0; si < townsPerRegion; si++) {
      const rng = makeRng(`town-${region.theme}-${si}`);
      const prefix = pick(prefixPool, rng);
      const base = pick(TOWN_BASE, rng);
      const name = `${prefix}${base}`;
      // Shift each town's stats around the region baseline so towns within a
      // region still differ.
      const danger = Math.max(1, region.danger + intBetween(rng, -1, 2));
      const economy = Math.max(10, Math.min(95, region.economy + intBetween(rng, -10, 10)));
      const security = Math.max(10, Math.min(95, region.security + intBetween(rng, -10, 10)));
      const innFee = Math.max(10, 20 + danger * 5 + intBetween(rng, -3, 5));
      const description = pick(descPool, rng);
      const rumorTrend = THEME_TREND[region.theme] ?? "neutral";
      out.push({
        name, region: region.name,
        danger, economy, security, innFee, description, rumorTrend,
      });
    }
  }
  return out;
}

// Theme-aware NPC name fragments + role flavor for procedural NPC seeding.
const NPC_GIVEN = [
  "ガロン", "リヤ", "セリオ", "ヤン", "ティナ", "ボルト", "クラエル", "ミラ", "ハティ",
  "オウル", "シエン", "リト", "ノア", "メル", "ザイ", "アフラ", "イヴ", "ジラ", "ケイ",
  "ロウ", "シルカ", "ベル", "ファル", "ホロ", "ニム", "サフィ", "ティウ", "ヴェレ",
];
const NPC_LAST = [
  "", "・古老", "・三代目", "・流浪", "・先代", "・若き", "・無名", "・元行商", "・元軍人",
];
const NPC_ROLES = [
  "酒場の主人", "宿屋の主人", "占い師", "旅の吟遊詩人", "転職屋の老人",
  "古銭収集家", "鍛冶屋", "墓守", "薬売り", "祠の管理人", "市場の番頭",
];

export type GeneratedNpc = {
  name: string;
  role: string;
  dialogue: string;
};

// Each town gets a procedural set of 4-7 NPCs. Names + roles are sampled
// without replacement within a town so a single town doesn't repeat.
export function generateNpcsForTown(townName: string, themeKey: string, count: number = 5): GeneratedNpc[] {
  const rng = makeRng(`npcs-${townName}`);
  const givenPool = [...NPC_GIVEN];
  const rolesPool = [...NPC_ROLES];
  const out: GeneratedNpc[] = [];
  for (let i = 0; i < count; i++) {
    if (givenPool.length === 0 || rolesPool.length === 0) break;
    const gIdx = Math.floor(rng() * givenPool.length);
    const rIdx = Math.floor(rng() * rolesPool.length);
    const given = givenPool.splice(gIdx, 1)[0];
    const role = rolesPool.splice(rIdx, 1)[0];
    const last = pick(NPC_LAST, rng);
    out.push({
      name: `${given}${last}`,
      role,
      dialogue: pick(roleSeedDialogue(role), rng),
    });
  }
  return out;
}

function roleSeedDialogue(role: string): string[] {
  const base: Record<string, string[]> = {
    "酒場の主人":   ["ようこそ。今日も良い噂があるよ。", "席は空いてる。何を聞きに来た？", "新顔だな。一杯おごろう。"],
    "宿屋の主人":   ["寝床は温めてある。", "鎧は脱いで楽にしな。", "夜は静かに過ごしな。"],
    "占い師":       ["あんたの星には未だ見ぬ職が浮かんでいる…。", "今夜は星が騒がしい。", "選択ひとつで未来は変わる。"],
    "旅の吟遊詩人": ["新しい歌を覚えた。聴いていくかい？", "歌の中だけ、世界は静かだ。", "旅人の話を集めている。"],
    "転職屋の老人": ["心当たりがあるなら開いてみろ。", "鍵はあんた自身だ。", "道は閉じない。歩く者が忘れるだけだ。"],
    "古銭収集家":   ["変わった刻印の硬貨を見せてくれないか。", "古銭は語る。耳を傾けろ。"],
    "鍛冶屋":       ["素材があれば直してやる。", "良い武器は使い手を選ぶ。", "錆びた剣も磨けば光るさ。"],
    "墓守":         ["ここでは静かに歩いてくれ。", "供物の備えなら相談に乗る。"],
    "薬売り":       ["薬草あります。", "傷薬もある。値段交渉は応相談。"],
    "祠の管理人":   ["供物を捧げると気分が落ち着く。", "祠は世界の節目を映す。"],
    "市場の番頭":   ["値切るなら早めにな。", "今日は仕入れが少ないんだ。"],
  };
  return base[role] ?? ["ようこそ。"];
}
