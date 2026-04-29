import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { registerGuildForSiege } from "@/lib/siege";

const schema = z.object({ siegeId: z.string() });

// POST /api/siege/register — registers the active character's guild for a
// siege event. Only the guild master can register on behalf of the guild.
export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const member = c.guildMember;
  if (!member) return NextResponse.json({ error: "ギルドに所属していません" }, { status: 400 });
  if (member.role !== "master" && member.role !== "sub") {
    return NextResponse.json({ error: "ギルドマスター/サブのみ登録できます" }, { status: 403 });
  }
  const result = await registerGuildForSiege(parsed.data.siegeId, member.guildId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
