import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { sanitizeName } from "@/lib/sanitize";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  const character = await prisma.character.findFirst({ where: { id: params.id, userId: user.id } });
  if (!character) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const schema = z.object({ name: z.string().min(2).max(24).optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const data: any = {};
  if (parsed.data.name) {
    const name = sanitizeName(parsed.data.name);
    if (!name) return NextResponse.json({ error: "bad name" }, { status: 400 });
    data.name = name;
  }
  const updated = await prisma.character.update({ where: { id: character.id }, data });
  return NextResponse.json({ character: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  const c = await prisma.character.findFirst({ where: { id: params.id, userId: user.id } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.character.delete({ where: { id: c.id } });
  return NextResponse.json({ ok: true });
}
