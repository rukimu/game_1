import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getContentGenerationService, generationLabel, logGeneratedContent } from "@/lib/generation/service";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  const town = await prisma.town.findUnique({ where: { id: params.id } });
  if (!town) return NextResponse.json({ error: "no town" }, { status: 404 });
  const gen = getContentGenerationService();
  const text = await gen.generateRumor({ townName: town.name });
  const rumor = await prisma.tavernRumor.create({
    data: { townId: town.id, text, generatedBy: generationLabel() },
  });
  await logGeneratedContent({
    type: "rumor",
    refId: rumor.id,
    title: `噂(${town.name})`,
    body: text,
    townId: town.id,
  });
  return NextResponse.json({ rumor });
}
