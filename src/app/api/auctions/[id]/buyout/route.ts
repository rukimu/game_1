import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const listing = await prisma.auctionListing.findUnique({ where: { id: params.id }, include: { invItem: true } });
  if (!listing || listing.status !== "active" || !listing.buyoutPrice) return NextResponse.json({ error: "buyout不可" }, { status: 400 });
  if (listing.sellerCharacterId === c.id) return NextResponse.json({ error: "自分の出品" }, { status: 400 });
  if (c.gold < listing.buyoutPrice) return NextResponse.json({ error: "ゴールドが足りません" }, { status: 400 });
  await prisma.$transaction([
    prisma.character.update({ where: { id: c.id }, data: { gold: { decrement: listing.buyoutPrice } } }),
    prisma.character.update({ where: { id: listing.sellerCharacterId }, data: { gold: { increment: listing.buyoutPrice } } }),
    prisma.inventoryItem.update({ where: { id: listing.invItem.id }, data: { characterId: c.id, equipped: false } }),
    prisma.auctionListing.update({ where: { id: listing.id }, data: { status: "sold", currentBid: listing.buyoutPrice, currentBidderId: c.id } }),
    prisma.auditLog.create({ data: { actorType: "user", action: "auction.buyout", targetType: "auction", targetId: listing.id, payload: JSON.stringify({ price: listing.buyoutPrice }) } }),
  ]);
  return NextResponse.json({ ok: true });
}
