// Achievement system. World events (boss kill, curse cleanse, mystery solve,
// duel streaks, dungeon clears) call awardAchievement(slug, characterId) and
// the helper either no-ops (already earned) or records + announces.
//
// Definitions live alongside the seed; runtime callers just reference slugs.
// A character can pick which earned title they want to wear on the HUD.

import { prisma } from "@/lib/prisma";

export type AchievementDef = {
  slug: string;
  title: string;
  description: string;
  titleSlug?: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  hidden?: boolean;
};

// Static definitions. Seeded into the Achievement table on startup-time
// reconciliation (ensureAchievementsSeeded below). New slugs added here are
// upserted; existing slugs are never deleted from the table to preserve
// holder records.
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // -- World firsts --
  { slug: "boss_first_kill", title: "本日の英雄", description: "本日のボスを世界で最初に討伐した。", titleSlug: "本日の英雄", rarity: "legendary" },
  { slug: "mystery_first_solver", title: "謎の解明者", description: "シーズンの中心の謎を世界で最初に解き明かした。", titleSlug: "謎の解明者", rarity: "mythic" },

  // -- Curse cycle --
  { slug: "cursed_one", title: "呪われし者", description: "呪い職に身を捧げた。覚悟の代償。", titleSlug: "呪を負う者", rarity: "epic", hidden: true },
  { slug: "cleanse_helper", title: "呪を解く手", description: "他者の呪いを解除する儀式に参加した。", titleSlug: "呪を解く手", rarity: "rare" },
  { slug: "cleanse_thrice", title: "解放者", description: "3 人以上の呪いを解除する儀式に参加した。", titleSlug: "解放者", rarity: "epic" },

  // -- Duels --
  { slug: "first_duel", title: "決闘の作法を学んだ", description: "初めての決闘を行った。", rarity: "common" },
  { slug: "duel_5_wins", title: "決闘者", description: "決闘で 5 勝した。", titleSlug: "決闘者", rarity: "rare" },
  { slug: "duel_25_wins", title: "闘技場の覇者", description: "決闘で 25 勝した。", titleSlug: "闘技場の覇者", rarity: "epic" },

  // -- Battle / hack-and-slash --
  { slug: "first_blood", title: "初陣", description: "最初の戦闘に勝利した。", rarity: "common" },
  { slug: "streak_5", title: "連戦の感", description: "通常戦闘で 5 連勝した。", titleSlug: "連戦の感", rarity: "rare" },
  { slug: "streak_15", title: "百戦錬磨", description: "通常戦闘で 15 連勝した。", titleSlug: "百戦錬磨", rarity: "epic" },
  { slug: "first_legendary", title: "伝説の手触り", description: "伝説ティアの装備を手にした。", titleSlug: "伝説を持つ者", rarity: "legendary" },

  // -- Mystery progress --
  { slug: "clue_first", title: "最初の手がかり", description: "シーズンの謎の手がかりを 1 つ集めた。", rarity: "common" },
  { slug: "clue_half", title: "謎の追跡者", description: "シーズンの謎の手がかりを 4 つ以上集めた。", titleSlug: "謎の追跡者", rarity: "rare" },

  // -- Dungeon --
  { slug: "dungeon_first_clear", title: "深淵の踏破者", description: "ダンジョンを最後まで踏破した。", titleSlug: "踏破者", rarity: "rare" },

  // -- Social / world --
  { slug: "guild_founder", title: "ギルドの礎", description: "ギルドを創設した。", titleSlug: "ギルドの礎", rarity: "rare" },
];

let _seeded = false;

export async function ensureAchievementsSeeded(): Promise<void> {
  if (_seeded) return;
  for (const def of ACHIEVEMENT_DEFS) {
    await prisma.achievement.upsert({
      where: { slug: def.slug },
      create: {
        slug: def.slug,
        title: def.title,
        description: def.description,
        titleSlug: def.titleSlug ?? null,
        rarity: def.rarity,
        hidden: def.hidden ?? false,
      },
      update: {
        title: def.title,
        description: def.description,
        titleSlug: def.titleSlug ?? null,
        rarity: def.rarity,
        hidden: def.hidden ?? false,
      },
    });
  }
  _seeded = true;
}

// Award an achievement to a character. No-op if already earned. Returns the
// freshly-awarded entry or null. Safe to call from any code path; never
// throws on missing slug (logs and returns null instead).
export async function awardAchievement(
  slug: string,
  characterId: string,
): Promise<{ slug: string; title: string; rarity: string } | null> {
  try {
    await ensureAchievementsSeeded();
    const ach = await prisma.achievement.findUnique({ where: { slug } });
    if (!ach) return null;
    const existing = await prisma.characterAchievement.findUnique({
      where: { characterId_achievementId: { characterId, achievementId: ach.id } },
    });
    if (existing) return null;
    await prisma.characterAchievement.create({
      data: { characterId, achievementId: ach.id },
    });
    return { slug: ach.slug, title: ach.title, rarity: ach.rarity };
  } catch (e) {
    return null;
  }
}

export async function awardMany(slugs: string[], characterId: string): Promise<string[]> {
  const earned: string[] = [];
  for (const s of slugs) {
    const r = await awardAchievement(s, characterId);
    if (r) earned.push(r.title);
  }
  return earned;
}

// Get a character's achievements + the full catalog (for the /achievements page).
export async function getCharacterAchievements(characterId: string) {
  await ensureAchievementsSeeded();
  const all = await prisma.achievement.findMany({ orderBy: { rarity: "asc" } });
  const earnedRows = await prisma.characterAchievement.findMany({
    where: { characterId },
    select: { achievementId: true, earnedAt: true },
  });
  const earnedMap = new Map(earnedRows.map((r) => [r.achievementId, r.earnedAt]));
  return all
    .filter((a) => !a.hidden || earnedMap.has(a.id))
    .map((a) => ({
      ...a,
      earned: earnedMap.has(a.id),
      earnedAt: earnedMap.get(a.id) ?? null,
    }));
}
