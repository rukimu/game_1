import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const t = await prisma.trade.findUnique({ where: { id: params.id } });
  if (!t || (t.fromCharacterId !== c.id && t.toCharacterId !== c.id)) return NextResponse.json({ error: "no access" }, { status: 403 });
  if (t.status !== "pending") return NextResponse.json({ error: "already resolved" }, { status: 400 });
  await prisma.trade.update({ where: { id: t.id }, data: { status: "cancelled", resolvedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
