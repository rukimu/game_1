import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({ userId: z.string(), reason: z.string().max(200).optional(), hours: z.number().int().min(1).max(8760).default(72) });

export async function POST(req: Request) {
  const admin = await requireAdmin().catch((r) => r);
  if (admin instanceof Response) return admin;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  await prisma.ban.create({
    data: {
      userId: parsed.data.userId,
      reason: parsed.data.reason,
      expiresAt: new Date(Date.now() + parsed.data.hours * 3600 * 1000),
    },
  });
  await prisma.user.update({ where: { id: parsed.data.userId }, data: { isBanned: true } });
  await prisma.auditLog.create({ data: { actorType: "admin", actorId: admin.id, action: "ban", targetType: "user", targetId: parsed.data.userId, payload: JSON.stringify(parsed.data) } });
  return NextResponse.json({ ok: true });
}
