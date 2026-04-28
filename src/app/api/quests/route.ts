import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const townId = url.searchParams.get("townId");
  const quests = await prisma.quest.findMany({
    where: townId ? { townId } : {},
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ quests });
}
