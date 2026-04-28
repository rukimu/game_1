import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { sanitizeText } from "@/lib/sanitize";

export async function GET() {
  const parties = await prisma.party.findMany({
    where: { isOpen: true },
    include: { members: { include: { character: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ parties });
}

const schema = z.object({ name: z.string().min(1).max(40), description: z.string().max(140).optional() });

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  if (c.partyMembers.length > 0) return NextResponse.json({ error: "既にパーティーに所属しています" }, { status: 400 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const party = await prisma.party.create({
    data: {
      name: sanitizeText(parsed.data.name, 40),
      description: parsed.data.description ? sanitizeText(parsed.data.description, 140) : null,
      leaderCharacterId: c.id,
      members: { create: [{ characterId: c.id }] },
    },
    include: { members: true },
  });
  return NextResponse.json({ party });
}
