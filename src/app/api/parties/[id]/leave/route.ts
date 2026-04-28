import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { emitParty } from "@/lib/socket";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const member = await prisma.partyMember.findFirst({
    where: { partyId: params.id, characterId: c.id },
  });
  if (!member) return NextResponse.json({ error: "not in party" }, { status: 400 });
  await prisma.partyMember.delete({ where: { id: member.id } });
  const remain = await prisma.partyMember.count({ where: { partyId: params.id } });
  if (remain === 0) {
    await prisma.party.delete({ where: { id: params.id } });
  } else {
    const party = await prisma.party.findUnique({ where: { id: params.id } });
    if (party && party.leaderCharacterId === c.id) {
      const next = await prisma.partyMember.findFirst({ where: { partyId: party.id }, orderBy: { joinedAt: "asc" } });
      if (next) await prisma.party.update({ where: { id: party.id }, data: { leaderCharacterId: next.characterId } });
    }
  }
  emitParty(params.id, "party:updated", { id: params.id });
  return NextResponse.json({ ok: true });
}
