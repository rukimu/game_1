import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const towns = await prisma.town.findMany({ orderBy: { danger: "asc" } });
  return NextResponse.json({ towns });
}
