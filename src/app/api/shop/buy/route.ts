import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

const schema = z.object({ itemId: z.string(), quantity: z.number().int().min(1).max(50).default(1) });

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const item = await prisma.item.findUnique({ where: { id: parsed.data.itemId } });
  if (!item || item.cosmetic) return NextResponse.json({ error: "no item" }, { status: 404 });
  const cost = item.basePrice * parsed.data.quantity;
  if (c.gold < cost) return NextResponse.json({ error: "ゴールドが足りません" }, { status: 400 });
  await prisma.character.update({ where: { id: c.id }, data: { gold: { decrement: cost } } });
  await prisma.inventoryItem.create({ data: { characterId: c.id, itemId: item.id, quantity: parsed.data.quantity } });
  return NextResponse.json({ ok: true, cost });
}
