// Daily challenge system. Each character gets 3 randomized objectives per
// calendar day, ensuring there's always a "today's task" reason to log in.
// Clearing all three on a given day awards a bonus chest (extra gold + EXP +
// achievement chance).
//
// Generated lazily on first /town visit each day. Tied to characterId + date,
// so different characters on the same account get independent challenges.

import { prisma } from "@/lib/prisma";
import { awardExpAndGold } from "@/lib/leveling";
import { awardAchievement } from "@/lib/achievements";

export type DailyTemplate = {
  goalType: "defeat_enemy" | "win_battles" | "drop_gear" | "clear_dungeon" | "spend_gold" | "talk_npc";
  // Range of goal counts (inclusive). The actual count is rolled per generation.
  goalRange: [number, number];
  description: (count: number) => string;
  rewardExpRange: [number, number];
  rewardGoldRange: [number, number];
};

const TEMPLATES: DailyTemplate[] = [
  {
    goalType: "defeat_enemy",
    goalRange: [10, 40],
    description: (n) => `今日 ${n} 体の敵を倒す`,
    rewardExpRange: [120, 400],
    rewardGoldRange: [80, 300],
  },
  {
    goalType: "win_battles",
    goalRange: [3, 8],
    description: (n) => `今日 ${n} 戦に勝利する`,
    rewardExpRange: [200, 600],
    rewardGoldRange: [120, 400],
  },
  {
    goalType: "drop_gear",
    goalRange: [1, 3],
    description: (n) => `今日 ${n} 個の装備を戦闘で入手する`,
    rewardExpRange: [150, 400],
    rewardGoldRange: [200, 500],
  },
  {
    goalType: "clear_dungeon",
    goalRange: [1, 1],
    description: () => `今日 ダンジョンを 1 回踏破する（撤退でも可）`,
    rewardExpRange: [400, 800],
    rewardGoldRange: [300, 600],
  },
  {
    goalType: "spend_gold",
    goalRange: [200, 800],
    description: (n) => `今日 ${n}G 以上を使う（店・鍛冶・宿屋等）`,
    rewardExpRange: [80, 200],
    rewardGoldRange: [40, 150],
  },
  {
    goalType: "talk_npc",
    goalRange: [3, 6],
    description: (n) => `今日 ${n} 人の NPC に会う（街を訪れる）`,
    rewardExpRange: [80, 150],
    rewardGoldRange: [60, 150],
  },
];

const TODAY = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function intBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

// Lazily ensure the character has 3 daily challenges for today. Idempotent —
// existing rows are kept; missing slots are filled.
export async function ensureDailyChallenges(characterId: string) {
  const date = TODAY();
  const existing = await prisma.dailyChallenge.findMany({
    where: { characterId, date },
    orderBy: { slotIndex: "asc" },
  });
  if (existing.length >= 3) return existing;

  const filledSlots = new Set(existing.map((e) => e.slotIndex));
  const needed = [0, 1, 2].filter((s) => !filledSlots.has(s));
  const templates = pickN(TEMPLATES, needed.length);
  for (let i = 0; i < needed.length; i++) {
    const tpl = templates[i] ?? TEMPLATES[i % TEMPLATES.length];
    const goalCount = intBetween(tpl.goalRange[0], tpl.goalRange[1]);
    await prisma.dailyChallenge.create({
      data: {
        characterId,
        date,
        slotIndex: needed[i],
        goalType: tpl.goalType,
        goalParam: null,
        goalCount,
        rewardExp: intBetween(tpl.rewardExpRange[0], tpl.rewardExpRange[1]),
        rewardGold: intBetween(tpl.rewardGoldRange[0], tpl.rewardGoldRange[1]),
      },
    });
  }
  return prisma.dailyChallenge.findMany({
    where: { characterId, date },
    orderBy: { slotIndex: "asc" },
  });
}

export async function listTodayChallenges(characterId: string) {
  return ensureDailyChallenges(characterId);
}

export function describeDailyChallenge(d: { goalType: string; goalCount: number }): string {
  const tpl = TEMPLATES.find((t) => t.goalType === d.goalType);
  if (!tpl) return `${d.goalType} ${d.goalCount}`;
  return tpl.description(d.goalCount);
}

// Increment daily challenge progress. Pays out reward + bonus chest when all 3
// are completed.
export async function tickDailyChallenge(args: {
  characterId: string;
  goalType: string;
  delta: number;
}) {
  const date = TODAY();
  const matching = await prisma.dailyChallenge.findMany({
    where: {
      characterId: args.characterId,
      date,
      completedAt: null,
      goalType: args.goalType,
    },
  });
  const completed: typeof matching = [];
  for (const c of matching) {
    const next = c.progress + args.delta;
    if (next >= c.goalCount) {
      await prisma.dailyChallenge.update({
        where: { id: c.id },
        data: { progress: next, completedAt: new Date() },
      });
      completed.push(c);
      try { await awardExpAndGold(args.characterId, c.rewardExp, c.rewardGold); } catch { /* non-fatal */ }
    } else {
      await prisma.dailyChallenge.update({
        where: { id: c.id },
        data: { progress: next },
      });
    }
  }

  // Bonus chest if all 3 today are now complete.
  if (completed.length > 0) {
    const allToday = await prisma.dailyChallenge.findMany({
      where: { characterId: args.characterId, date },
    });
    if (allToday.length === 3 && allToday.every((x) => x.completedAt)) {
      // Award once: detect via a marker achievement slug per date.
      const slug = `daily_clear_${date}`;
      try {
        await prisma.achievement.upsert({
          where: { slug },
          create: {
            slug,
            title: `${date} 全クリア`,
            description: `${date} のデイリーチャレンジ 3 件すべてを達成した。`,
            rarity: "common",
            hidden: true,
          },
          update: {},
        });
        const granted = await awardAchievement(slug, args.characterId);
        if (granted) {
          // Bonus reward
          await awardExpAndGold(args.characterId, 600, 500);
        }
      } catch { /* non-fatal */ }
    }
  }
  return completed;
}
