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
  ominous: ["黒鎖の魔狼", "封印を喰らう者", "鐘塔の影", "灯を消す者"],
  anxious: ["枯野の老狼", "古道に戻りし鎧人形", "霜の塔の番人", "彷徨う盗賊団の頭"],
  calm:    ["古き鍛冶神の試作", "森の長老ゴブリン", "月詠みの番人"],
  festive: ["祭の影武者", "灯の年に踊る古き獣", "詩を歪める使者"],
};

const BOSS_FLAVORS: Record<string, string[]> = {
  ominous: [
    "鐘塔の方角から下りてきたという。倒した者の名は古い詩に残る。",
    "誰の願いも聞かない。倒すことだけが対話だ。",
  ],
  anxious: [
    "街道沿いに居着いた異形。商人たちが街に戻ってこない。",
    "霜が来る前夜にだけ姿を現すという。",
  ],
  calm: [
    "迷い込んだのか、佇んでいるだけにも見える。だが弱者は近付けない。",
    "古い祭りの記憶を持つ存在。倒せば祭りは続けられるという。",
  ],
  festive: [
    "祝祭に紛れて踊る、誰の招待客でもない者。",
    "詩に頻出する厄介者。今年もまた現れた。",
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
