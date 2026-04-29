// Boss-of-the-day. Each calendar date gets one named, deterministic boss
// derived from the world state. Players can challenge it once per day per
// party. Defeating a boss broadcasts a server-wide announcement and pumps
// up the affix-tier roll on its drops.
//
// Design notes:
// - "One per day per party" enforced via Battle.bossSlug. The slug is
//   `boss-${YYYYMMDD}` so ANY win on that boss for that day exists in the
//   Battle table; we check before opening another fight.
// - The boss is just a 1-enemy encounter with cranked numbers, NOT a new
//   combat system. Reuses startBattleForParty (with kind="boss").

import { prisma } from "@/lib/prisma";
import { intBetween, makeRng, pick } from "@/lib/rng";
import { getTodayWorldState, jpElementName, type WorldStatePayload } from "@/lib/worldstate";

export type BossOfDay = {
  slug: string;
  date: string;
  name: string;
  level: number;
  element: string;
  weakness: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  expReward: number;
  goldReward: number;
  flavor: string;
  creatureType: "humanoid" | "beast" | "undead" | "magic" | "construct" | "unknown";
};

const BOSS_NAMES: Record<string, string[]> = {
  ominous: [
    "黒鎖の魔狼", "封印を喰らう者", "鐘塔の影", "灯を消す者", "禁書の蛇",
    "塔陰の獣", "影海の主", "黒水の竜", "灰落としの王", "歪んだ封印者",
    "黒誓いの剣", "夜潮の使者", "禁忌を歩む者", "無名の鎧人形", "封じられた獣",
  ],
  anxious: [
    "枯野の老狼", "古道に戻りし鎧人形", "霜の塔の番人", "彷徨う盗賊団の頭",
    "煙の山賊長", "灰被りのリッチ", "霜帝の従者", "錆びついた古老ゴブリン",
    "古道のナーガ", "牙喰みの巨大蟲", "影を引き摺る兵長", "祠の朽ちた守護獣",
  ],
  calm: [
    "古き鍛冶神の試作", "森の長老ゴブリン", "月詠みの番人", "古老の獣使い",
    "湖底の番人", "古王の祠の番獣", "黄金海岸の老海狼", "東風の谷の白狐",
    "聖印の試練の獅子", "塩の砂漠の隊商守護獣", "鏡映の湖の双子魚",
  ],
  festive: [
    "祭の影武者", "灯の年に踊る古き獣", "詩を歪める使者", "祝祭の影法師",
    "古鐘を打つ者", "黎明の歌い手", "祭の最後の客人", "灰の唄の伝承者",
    "鐘塔本城の鐘番", "聖印の祝祭の道化", "鏡映る祭の踊り手",
  ],
};

const BOSS_FLAVORS: Record<string, string[]> = {
  ominous: [
    "鐘塔の方角から下りてきたという。倒した者の名は古い詩に残る。",
    "誰の願いも聞かない。倒すことだけが対話だ。",
    "禁書の中で名を呼ばれ、世界に降りてきた。",
    "周囲の生命の温度を奪う気配がある。",
    "近付くと耳鳴りがする。何かを呟き続けている。",
    "古王国の崩壊の記憶を持つと言われる。",
    "封印が緩んだ夜に最初に現れる存在。",
  ],
  anxious: [
    "街道沿いに居着いた異形。商人たちが街に戻ってこない。",
    "霜が来る前夜にだけ姿を現すという。",
    "古道の終わりに、もう何年も居座っているらしい。",
    "それを見た子供は名前を覚えてしまうと言われる。",
    "街の老人が何度も警告していたが、誰も聞かなかった。",
    "倒し損ねれば次の月にも、次の年にも来る。",
  ],
  calm: [
    "迷い込んだのか、佇んでいるだけにも見える。だが弱者は近付けない。",
    "古い祭りの記憶を持つ存在。倒せば祭りは続けられるという。",
    "森に長く居着く者。土地の主の側面もあるらしい。",
    "強さを試す相手として、古老が認めた存在。",
    "誰かを待ち続けているように、静かに座している。",
    "倒すことより、語り合うことの方が難しいかもしれない。",
  ],
  festive: [
    "祝祭に紛れて踊る、誰の招待客でもない者。",
    "詩に頻出する厄介者。今年もまた現れた。",
    "祭の最終日にしか現れない、踊りの相手。",
    "歌うことで力を増し、歌い負ければ消える。",
    "祝祭の主人公でもあり、敵でもある。倒した方が伝説になる。",
    "祭の参加者の中に、いつの間にか紛れ込んでいる。",
  ],
};

