// Mastery quests — long-form progression tied to job category.
//
// Three tiers per archetype, unlocked at Lv15 / 30 / 45. Each quest awards
// gold + EXP + a permanent stat bump + a unique title. Designed to give
// Lv30-45 players concrete goals other than "grind dungeon and forge".
//
// Quests are auto-issued lazily — when a player visits /mastery, any quests
// they've unlocked but not yet started are inserted. Progress is recorded
// via hooks in battle.ts (defeat_enemy, win_battles), themed-dungeon clear,
// and town visit.

import { prisma } from "@/lib/prisma";
import { awardExpAndGold } from "@/lib/leveling";
import { awardAchievement } from "@/lib/achievements";
import { ARCHETYPE_LABEL_JP } from "@/lib/itemGen";

export type MasteryDef = {
  jobCategory: string;
  tier: 1 | 2 | 3;
  unlockLevel: number;
  title: string;
  description: string;
  goalType: "defeat_enemy" | "win_battles" | "use_skill_count" | "clear_themed_dungeon" | "explore_towns";
  goalParam?: string;
  goalCount: number;
  rewardGold: number;
  rewardExp: number;
  rewardStat?: string;       // "atk:2"
  rewardTitleSlug?: string;  // optional title to wear
};

// Per-archetype mastery progression. Three tiers each. Tier 3 always grants
// a wearable title. Mid tiers tend to grant a stat bonus.
export const MASTERY_QUESTS: MasteryDef[] = [
  // -- Warrior --
  { jobCategory: "warrior", tier: 1, unlockLevel: 15, title: "戦士の修練・初", description: "戦士の道を歩む者が最初に踏むべき試練。50 体を一刀のもとに倒す。",
    goalType: "defeat_enemy", goalCount: 50, rewardGold: 500, rewardExp: 600, rewardStat: "atk:2" },
  { jobCategory: "warrior", tier: 2, unlockLevel: 30, title: "戦士の修練・中", description: "戦塵をかき分け、20 戦の勝利を重ねる。",
    goalType: "win_battles", goalCount: 20, rewardGold: 1500, rewardExp: 2000, rewardStat: "atk:3" },
  { jobCategory: "warrior", tier: 3, unlockLevel: 45, title: "戦士の修練・極", description: "鐘塔の地下を踏破せよ。最深部の鐘番を倒した者だけが、戦士の極みに至る。",
    goalType: "clear_themed_dungeon", goalParam: "bell", goalCount: 1, rewardGold: 5000, rewardExp: 6000, rewardStat: "atk:5", rewardTitleSlug: "鐘を鳴らす剣" },

  // -- Mage --
  { jobCategory: "mage", tier: 1, unlockLevel: 15, title: "魔導の修練・初", description: "詠唱の手応えを掴むため、スキルを 100 回唱える。",
    goalType: "use_skill_count", goalCount: 100, rewardGold: 500, rewardExp: 600, rewardStat: "mat:2" },
  { jobCategory: "mage", tier: 2, unlockLevel: 30, title: "魔導の修練・中", description: "禁書を読み終えた者を求め、忘却の図書館を踏破する。",
    goalType: "clear_themed_dungeon", goalParam: "library", goalCount: 1, rewardGold: 1500, rewardExp: 2000, rewardStat: "mat:3" },
  { jobCategory: "mage", tier: 3, unlockLevel: 45, title: "魔導の修練・極", description: "霜帝の塔を踏破し、極寒の中で詠唱を完成させよ。",
    goalType: "clear_themed_dungeon", goalParam: "tower", goalCount: 1, rewardGold: 5000, rewardExp: 6000, rewardStat: "mat:5", rewardTitleSlug: "霜詠みの賢者" },

  // -- Rogue --
  { jobCategory: "rogue", tier: 1, unlockLevel: 15, title: "盗賊の修練・初", description: "影を踏むように 80 体を仕留める。",
    goalType: "defeat_enemy", goalCount: 80, rewardGold: 500, rewardExp: 600, rewardStat: "spd:2" },
  { jobCategory: "rogue", tier: 2, unlockLevel: 30, title: "盗賊の修練・中", description: "鏡映の湖底に沈み、双子魚の影を奪い返す。",
    goalType: "clear_themed_dungeon", goalParam: "lake", goalCount: 1, rewardGold: 1500, rewardExp: 2000, rewardStat: "spd:3" },
  { jobCategory: "rogue", tier: 3, unlockLevel: 45, title: "盗賊の修練・極", description: "30 戦に連勝し、影の主と呼ばれる資格を示す。",
    goalType: "win_battles", goalCount: 30, rewardGold: 5000, rewardExp: 6000, rewardStat: "spd:4", rewardTitleSlug: "影渡りの主" },

  // -- Cleric --
  { jobCategory: "cleric", tier: 1, unlockLevel: 15, title: "神官の修練・初", description: "祈りの力を確かにするため、回復・支援スキルを 80 回唱える。",
    goalType: "use_skill_count", goalCount: 80, rewardGold: 500, rewardExp: 600, rewardStat: "mdf:2" },
  { jobCategory: "cleric", tier: 2, unlockLevel: 30, title: "神官の修練・中", description: "灰の唄の祭壇に立ち、最後の歌い手と対峙せよ。",
    goalType: "clear_themed_dungeon", goalParam: "altar", goalCount: 1, rewardGold: 1500, rewardExp: 2000, rewardStat: "mdf:3" },
  { jobCategory: "cleric", tier: 3, unlockLevel: 45, title: "神官の修練・極", description: "25 戦の勝利を仲間と共にし、人を救う者の証を立てる。",
    goalType: "win_battles", goalCount: 25, rewardGold: 5000, rewardExp: 6000, rewardStat: "mdf:4", rewardTitleSlug: "灰を祓う祈り手" },

  // -- Support --
  { jobCategory: "support", tier: 1, unlockLevel: 15, title: "支援の修練・初", description: "歌で仲間を導く。スキルを 60 回詠唱する。",
    goalType: "use_skill_count", goalCount: 60, rewardGold: 500, rewardExp: 600, rewardStat: "mat:1" },
  { jobCategory: "support", tier: 2, unlockLevel: 30, title: "支援の修練・中", description: "5 つの異なる街を巡り、世界の音を集める。",
    goalType: "explore_towns", goalCount: 5, rewardGold: 1500, rewardExp: 2000, rewardStat: "spd:2" },
  { jobCategory: "support", tier: 3, unlockLevel: 45, title: "支援の修練・極", description: "鏡映の湖底を踏破し、湖底の音を歌に変える。",
    goalType: "clear_themed_dungeon", goalParam: "lake", goalCount: 1, rewardGold: 5000, rewardExp: 6000, rewardStat: "mat:3", rewardTitleSlug: "湖底を歌う者" },

  // -- Craft --
  { jobCategory: "craft", tier: 1, unlockLevel: 15, title: "職人の修練・初", description: "戦塵から学ぶ。100 体を倒して素材の理を知る。",
    goalType: "defeat_enemy", goalCount: 100, rewardGold: 700, rewardExp: 500, rewardStat: "def:2" },
  { jobCategory: "craft", tier: 2, unlockLevel: 30, title: "職人の修練・中", description: "鏡映の湖底で、原初の鉱を見極める。",
    goalType: "clear_themed_dungeon", goalParam: "lake", goalCount: 1, rewardGold: 2000, rewardExp: 1500, rewardStat: "def:3" },
  { jobCategory: "craft", tier: 3, unlockLevel: 45, title: "職人の修練・極", description: "鐘塔の地下に潜り、鳴り止まぬ鐘の中で工房を立てる。",
    goalType: "clear_themed_dungeon", goalParam: "bell", goalCount: 1, rewardGold: 6000, rewardExp: 5000, rewardStat: "def:5", rewardTitleSlug: "鳴鐘の工人" },

  // -- Heretic --
  { jobCategory: "heretic", tier: 1, unlockLevel: 15, title: "異端の修練・初", description: "禁書の内容を、自らの肉体に刻む。スキルを 70 回唱える。",
    goalType: "use_skill_count", goalCount: 70, rewardGold: 600, rewardExp: 700, rewardStat: "mat:2" },
  { jobCategory: "heretic", tier: 2, unlockLevel: 30, title: "異端の修練・中", description: "忘却の図書館を踏破し、禁書の続きを読む。",
    goalType: "clear_themed_dungeon", goalParam: "library", goalCount: 1, rewardGold: 1800, rewardExp: 2200, rewardStat: "mat:3" },
  { jobCategory: "heretic", tier: 3, unlockLevel: 45, title: "異端の修練・極", description: "灰の唄の祭壇で、歌そのものを書き換える。",
    goalType: "clear_themed_dungeon", goalParam: "altar", goalCount: 1, rewardGold: 6000, rewardExp: 7000, rewardStat: "mat:5", rewardTitleSlug: "禁書を編む者" },

  // -- Rare --
  { jobCategory: "rare", tier: 1, unlockLevel: 15, title: "稀少の修練・初", description: "選ばれた者の証として、60 戦に勝利する。",
    goalType: "win_battles", goalCount: 60, rewardGold: 1000, rewardExp: 1000, rewardStat: "atk:2" },
  { jobCategory: "rare", tier: 2, unlockLevel: 30, title: "稀少の修練・中", description: "鐘塔の地下に挑み、鐘番の試練に応える。",
    goalType: "clear_themed_dungeon", goalParam: "bell", goalCount: 1, rewardGold: 2500, rewardExp: 2500, rewardStat: "atk:3" },
  { jobCategory: "rare", tier: 3, unlockLevel: 45, title: "稀少の修練・極", description: "全 5 専用ダンジョンを踏破し、稀少の名に応える。",
    goalType: "clear_themed_dungeon", goalParam: "ALL", goalCount: 5, rewardGold: 8000, rewardExp: 8000, rewardStat: "atk:6", rewardTitleSlug: "踏破せし稀少" },

  // -- Cursed --
  { jobCategory: "cursed", tier: 1, unlockLevel: 15, title: "呪い職の修練・初", description: "呪いを受け入れた者は、80 体を倒して身を慣らす。",
    goalType: "defeat_enemy", goalCount: 80, rewardGold: 800, rewardExp: 800, rewardStat: "atk:2" },
  { jobCategory: "cursed", tier: 2, unlockLevel: 30, title: "呪い職の修練・中", description: "灰の唄の祭壇で、自らの呪いを歌に変える。",
    goalType: "clear_themed_dungeon", goalParam: "altar", goalCount: 1, rewardGold: 2000, rewardExp: 2500, rewardStat: "atk:3" },
  { jobCategory: "cursed", tier: 3, unlockLevel: 45, title: "呪い職の修練・極", description: "鐘塔の地下で、鳴り続ける鐘の中に呪いの形を見つける。",
    goalType: "clear_themed_dungeon", goalParam: "bell", goalCount: 1, rewardGold: 6500, rewardExp: 7500, rewardStat: "atk:5", rewardTitleSlug: "呪を曳く者" },
];

