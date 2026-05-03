import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { JOB_CHANGE_LEVELS } from "@/lib/leveling";
import { logGeneratedContent } from "@/lib/generation/service";

// Stable string hash for deterministic shuffling. Returns a positive 32-bit int.
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

const CATEGORIES_BY_TIER: Record<number, string[]> = {
  10: ["warrior", "mage", "rogue", "cleric", "craft", "support"],
  30: ["warrior", "mage", "rogue", "cleric", "rare", "heretic"],
  50: ["rare", "legendary", "heretic", "cursed"],
};

export async function GET() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const tier = JOB_CHANGE_LEVELS.filter((lv) => c.level >= lv).pop();
  if (!tier) return NextResponse.json({ candidates: [], history: c.jobHistory });
  // Past jobs are always retake-able (except cursed)
  const past = c.jobHistory.map((h: any) => h.job);
  // Generate (or fetch) 3 candidates of varying categories at this tier.
  const cats = CATEGORIES_BY_TIER[tier] ?? CATEGORIES_BY_TIER[10];
  const seedKey = `${c.id}-tier${tier}`;
  // try to find existing candidates already generated for this character/tier
  const existing = await prisma.generatedContent.findMany({
    where: { type: "job_candidate", characterId: c.id, structuredJson: { contains: `"tier":${tier}` } },
  });
  let candidates: any[] = [];
  if (existing.length >= 3) {
    candidates = existing.slice(0, 3).map((g) => JSON.parse(g.structuredJson));
  } else {
    // Cycle 40 Phase 1: 転職候補は curated 職のみから抽出。procedural 生成は
    // FEATURE_FREEZE_LIST.md に基づき封印中 (Phase 2 で procedural 1720 職を
    // curated 化してから復活)。
    const pastJobIds = c.jobHistory.map((h: any) => h.jobId);
    const curatedPool = await prisma.job.findMany({
      where: {
        curated: true,
        category: { in: cats },
        NOT: { id: { in: pastJobIds } },
      },
    });
    // Deterministic shuffle keyed by character + tier so reload returns same
    // 3 candidates until they're committed via generatedContent.
    const seeded = curatedPool
      .map((j) => ({ j, sortKey: hashStr(`${seedKey}-${j.id}`) }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((x) => x.j);
    const selected = seeded.slice(0, 3);
    for (const stored of selected) {
      const payload = {
        jobId: stored.id,
        name: stored.name,
        description: stored.description,
        category: stored.category,
        rank: stored.rank,
        isCursed: stored.isCursed,
        baseStats: JSON.parse(stored.baseStats),
        tier,
      };
      candidates.push(payload);
      await logGeneratedContent({
        type: "job_candidate",
        refId: stored.id,
        title: stored.name,
        body: stored.description,
        structured: payload,
        characterId: c.id,
      });
    }
  }
  return NextResponse.json({ tier, candidates, past, isCursed: c.isCursed });
}
