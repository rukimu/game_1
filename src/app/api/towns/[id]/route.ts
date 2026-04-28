import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const town = await prisma.town.findUnique({
    where: { id: params.id },
    include: { rumors: { orderBy: { createdAt: "desc" }, take: 8 }, npcs: true, quests: { orderBy: { createdAt: "desc" }, take: 8 } },
  });
  if (!town) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ town });
}
