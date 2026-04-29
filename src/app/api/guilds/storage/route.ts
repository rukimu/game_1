import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

export async function GET() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  if (!c.guildMember) return NextResponse.json({ error: "ギルドに所属していません" }, { status: 400 });
  const items = await prisma.guildStorageItem.findMany({
    where: { guildId: c.guildMember.guildId },
    include: { item: true },
    orderBy: { depositedAt: "desc" },
  });
  return NextResponse.json({ items });
}
