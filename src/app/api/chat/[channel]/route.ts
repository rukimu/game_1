import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { sanitizeText, containsBannedWord } from "@/lib/sanitize";
import { emitChat } from "@/lib/socket";
import { z } from "zod";

const RATE_LIMIT_MS = 1000;
const lastMsgAt = new Map<string, number>();

function decode(channel: string) {
  return decodeURIComponent(channel);
}

function canAccess(channel: string, character: any): boolean {
  if (channel.startsWith("town:")) {
    const id = channel.slice(5);
    return character.currentTownId === id;
  }
  if (channel.startsWith("party:")) {
    return character.partyMembers.some((pm: any) => pm.partyId === channel.slice(6));
  }
  if (channel.startsWith("guild:")) {
    return character.guildMember?.guildId === channel.slice(6);
  }
  if (channel.startsWith("dm:")) {
    const [a, b] = channel.slice(3).split(":");
    return character.id === a || character.id === b;
  }
  if (channel.startsWith("siege:")) {
    // Cycle 32: siege battle cheer chat. Spectators and participants
    // alike can post — the whole point is letting non-registered guilds
    // root for a side. Rate limit + ban-word filter still apply via the
    // existing send path.
    return true;
  }
  return false;
}

export async function GET(req: Request, { params }: { params: { channel: string } }) {
  const character = await requireActiveCharacter().catch((r) => r);
  if (character instanceof Response) return character;
  const channel = decode(params.channel);
  if (!canAccess(channel, character)) return NextResponse.json({ error: "no access" }, { status: 403 });
  const messages = await prisma.chatMessage.findMany({
    where: { channel },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return NextResponse.json({ messages });
}

const sendSchema = z.object({ body: z.string().min(1).max(300) });

export async function POST(req: Request, { params }: { params: { channel: string } }) {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  // mute check
  const muted = await prisma.mute.findFirst({ where: { userId: user.id, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
  if (muted) return NextResponse.json({ error: "ミュートされています" }, { status: 403 });
  const character = await requireActiveCharacter().catch((r) => r);
  if (character instanceof Response) return character;
  const channel = decode(params.channel);
  if (!canAccess(channel, character)) return NextResponse.json({ error: "no access" }, { status: 403 });
  const last = lastMsgAt.get(character.id) ?? 0;
  if (Date.now() - last < RATE_LIMIT_MS) return NextResponse.json({ error: "送信が早すぎます" }, { status: 429 });
  const parsed = sendSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const text = sanitizeText(parsed.data.body, 300);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (containsBannedWord(text)) return NextResponse.json({ error: "禁止ワードを含みます" }, { status: 400 });
  lastMsgAt.set(character.id, Date.now());
  const msg = await prisma.chatMessage.create({
    data: { channel, characterId: character.id, senderName: character.name, body: text },
  });
  emitChat(channel, msg);
  return NextResponse.json({ message: msg });
}
