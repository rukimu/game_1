import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { startBattleForParty } from "@/lib/battle";
import { z } from "zod";

const schema = z.object({ partyId: z.string().optional() });

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  let partyId = parsed.data.partyId ?? c.partyMembers[0]?.partyId;
  if (!partyId) {
    // create a solo party for this character
    const party = await prisma.party.create({
      data: { name: `${c.name}の冒険`, leaderCharacterId: c.id, members: { create: [{ characterId: c.id }] } },
    });
    partyId = party.id;
  } else {
    if (!c.partyMembers.some((pm: any) => pm.partyId === partyId)) {
      return NextResponse.json({ error: "そのパーティーに居ません" }, { status: 400 });
    }
  }
  // ensure no active battle for the party
  const active = await prisma.battle.findFirst({ where: { partyId, status: "active" } });
  if (active) return NextResponse.json({ battleId: active.id });
  const id = await startBattleForParty(partyId, { townId: c.currentTownId });
  return NextResponse.json({ battleId: id });
}
