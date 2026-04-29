import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { createThemedDungeonRun, listThemedDungeons } from "@/lib/themedDungeon";

export async function GET() {
  return NextResponse.json({ dungeons: listThemedDungeons() });
}

const schema = z.object({
  theme: z.enum(["library", "tower", "lake", "altar", "bell"]),
});

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "テーマ指定が不正です" }, { status: 400 });

  const active = await prisma.dungeonRun.findFirst({
    where: { characterId: c.id, status: "active" },
  });
  if (active) return NextResponse.json({ run: active, alreadyActive: true });

  try {
    const run = await createThemedDungeonRun(c.id, parsed.data.theme);
    return NextResponse.json({ run });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "失敗しました" }, { status: 400 });
  }
}
