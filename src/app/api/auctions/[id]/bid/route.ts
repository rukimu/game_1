import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

const schema = z.object({ amount: z.number().int().min(1) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const listing = await prisma.auctionListing.findUnique({ where: { id: params.id } });
  if (!listing || listing.status !== "active") return NextResponse.json({ error: "no listing" }, { status: 400 });
  if (listing.sellerCharacterId === c.id) return NextResponse.json({ error: "自分の出品には入札できません" }, { status: 400 });
  if (listing.endsAt < new Date()) return NextResponse.json({ error: "終了済みです" }, { status: 400 });
  const min = Math.max(listing.startPrice, listing.currentBid + 1);
  if (parsed.data.amount < min) return NextResponse.json({ error: `${min}G以上で入札してください` }, { status: 400 });
  if (parsed.data.amount > c.gold) return NextResponse.json({ error: "ゴールドが足りません" }, { status: 400 });
  await prisma.$transaction([
    prisma.auctionBid.create({ data: { listingId: listing.id, bidderCharacterId: c.id, amount: parsed.data.amount } }),
    prisma.auctionListing.update({ where: { id: listing.id }, data: { currentBid: parsed.data.amount, currentBidderId: c.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
