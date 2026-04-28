import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generationLabel, getContentGenerationService, logGeneratedContent } from "@/lib/generation/service";

export async function POST(req: Request) {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  const body = await req.json().catch(() => ({}));
  const townId: string | undefined = body.townId;
  const town = townId ? await prisma.town.findUnique({ where: { id: townId } }) : null;
  const gen = getContentGenerationService();
  const q = await gen.generateQuest({ townName: town?.name });
  const quest = await prisma.quest.create({
    data: {
      townId: town?.id ?? null,
      title: q.title,
      description: q.description,
      goalType: q.goalType,
      goalParam: q.goalParam,
      goalCount: q.goalCount,
      expReward: q.expReward,
      goldReward: q.goldReward,
      generatedBy: generationLabel(),
    },
  });
  await logGeneratedContent({
    type: "quest",
    refId: quest.id,
    title: q.title,
    body: q.description,
    structured: q,
    townId: town?.id ?? null,
  });
  return NextResponse.json({ quest });
}
