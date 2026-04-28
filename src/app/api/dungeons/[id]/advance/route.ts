import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { advanceDungeonFloor } from "@/lib/dungeon";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const run = await prisma.dungeonRun.findFirst({ where: { id: params.id, characterId: c.id } });
  if (!run) return NextResponse.json({ error: "no run" }, { status: 404 });
  try {
    const battle = await advanceDungeonFloor(run.id);
    return NextResponse.json({ battleId: battle?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "error" }, { status: 400 });
  }
}
