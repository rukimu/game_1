import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin().catch((r) => r);
  if (admin instanceof Response) return admin;
  const seasons = await prisma.season.findMany({ orderBy: { startedAt: "desc" } });
  return NextResponse.json({ seasons });
}

const schema = z.object({ name: z.string().min(1).max(80), rules: z.record(z.any()).optional() });

export async function POST(req: Request) {
  const admin = await requireAdmin().catch((r) => r);
  if (admin instanceof Response) return admin;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  await prisma.season.updateMany({ where: { isCurrent: true }, data: { isCurrent: false, endedAt: new Date() } });
  const s = await prisma.season.create({
    data: { name: parsed.data.name, isCurrent: true, rules: JSON.stringify(parsed.data.rules ?? {}) },
  });
  return NextResponse.json({ season: s });
}