function inferCreatureTypeFromName(name: string): BossOfDay["creatureType"] {
  if (/(鎧人形|機巧)/.test(name)) return "construct";
  if (/(魔狼|狼|獣)/.test(name)) return "beast";
  if (/(影|封印|塔|消す者|番人)/.test(name)) return "magic";
  if (/(盗賊|頭|狩人|兵)/.test(name)) return "humanoid";
  if (/(亡霊|屍|不死)/.test(name)) return "undead";
  return "unknown";
}

// Deterministic per-date boss. Two calls on the same day return the same
// numbers regardless of caller — keeps the boss stable for everyone.
export async function getBossOfDay(): Promise<BossOfDay> {
  const world = await getTodayWorldState();
  return rollBossFor(world);
}

function rollBossFor(world: WorldStatePayload): BossOfDay {
  const rng = makeRng(`boss-${world.date}`);
  // Pick a name pool that matches the day's tone.
  const pool = BOSS_NAMES[world.rumorTone] ?? BOSS_NAMES.calm;
  const flavorPool = BOSS_FLAVORS[world.rumorTone] ?? BOSS_FLAVORS.calm;
  const name = pick(pool, rng);
  // Boss level: skewed by tone. Ominous days are tougher.
  const baseLevel = world.rumorTone === "ominous" ? intBetween(rng, 18, 30)
    : world.rumorTone === "anxious" ? intBetween(rng, 12, 22)
    : world.rumorTone === "festive" ? intBetween(rng, 10, 20)
    : intBetween(rng, 8, 18);
  const level = baseLevel;
  // Beefy: ~3.5x normal enemy stats so a party fight is needed.
  const hp = (22 + level * 8 + intBetween(rng, 0, 10)) * 4;
  const atk = (5 + level * 2 + intBetween(rng, 0, 3)) * 2;
  const def = (1 + level + intBetween(rng, 0, 3)) * 2;
  const spd = (4 + intBetween(rng, 0, level));
  const expReward = (15 + level * (7 + Math.floor(level / 4))) * 5;
  const goldReward = (8 + level * (5 + Math.floor(level / 6))) * 5;
  const slug = `boss-${world.date}`;
  return {
    slug,
    date: world.date,
    name,
    level,
    element: world.weakElement, // boss is themed off today's element
    weakness: world.weakElement === "light" ? "dark"
            : world.weakElement === "dark" ? "light"
            : world.weakElement,
    hp, atk, def, spd, expReward, goldReward,
    flavor: pick(flavorPool, rng),
    creatureType: inferCreatureTypeFromName(name),
  };
}

// Has any character on this party already claimed today's boss?
export async function partyHasClaimedBoss(partyId: string, slug: string): Promise<boolean> {
  const existing = await prisma.battle.findFirst({
    where: { partyId, bossSlug: slug, status: "ended", result: "win" },
    select: { id: true },
  });
  return !!existing;
}

// Has any character at all already gotten the global "first kill" on today's boss?
export async function bossSlainGlobally(slug: string): Promise<boolean> {
  const a = await prisma.announcement.findFirst({
    where: { title: { contains: `[本日のボス討伐] ${slug}` } },
    select: { id: true },
  });
  return !!a;
}