// Returns the mastery quests defined for a given archetype.
export function masteryDefsFor(jobCategory: string): MasteryDef[] {
  return MASTERY_QUESTS.filter((m) => m.jobCategory === jobCategory).sort((a, b) => a.tier - b.tier);
}

// Lazily ensure the character has rows for every mastery they've unlocked.
export async function ensureMasteryQuests(characterId: string) {
  const c = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, level: true, currentJobId: true },
  });
  if (!c) return;
  const job = c.currentJobId
    ? await prisma.job.findUnique({ where: { id: c.currentJobId }, select: { category: true } })
    : null;
  if (!job) return;
  const defs = masteryDefsFor(job.category).filter((m) => c.level >= m.unlockLevel);
  for (const def of defs) {
    const existing = await prisma.masteryQuest.findUnique({
      where: { characterId_jobCategory_tier: { characterId, jobCategory: def.jobCategory, tier: def.tier } },
    });
    if (existing) continue;
    await prisma.masteryQuest.create({
      data: {
        characterId,
        jobCategory: def.jobCategory,
        tier: def.tier,
        goalType: def.goalType,
        goalParam: def.goalParam ?? null,
        goalCount: def.goalCount,
        rewardGold: def.rewardGold,
        rewardExp: def.rewardExp,
        rewardStat: def.rewardStat ?? null,
        rewardTitleSlug: def.rewardTitleSlug ?? null,
      },
    });
  }
}

