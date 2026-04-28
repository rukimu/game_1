import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const run = await prisma.dungeonRun.findFirst({
    where: { id: params.id, characterId: c.id },
  });
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  let battle: any = null;
  if (run.currentBattleId) {
    battle = await prisma.battle.findUnique({ where: { id: run.currentBattleId } });
  }
  return NextResponse.json({ run, battle });
}
