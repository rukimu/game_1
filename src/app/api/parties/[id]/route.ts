import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const party = await prisma.party.findUnique({
    where: { id: params.id },
    include: { members: { include: { character: true } } },
  });
  if (!party) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ party });
}
