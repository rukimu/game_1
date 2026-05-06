import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { applyJobBaseStats } from "@/lib/leveling";
import { sanitizeName } from "@/lib/sanitize";
import { pickBio, scoreQuiz } from "@/lib/quiz";
import { acceptFirstOnboardingQuest } from "@/lib/onboarding";
import { applyRateLimitOrThrow } from "@/lib/withGuards";
import { RATE_LIMITS } from "@/lib/rateLimit";

const schema = z.object({
  name: z.string().min(2).max(24),
  // Either provide quiz answers (preferred) or an explicit jobName fallback.
  quizAnswers: z.record(z.string()).optional(),
  jobName: z.string().min(1).max(40).optional(),
});

export async function GET() {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  const characters = await prisma.character.findMany({
    where: { userId: user.id },
    include: { jobHistory: { include: { job: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ characters, slots: user.characterSlots });
}

export async function POST(req: Request) {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  // Cycle 57 (Phase 4-b 続): キャラ作成は CHARACTER_CREATE preset (5 / 60s)
  // で rate limit。ボット連続作成を防ぐ。
  try {
    applyRateLimitOrThrow(`CHARACTER_CREATE:${user.id}`, RATE_LIMITS.CHARACTER_CREATE);
  } catch (resp) {
    if (resp instanceof Response) return resp;
    throw resp;
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  const name = sanitizeName(parsed.data.name);
  if (!name) return NextResponse.json({ error: "名前が不正です" }, { status: 400 });
  const dup = await prisma.character.findUnique({ where: { name } });
  if (dup) return NextResponse.json({ error: "その名前は既に使われています" }, { status: 400 });
  const count = await prisma.character.count({ where: { userId: user.id } });
  if (count >= user.characterSlots) return NextResponse.json({ error: "キャラクター枠が一杯です" }, { status: 400 });

  let jobName = parsed.data.jobName;
  let quizScores: any = null;
  let bio: string | null = null;
  if (parsed.data.quizAnswers) {
    const result = scoreQuiz(parsed.data.quizAnswers);
    quizScores = result;
    bio = pickBio(result.topArchetype);
    // Only fall back to the quiz-suggested job if the caller didn't
    // explicitly request one (e.g. a curated pick from C31-b).
    if (!jobName) jobName = result.jobName;
  }
  if (!jobName) return NextResponse.json({ error: "職業が決まりませんでした" }, { status: 400 });

  const job = await prisma.job.findUnique({ where: { name: jobName } });
  if (!job) return NextResponse.json({ error: "職業が見つかりません" }, { status: 400 });
  // Cycle 31: a curated job's signature bio replaces the procedural
  // quiz-template — that's the whole point of a hand-crafted personality.
  if (job.curated && job.signatureBio) {
    bio = job.signatureBio;
  }
  const base = applyJobBaseStats(JSON.parse(job.baseStats));
  const town = await prisma.town.findFirst({ orderBy: { danger: "asc" } });
  const character = await prisma.character.create({
    data: {
      userId: user.id,
      name,
      ...base,
      currentJobId: job.id,
      currentTownId: town?.id,
      bio,
      quizAnswers: parsed.data.quizAnswers ? JSON.stringify(parsed.data.quizAnswers) : null,
      jobHistory: { create: [{ jobId: job.id }] },
      jobMastery: { create: [{ jobId: job.id, mastery: 0 }] },
    },
  });
  // grant starter equipment
  const starter = await prisma.item.findFirst({ where: { name: "薬草" } });
  if (starter) {
    await prisma.inventoryItem.create({ data: { characterId: character.id, itemId: starter.id, quantity: 5 } });
  }
  // Cycle 41-4: 新規キャラに onboarding 1/5 を自動受注。失敗しても致命では
  // ないので character 作成自体は成功させる (seed 未実行 DB の互換性)。
  try {
    await acceptFirstOnboardingQuest(character.id);
  } catch (err) {
    console.error("[onboarding] acceptFirst failed:", err);
  }
  return NextResponse.json({
    character,
    job: { name: job.name, description: job.description, category: job.category },
    bio,
    quizResult: quizScores,
  });
}
