import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

// Curse cleansing: requires 3+ supporters in the same party. MVP simplification:
// any other character in the same party can call this; once 3 unique cleansers
// have signaled, the curse is lifted.
const schema = z.object({ targetCharacterId: z.string() });
const cleanseTracker = new Map<string, Set<string>>();

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const target = await prisma.character.findUnique({ where: { id: parsed.data.targetCharacterId } });
  if (!target || !target.isCursed) return NextResponse.json({ error: "対象がいないか、呪われていません" }, { status: 400 });
  if (target.id === c.id) return NextResponse.json({ error: "自分では解除できません" }, { status: 400 });
  // must be in same party
  const partyId = c.partyMembers[0]?.partyId;
  if (!partyId) return NextResponse.json({ error: "同じパーティーに所属する必要があります" }, { status: 400 });
  const targetMember = await prisma.partyMember.findFirst({ where: { partyId, characterId: target.id } });
  if (!targetMember) return NextResponse.json({ error: "対象がパーティーに居ません" }, { status: 400 });
  const set = cleanseTracker.get(target.id) ?? new Set<string>();
  set.add(c.id);
  cleanseTracker.set(target.id, set);
  if (set.size >= 3) {
    await prisma.character.update({ where: { id: target.id }, data: { isCursed: false } });
    cleanseTracker.delete(target.id);
    return NextResponse.json({ ok: true, cleansed: true, count: 3 });
  }
  return NextResponse.json({ ok: true, count: set.size, required: 3 });
}
