import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { createDungeonRun } from "@/lib/dungeon";

export async function GET() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const runs = await prisma.dungeonRun.findMany({
    where: { characterId: c.id },
    orderBy: { startedAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ runs });
}

export async function POST() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  // disallow if there's an active run
  const active = await prisma.dungeonRun.findFirst({ where: { characterId: c.id, status: "active" } });
  if (active) return NextResponse.json({ run: active, alreadyActive: true });
  const run = await createDungeonRun(c.id);
  return NextResponse.json({ run });
}
