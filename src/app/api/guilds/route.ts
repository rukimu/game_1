import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { sanitizeText } from "@/lib/sanitize";
import { awardAchievement } from "@/lib/achievements";

const GUILD_FOUND_LEVEL = 5;
const GUILD_FOUND_COST = 200;

export async function GET() {
  const guilds = await prisma.guild.findMany({
    include: { members: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ guilds });
}

const schema = z.object({
  name: z.string().min(2).max(40),
  tag: z.string().max(8).optional(),
  description: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  if (c.guildMember) return NextResponse.json({ error: "既にギルドに所属しています" }, { status: 400 });
  if (c.level < GUILD_FOUND_LEVEL) return NextResponse.json({ error: `Lv${GUILD_FOUND_LEVEL}以上で設立できます` }, { status: 400 });
  if (c.gold < GUILD_FOUND_COST) return NextResponse.json({ error: `${GUILD_FOUND_COST}Gが必要です` }, { status: 400 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const name = sanitizeText(parsed.data.name, 40);
  const tag = parsed.data.tag ? sanitizeText(parsed.data.tag, 8) : null;
  if (!name) return NextResponse.json({ error: "bad name" }, { status: 400 });
  const dup = await prisma.guild.findUnique({ where: { name } });
  if (dup) return NextResponse.json({ error: "同じ名前のギルドがあります" }, { status: 400 });
  const guild = await prisma.guild.create({
    data: {
      name,
      tag,
      description: parsed.data.description ? sanitizeText(parsed.data.description, 200) : "",
      masterCharacterId: c.id,
      members: { create: [{ characterId: c.id, role: "master" }] },
    },
  });
  await prisma.character.update({ where: { id: c.id }, data: { gold: c.gold - GUILD_FOUND_COST } });
  await awardAchievement("guild_founder", c.id);
  return NextResponse.json({ guild });
}