export async function listMasteryQuests(characterId: string) {
  await ensureMasteryQuests(characterId);
  return prisma.masteryQuest.findMany({
    where: { characterId },
    orderBy: [{ jobCategory: "asc" }, { tier: "asc" }],
  });
}

// Increment progress for any active mastery quests matching a goal kind.
// Called from battle.ts after wins, themed-dungeon clears, town moves, etc.
export async function tickMasteryProgress(args: {
  characterId: string;
  goalType: string;
  goalParam?: string;
  delta: number;
}) {
  const matching = await prisma.masteryQuest.findMany({
    where: {
      characterId: args.characterId,
      completedAt: null,
      goalType: args.goalType,
      OR: [
        { goalParam: null },
        { goalParam: "ALL" },
        ...(args.goalParam ? [{ goalParam: args.goalParam }] : []),
      ],
    },
  });
  const completed: typeof matching = [];
  for (const m of matching) {
    const newProg = m.progress + args.delta;
    if (newProg >= m.goalCount) {
      await prisma.masteryQuest.update({
        where: { id: m.id },
        data: { progress: newProg, completedAt: new Date() },
      });
      completed.push(m);
    } else {
      await prisma.masteryQuest.update({
        where: { id: m.id },
        data: { progress: newProg },
      });
    }
  }
  // Pay out rewards for newly-completed quests.
  for (const m of completed) {
    try {
      await awardExpAndGold(args.characterId, m.rewardExp, m.rewardGold);
      if (m.rewardStat) await applyStatReward(args.characterId, m.rewardStat);
      if (m.rewardTitleSlug) {
        // Title slug is the achievement title — we don't have a separate title
        // table, so we award an Achievement that holds the title. The slug
        // matches mastery_<category>_<tier>.
        const ach = await ensureMasteryAchievement(m.jobCategory, m.tier, m.rewardTitleSlug);
        if (ach) await awardAchievement(ach, args.characterId);
      }
    } catch { /* non-fatal */ }
  }
  return completed;
}

async function applyStatReward(characterId: string, expr: string) {
  // expr like "atk:2" / "mat:3" / "def:2"
  const [stat, raw] = expr.split(":");
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return;
  const allowed = new Set(["atk", "def", "mat", "mdf", "spd", "luk"]);
  if (!allowed.has(stat)) return;
  await prisma.character.update({
    where: { id: characterId },
    data: { [stat]: { increment: n } } as any,
  });
}

const _ensuredAchSlugs = new Set<string>();
async function ensureMasteryAchievement(category: string, tier: number, titleSlug: string): Promise<string | null> {
  const slug = `mastery_${category}_t${tier}`;
  if (_ensuredAchSlugs.has(slug)) return slug;
  try {
    await prisma.achievement.upsert({
      where: { slug },
      create: {
        slug,
        title: titleSlug,
        description: `${ARCHETYPE_LABEL_JP[category] ?? category} の修練 第${tier}段階を完了した。`,
        titleSlug,
        rarity: tier === 3 ? "legendary" : tier === 2 ? "epic" : "rare",
      },
      update: {
        title: titleSlug,
        titleSlug,
      },
    });
    _ensuredAchSlugs.add(slug);
    return slug;
  } catch {
    return null;
  }
}
