import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.isBanned) return NextResponse.json({ error: "ログインできません" }, { status: 401 });
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  await createSession(user.id);
  return NextResponse.json({ id: user.id, email: user.email, isAdmin: user.isAdmin });
}
