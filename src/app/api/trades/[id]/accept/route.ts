import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const trade = await prisma.trade.findUnique({
    where: { id: params.id },
    include: { items: { include: { invItem: true } }, from: true, to: true },
  });
  if (!trade || trade.status !== "pending") return NextResponse.json({ error: "取引が無効です" }, { status: 400 });
  if (trade.toCharacterId !== c.id) return NextResponse.json({ error: "あなた宛ての取引ではありません" }, { status: 403 });
  // verify requestGold from receiver
  if (trade.requestGold > c.gold) return NextResponse.json({ error: "ゴールドが足りません" }, { status: 400 });
  // verify request items belong to c
  for (const ti of trade.items.filter((i) => i.side === "request")) {
    if (ti.invItem.characterId !== c.id) return NextResponse.json({ error: "要求アイテムを所持していません" }, { status: 400 });
  }
  // verify offer items still belong to from
  for (const ti of trade.items.filter((i) => i.side === "offer")) {
    if (ti.invItem.characterId !== trade.fromCharacterId) return NextResponse.json({ error: "出品者がアイテムを失っています" }, { status: 400 });
  }
  await prisma.$transaction(async (tx) => {
    // gold transfer
    await tx.character.update({ where: { id: trade.fromCharacterId }, data: { gold: { decrement: trade.offerGold } } });
    await tx.character.update({ where: { id: trade.toCharacterId }, data: { gold: { decrement: trade.requestGold } } });
    await tx.character.update({ where: { id: trade.toCharacterId }, data: { gold: { increment: trade.offerGold } } });
    await tx.character.update({ where: { id: trade.fromCharacterId }, data: { gold: { increment: trade.requestGold } } });
    // item transfer
    for (const ti of trade.items) {
      const newOwner = ti.side === "offer" ? trade.toCharacterId : trade.fromCharacterId;
      await tx.inventoryItem.update({ where: { id: ti.inventoryItemId }, data: { characterId: newOwner, equipped: false } });
    }
    await tx.trade.update({ where: { id: trade.id }, data: { status: "accepted", resolvedAt: new Date() } });
    await tx.auditLog.create({ data: { actorType: "user", action: "trade.accept", targetType: "trade", targetId: trade.id } });
  });
  return NextResponse.json({ ok: true });
}
