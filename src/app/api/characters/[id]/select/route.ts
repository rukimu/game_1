import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { setActiveCharacterCookie } from "@/lib/activeCharacter";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  const c = await prisma.character.findFirst({ where: { id: params.id, userId: user.id } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  setActiveCharacterCookie(c.id);
  return NextResponse.json({ ok: true });
}
