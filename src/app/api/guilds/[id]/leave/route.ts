import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { emitGuild } from "@/lib/socket";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const m = await prisma.guildMember.findFirst({ where: { guildId: params.id, characterId: c.id } });
  if (!m) return NextResponse.json({ error: "not in guild" }, { status: 400 });
  await prisma.guildMember.delete({ where: { id: m.id } });
  const remain = await prisma.guildMember.count({ where: { guildId: params.id } });
  if (remain === 0) await prisma.guild.delete({ where: { id: params.id } });
  emitGuild(params.id, "guild:updated", { id: params.id });
  return NextResponse.json({ ok: true });
}
