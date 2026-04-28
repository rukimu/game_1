import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getActiveCharacter } from "@/lib/activeCharacter";

const schema = z.object({ productCode: z.string() });

const PRICES: Record<string, { amount: number; kind: string }> = {
  "slot+1": { amount: 500, kind: "slot" },
  "name-change": { amount: 200, kind: "name" },
  "outfit-noble": { amount: 300, kind: "outfit" },
  "outfit-pirate": { amount: 300, kind: "outfit" },
};

export async function POST(req: Request) {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const product = PRICES[parsed.data.productCode];
  if (!product) return NextResponse.json({ error: "no product" }, { status: 400 });
  await prisma.paymentTransaction.create({
    data: { userId: user.id, amount: product.amount, productCode: parsed.data.productCode, status: "paid", metadata: JSON.stringify({ kind: product.kind, mock: true }) },
  });
  if (product.kind === "slot") {
    await prisma.user.update({ where: { id: user.id }, data: { characterSlots: { increment: 1 } } });
  } else if (product.kind === "outfit") {
    const c = await getActiveCharacter();
    if (c) await prisma.character.update({ where: { id: c.id }, data: { cosmeticOutfit: parsed.data.productCode } });
  }
  return NextResponse.json({ ok: true, mock: true });
}
