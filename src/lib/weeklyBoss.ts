// Weekly tiered boss. Three difficulty tiers run side-by-side every week,
// each with its own slug, scaled stats, and reward curve. Slug is keyed by
// ISO week so the boss is stable for everyone for ~7 days.
//
// Tier escalation: T1 is approachable for early-to-mid parties; T3 is a
// genuine endgame check that assumes all members are Lv45+ with epic gear.
// Reusing the existing battle engine (kind=boss_weekly) means each tier
// just produces a beefier 1-enemy encounter — no new combat code needed.

import { prisma } from "@/lib/prisma";
import { intBetween, makeRng, pick } from "@/lib/rng";
import type { EnemyState } from "@/lib/battle";

export type WeeklyBossTier = 1 | 2 | 3;

export type WeeklyBoss = {
  slug: string;
  isoWeek: string;        // e.g. "2026-W18"
  tier: WeeklyBossTier;
  tierLabel: string;
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
  creatureType: EnemyState["creatureType"];
};

const NAMES_BY_TIER: Record<WeeklyBossTier, string[]> = {
  1: [
    "週末の影狼", "古道の暴君ゴブリン", "崩れた塔の番人", "霧渡りの巨大蝶",
    "牙喰みの大蜘蛛", "封印を試みる賊", "枯野の残党長", "夜潮の魚人王",
  ],
  2: [
    "黒誓いの竜騎兵", "禁書を読む霊媒", "封印を解いた古老", "鐘塔の試練者",
    "灰落としの古王", "嵐巣の竜", "蒼炎の番人", "二つ首の鎧人形",
  ],
  3: [
    "灯の年の塔影", "鏡を割らんとする者", "古王国の生き残り", "封印せし者の影法師",
    "古き神の試作品", "凍結する詠唱者", "深淵を覗き続けた者", "黒誓いの完全形",
  ],
};

const FLAVORS: Record<WeeklyBossTier, string[]> = {
  1: [
    "週の終わりに姿を現すという。古道の旅人が囁く。",
    "倒せば一週間は街道が静かになる。逃せば来週も来る。",
    "数百年前の戦の名残。現代の冒険者が試される。",
  ],
  2: [
    "中堅の冒険者では届かない領域。",
    "倒した者の名は鐘塔の刻み目に残るという。",
    "封印が緩んだ夜にだけ、その姿は完全に現れる。",
  ],
  3: [
    "極めて稀少な装備の落とし主。倒した者は世界の語り種となる。",
    "塔の影を背負う最深部の存在。心の準備が要る。",
    "倒すには 1 週間に渡る挑戦の記録すら糧になるという。",
  ],
};

function isoWeekKey(d = new Date()): string {
  // ISO 8601 week. Mondays start the week. Returns "YYYY-Www".
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getCurrentIsoWeek(): string {
  return isoWeekKey();
}

const TIER_CONFIG: Record<WeeklyBossTier, {
  level: [number, number];
  hpMult: number;
  atkMult: number;
  defMult: number;
  expMult: number;
  goldMult: number;
  label: string;
}> = {
  1: { level: [22, 32], hpMult: 4.5, atkMult: 2.0, defMult: 2.0, expMult: 6, goldMult: 6, label: "T1 (中級)" },
  2: { level: [34, 44], hpMult: 6.0, atkMult: 2.4, defMult: 2.4, expMult: 9, goldMult: 9, label: "T2 (上級)" },
  3: { level: [48, 50], hpMult: 8.0, atkMult: 2.8, defMult: 2.8, expMult: 14, goldMult: 14, label: "T3 (頂上)" },
};

function inferType(name: string): EnemyState["creatureType"] {
  if (/(鎧人形|機巧)/.test(name)) return "construct";
  if (/(狼|蜘蛛|蝶|魚|獣|蛇)/.test(name)) return "beast";
  if (/(影|塔|霊|封印|鐘|呪|詠唱|呑む|裂く|漂う)/.test(name)) return "magic";
  if (/(賊|残党|番人|騎兵|生き残り)/.test(name)) return "humanoid";
  if (/(古老|完全形|生まれ変わった)/.test(name)) return "undead";
  return "unknown";
}

export function getWeeklyBoss(tier: WeeklyBossTier, isoWeek = getCurrentIsoWeek()): WeeklyBoss {
  const cfg = TIER_CONFIG[tier];
  const rng = makeRng(`weekly-boss-${isoWeek}-T${tier}`);
  const name = pick(NAMES_BY_TIER[tier], rng);
  const flavor = pick(FLAVORS[tier], rng);
  const level = intBetween(rng, cfg.level[0], cfg.level[1]);
  const element = pick(["fire", "water", "earth", "wind", "light", "dark"], rng);
  const weakness = element === "light" ? "dark" : element === "dark" ? "light" : pick(["fire", "water", "earth", "wind"].filter((e) => e !== element), rng);
  const hp = Math.floor((22 + level * 8 + intBetween(rng, 0, 10)) * cfg.hpMult);
  const atk = Math.floor((5 + level * 2 + intBetween(rng, 0, 3)) * cfg.atkMult);
  const def = Math.floor((1 + level + intBetween(rng, 0, 3)) * cfg.defMult);
  const spd = 6 + intBetween(rng, 0, Math.floor(level / 4));
  const expReward = Math.floor((15 + level * (7 + Math.floor(level / 4))) * cfg.expMult);
  const goldReward = Math.floor((8 + level * (5 + Math.floor(level / 6))) * cfg.goldMult);
  return {
    slug: `boss-weekly-${isoWeek}-T${tier}`,
    isoWeek,
    tier,
    tierLabel: cfg.label,
    name,
    level,
    element,
    weakness,
    hp, atk, def, spd, expReward, goldReward, flavor,
    creatureType: inferType(name),
  };
}

export function getAllWeeklyBosses(isoWeek = getCurrentIsoWeek()): WeeklyBoss[] {
  return [getWeeklyBoss(1, isoWeek), getWeeklyBoss(2, isoWeek), getWeeklyBoss(3, isoWeek)];
}

export async function partyHasClaimedWeeklyBoss(partyId: string, slug: string): Promise<boolean> {
  const existing = await prisma.battle.findFirst({
    where: { partyId, bossSlug: slug, status: "ended", result: "win" },
    select: { id: true },
  });
  return !!existing;
}

// T2 unlocks after the party has cleared T1 this week. T3 unlocks after T2.
// This makes the tier ladder feel earned rather than just "click the hardest".
export async function partyTierUnlocked(partyId: string, tier: WeeklyBossTier, isoWeek = getCurrentIsoWeek()): Promise<boolean> {
  if (tier === 1) return true;
  const prevSlug = `boss-weekly-${isoWeek}-T${tier - 1}`;
  return partyHasClaimedWeeklyBoss(partyId, prevSlug);
}
