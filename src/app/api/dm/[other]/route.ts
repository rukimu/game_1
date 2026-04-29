import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { sanitizeText, containsBannedWord } from "@/lib/sanitize";
import { fetchThread, markThreadRead } from "@/lib/dm";
import { getIO } from "@/lib/socket";

const RATE_LIMIT_MS = 1000;
const lastSendAt = new Map<string, number>();

export async function GET(_req: Request, { params }: { params: { other: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  if (params.other === c.id) return NextResponse.json({ error: "自分宛のDMは送れません" }, { status: 400 });
  const other = await prisma.character.findUnique({ where: { id: params.other }, select: { id: true, name: true, level: true } });
  if (!other) return NextResponse.json({ error: "相手が見つかりません" }, { status: 404 });
  const messages = await fetchThread(c.id, other.id);
  const newlyRead = await markThreadRead(c.id, other.id);
  return NextResponse.json({ other, messages, newlyRead });
}

const sendSchema = z.object({ body: z.string().min(1).max(500) });

export async function POST(req: Request, { params }: { params: { other: string } }) {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  if (params.other === c.id) return NextResponse.json({ error: "自分宛のDMは送れません" }, { status: 400 });

  const muted = await prisma.mute.findFirst({
    where: { userId: user.id, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  });
  if (muted) return NextResponse.json({ error: "ミュートされています" }, { status: 403 });

  const last = lastSendAt.get(c.id) ?? 0;
  if (Date.now() - last < RATE_LIMIT_MS) return NextResponse.json({ error: "送信が早すぎます" }, { status: 429 });

  const parsed = sendSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const text = sanitizeText(parsed.data.body, 500);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (containsBannedWord(text)) return NextResponse.json({ error: "禁止ワードを含みます" }, { status: 400 });

  const other = await prisma.character.findUnique({ where: { id: params.other }, select: { id: true } });
  if (!other) return NextResponse.json({ error: "相手が見つかりません" }, { status: 404 });

  lastSendAt.set(c.id, Date.now());
  const dm = await prisma.directMessage.create({
    data: { fromCharacterId: c.id, toCharacterId: other.id, body: text },
  });

  // Push notify the recipient if they're connected. The socket layer doesn't
  // authenticate room membership, so we send only the metadata — clients
  // refetch via the authenticated /api/dm endpoint to see the actual body.
  try {
    getIO()?.to(`dm:${other.id}`).emit("dm:new", {
      fromCharacterId: c.id,
      fromName: c.name,
      at: dm.createdAt,
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ message: dm });
}
