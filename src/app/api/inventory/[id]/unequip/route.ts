import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const inv = await prisma.inventoryItem.findFirst({ where: { id: params.id, characterId: c.id } });
  if (!inv) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (!inv.equipped) return NextResponse.json({ ok: true, already: true });
  await prisma.inventoryItem.update({ where: { id: inv.id }, data: { equipped: false } });
  return NextResponse.json({ ok: true });
}
