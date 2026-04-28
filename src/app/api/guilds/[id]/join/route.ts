import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { emitGuild } from "@/lib/socket";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  if (c.guildMember) return NextResponse.json({ error: "既にギルドに所属" }, { status: 400 });
  const g = await prisma.guild.findUnique({ where: { id: params.id } });
  if (!g) return NextResponse.json({ error: "no guild" }, { status: 404 });
  await prisma.guildMember.create({ data: { guildId: g.id, characterId: c.id } });
  emitGuild(g.id, "guild:updated", { id: g.id });
  return NextResponse.json({ ok: true });
}
