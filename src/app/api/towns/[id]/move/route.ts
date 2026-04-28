import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const town = await prisma.town.findUnique({ where: { id: params.id } });
  if (!town) return NextResponse.json({ error: "no town" }, { status: 404 });
  await prisma.character.update({ where: { id: c.id }, data: { currentTownId: town.id } });
  const url = new URL("/town", req.url);
  return NextResponse.redirect(url, { status: 303 });
}
