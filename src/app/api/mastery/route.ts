import { NextResponse } from "next/server";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { listMasteryQuests, masteryDefsFor } from "@/lib/mastery";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const job = c.currentJobId
    ? await prisma.job.findUnique({ where: { id: c.currentJobId }, select: { category: true, name: true } })
    : null;
  const quests = await listMasteryQuests(c.id);
  const defs = job ? masteryDefsFor(job.category) : [];
  return NextResponse.json({
    job: job ? { name: job.name, category: job.category } : null,
    level: c.level,
    quests,
    defs,
  });
}
