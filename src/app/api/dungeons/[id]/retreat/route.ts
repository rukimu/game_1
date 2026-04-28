import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { retreatDungeonRun } from "@/lib/dungeon";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const run = await prisma.dungeonRun.findFirst({ where: { id: params.id, characterId: c.id } });
  if (!run) return NextResponse.json({ error: "no run" }, { status: 404 });
  try {
    await retreatDungeonRun(run.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "error" }, { status: 400 });
  }
}
