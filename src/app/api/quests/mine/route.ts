import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

export async function GET() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const list = await prisma.characterQuest.findMany({
    where: { characterId: c.id },
    include: { quest: true },
    orderBy: { acceptedAt: "desc" },
  });
  return NextResponse.json({ quests: list });
}
