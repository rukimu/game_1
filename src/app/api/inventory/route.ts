import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { getEquipmentBonuses } from "@/lib/equipment";

export async function GET() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const items = await prisma.inventoryItem.findMany({
    where: { characterId: c.id },
    include: { item: true },
    orderBy: [{ equipped: "desc" }, { acquiredAt: "asc" }],
  });
  const bonuses = await getEquipmentBonuses(c.id);
  return NextResponse.json({ items, bonuses });
}
