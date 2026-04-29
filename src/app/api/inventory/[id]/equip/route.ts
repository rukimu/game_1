import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { isEquipSlot } from "@/lib/equipment";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const inv = await prisma.inventoryItem.findFirst({
    where: { id: params.id, characterId: c.id },
    include: { item: true },
  });
  if (!inv) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (inv.item.category !== "equip" || !isEquipSlot(inv.item.slot)) {
    return NextResponse.json({ error: "装備できないアイテムです" }, { status: 400 });
  }
  if (inv.equipped) return NextResponse.json({ ok: true, already: true });

  await prisma.$transaction([
    prisma.inventoryItem.updateMany({
      where: { characterId: c.id, equipped: true, item: { slot: inv.item.slot } },
      data: { equipped: false },
    }),
    prisma.inventoryItem.update({ where: { id: inv.id }, data: { equipped: true } }),
  ]);
  return NextResponse.json({ ok: true });
}
