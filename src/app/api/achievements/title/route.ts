import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

const schema = z.object({ titleSlug: z.string().nullable() });

// POST /api/achievements/title — sets the HUD title to one the player has
// earned. Pass titleSlug=null to clear. Server validates ownership.
export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const slug = parsed.data.titleSlug;
  if (slug === null) {
    await prisma.character.update({ where: { id: c.id }, data: { activeTitle: null } });
    return NextResponse.json({ ok: true, activeTitle: null });
  }
  // Confirm the character earned an achievement whose titleSlug matches.
  const owned = await prisma.characterAchievement.findFirst({
    where: { characterId: c.id, achievement: { titleSlug: slug } },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "その称号は持っていません" }, { status: 400 });
  await prisma.character.update({ where: { id: c.id }, data: { activeTitle: slug } });
  return NextResponse.json({ ok: true, activeTitle: slug });
}
