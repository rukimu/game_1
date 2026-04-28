import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

const schema = z.object({ opponentName: z.string() });

export async function GET() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const duels = await prisma.duel.findMany({
    where: { OR: [{ challengerCharacterId: c.id }, { opponentCharacterId: c.id }] },
    include: { challenger: true, opponent: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ duels });
}

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const opp = await prisma.character.findUnique({ where: { name: parsed.data.opponentName } });
  if (!opp || opp.id === c.id) return NextResponse.json({ error: "対象が不正" }, { status: 400 });
  const duel = await prisma.duel.create({
    data: { challengerCharacterId: c.id, opponentCharacterId: opp.id },
  });
  return NextResponse.json({ duel });
}
