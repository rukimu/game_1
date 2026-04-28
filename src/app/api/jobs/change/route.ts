import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { applyJobBaseStats } from "@/lib/leveling";
import { getContentGenerationService, generationLabel } from "@/lib/generation/service";

const schema = z.object({
  jobId: z.string(),
  acceptCurse: z.boolean().optional(),
});

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  if (c.isCursed) return NextResponse.json({ error: "呪い職に就いています。解除を依頼してください。" }, { status: 400 });
  const job = await prisma.job.findUnique({ where: { id: parsed.data.jobId } });
  if (!job) return NextResponse.json({ error: "no job" }, { status: 400 });
  // If past job: always allowed unless cursed
  const isPast = c.jobHistory.some((h: any) => h.jobId === job.id);
  if (job.isCursed && !parsed.data.acceptCurse) {
    return NextResponse.json({ error: "これは呪い職です。acceptCurse=true を付けて確認してください。", warning: true }, { status: 400 });
  }
  if (!isPast) {
    // Generate a job change quest if not yet completed
    const existing = await prisma.jobChangeQuest.findFirst({
      where: { characterId: c.id, targetJobId: job.id, completedAt: null },
    });
    if (existing) {
      return NextResponse.json({
        error: "転職課題が未達成です",
        quest: existing,
      }, { status: 400 });
    }
    const completed = await prisma.jobChangeQuest.findFirst({
      where: { characterId: c.id, targetJobId: job.id, completedAt: { not: null } },
    });
    if (!completed) {
      const gen = getContentGenerationService();
      const enemy = await gen.generateEnemy({ level: c.level, seed: `jobquest-${c.id}-${job.id}` });
      const stored = await prisma.enemy.create({
        data: {
          name: enemy.name,
          description: enemy.description,
          level: enemy.level,
          hp: enemy.hp,
          atk: enemy.atk,
          def: enemy.def,
          spd: enemy.spd,
          element: enemy.element,
          weakness: enemy.weakness,
          expReward: enemy.expReward,
          goldReward: enemy.goldReward,
          generatedBy: generationLabel(),
        },
      });
      const goalCount = job.isCursed ? 5 : 3;
      const q = await prisma.jobChangeQuest.create({
        data: {
          characterId: c.id,
          targetJobId: job.id,
          description: `${job.name}を志す者は、${stored.name}を${goalCount}体打ち倒す試練を受けねばならない。`,
          goalType: "defeat_enemy",
          goalParam: stored.name,
          goalCount,
        },
      });
      return NextResponse.json({ quest: q, warning: true, message: "転職課題が発行されました。" }, { status: 200 });
    }
  }
  const base = applyJobBaseStats(JSON.parse(job.baseStats));
  await prisma.character.update({
    where: { id: c.id },
    data: {
      currentJobId: job.id,
      isCursed: job.isCursed,
      ...base,
    },
  });
  // history
  await prisma.characterJobHistory.upsert({
    where: { characterId_jobId: { characterId: c.id, jobId: job.id } },
    update: {},
    create: { characterId: c.id, jobId: job.id },
  });
  await prisma.jobMastery.upsert({
    where: { characterId_jobId: { characterId: c.id, jobId: job.id } },
    update: {},
    create: { characterId: c.id, jobId: job.id, mastery: 0 },
  });
  return NextResponse.json({ ok: true });
}
