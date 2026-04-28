import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getIO } from "@/lib/socket";

const schema = z.object({ title: z.string().min(1).max(80), body: z.string().min(1).max(500) });

export async function POST(req: Request) {
  const admin = await requireAdmin().catch((r) => r);
  if (admin instanceof Response) return admin;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const a = await prisma.announcement.create({ data: parsed.data });
  getIO()?.emit("system:announcement", a);
  return NextResponse.json({ announcement: a });
}
