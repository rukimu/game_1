import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

const schema = z.object({
  inventoryItemId: z.string(),
  startPrice: z.number().int().min(1).max(10_000_000),
  buyoutPrice: z.number().int().min(1).max(10_000_000).optional(),
  durationHours: z.number().int().min(1).max(72).default(24),
});

export async function GET() {
  const listings = await prisma.auctionListing.findMany({
    where: { status: "active" },
    include: { invItem: { include: { item: true } }, seller: true, bids: true },
    orderBy: { endsAt: "asc" },
    take: 50,
  });
  return NextResponse.json({ listings });
}

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const inv = await prisma.inventoryItem.findUnique({ where: { id: parsed.data.inventoryItemId } });
  if (!inv || inv.characterId !== c.id) return NextResponse.json({ error: "アイテムが不正です" }, { status: 400 });
  const item = await prisma.item.findUnique({ where: { id: inv.itemId } });
  if (!item?.tradable) return NextResponse.json({ error: "出品できないアイテムです" }, { status: 400 });
  const endsAt = new Date(Date.now() + parsed.data.durationHours * 3600 * 1000);
  const listing = await prisma.auctionListing.create({
    data: {
      sellerCharacterId: c.id,
      inventoryItemId: inv.id,
      startPrice: parsed.data.startPrice,
      buyoutPrice: parsed.data.buyoutPrice,
      currentBid: 0,
      endsAt,
    },
  });
  return NextResponse.json({ listing });
}
