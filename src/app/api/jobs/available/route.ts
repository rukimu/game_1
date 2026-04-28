import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { JOB_CHANGE_LEVELS } from "@/lib/leveling";
import { getContentGenerationService, generationLabel, logGeneratedContent } from "@/lib/generation/service";

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
    const gen = getContentGenerationService();
    for (let i = 0; i < 3; i++) {
      const cat = cats[i % cats.length];
      const j = await gen.generateJob({ category: cat, level: c.level, seed: `${seedKey}-${i}` });
      // store as Job (so transition can reference it)
      const stored = await prisma.job.upsert({
        where: { name: j.name },
        update: {},
        create: {
          name: j.name,
          description: j.description,
          category: j.category,
          rank: j.rank,
          isCursed: j.isCursed,
          baseStats: JSON.stringify(j.baseStats),
          generatedBy: generationLabel(),
        },
      });
      const payload = { ...j, jobId: stored.id, tier };
      candidates.push(payload);
      await logGeneratedContent({
        type: "job_candidate",
        refId: stored.id,
        title: j.name,
        body: j.description,
        structured: payload,
        characterId: c.id,
      });
    }
  }
  return NextResponse.json({ tier, candidates, past, isCursed: c.isCursed });
}
