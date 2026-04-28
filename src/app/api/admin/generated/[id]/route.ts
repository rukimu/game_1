import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin().catch((r) => r);
  if (admin instanceof Response) return admin;
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (body.disable === true) data.disabledAt = new Date();
  if (body.disable === false) data.disabledAt = null;
  const updated = await prisma.generatedContent.update({ where: { id: params.id }, data });
  return NextResponse.json({ generated: updated });
}
