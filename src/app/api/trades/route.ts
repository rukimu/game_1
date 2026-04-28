import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

const schema = z.object({
  toCharacterName: z.string(),
  offerGold: z.number().int().min(0).default(0),
  requestGold: z.number().int().min(0).default(0),
  offerInventoryItemIds: z.array(z.string()).default([]),
  requestInventoryItemIds: z.array(z.string()).default([]),
});

export async function GET() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const trades = await prisma.trade.findMany({
    where: { OR: [{ fromCharacterId: c.id }, { toCharacterId: c.id }] },
    include: { items: { include: { invItem: { include: { item: true } } } }, from: true, to: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ trades });
}

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const target = await prisma.character.findUnique({ where: { name: parsed.data.toCharacterName } });
  if (!target || target.id === c.id) return NextResponse.json({ error: "対象が不正です" }, { status: 400 });
  if (parsed.data.offerGold > c.gold) return NextResponse.json({ error: "ゴールドが足りません" }, { status: 400 });
  // verify offered items belong to me
  for (const iid of parsed.data.offerInventoryItemIds) {
    const inv = await prisma.inventoryItem.findUnique({ where: { id: iid } });
    if (!inv || inv.characterId !== c.id) return NextResponse.json({ error: "アイテムが不正です" }, { status: 400 });
    const item = await prisma.item.findUnique({ where: { id: inv.itemId } });
    if (item && !item.tradable) return NextResponse.json({ error: "取引不可アイテムが含まれています" }, { status: 400 });
  }
  const trade = await prisma.trade.create({
    data: {
      fromCharacterId: c.id,
      toCharacterId: target.id,
      offerGold: parsed.data.offerGold,
      requestGold: parsed.data.requestGold,
      items: {
        create: [
          ...parsed.data.offerInventoryItemIds.map((id) => ({ side: "offer", inventoryItemId: id })),
          ...parsed.data.requestInventoryItemIds.map((id) => ({ side: "request", inventoryItemId: id })),
        ],
      },
    },
  });
  await prisma.auditLog.create({ data: { actorType: "user", actorId: c.userId, action: "trade.create", targetType: "trade", targetId: trade.id, payload: JSON.stringify(parsed.data) } });
  return NextResponse.json({ trade });
}
