import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.item.findMany({ where: { cosmetic: false }, orderBy: { basePrice: "asc" }, take: 30 });
  return NextResponse.json({ items });
}
