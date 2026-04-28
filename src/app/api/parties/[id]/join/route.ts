import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { emitParty } from "@/lib/socket";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  if (c.partyMembers.length > 0) return NextResponse.json({ error: "既にパーティー所属中" }, { status: 400 });
  const party = await prisma.party.findUnique({
    where: { id: params.id },
    include: { members: true },
  });
  if (!party || !party.isOpen) return NextResponse.json({ error: "募集していません" }, { status: 400 });
  if (party.members.length >= 10) return NextResponse.json({ error: "満員" }, { status: 400 });
  await prisma.partyMember.create({ data: { partyId: party.id, characterId: c.id } });
  emitParty(party.id, "party:updated", { id: party.id });
  return NextResponse.json({ ok: true });
}
