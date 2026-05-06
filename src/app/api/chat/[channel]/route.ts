import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { sanitizeText, containsBannedWord } from "@/lib/sanitize";
import { emitChat } from "@/lib/socket";
import { withGuards } from "@/lib/withGuards";
import { z } from "zod";

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

// Cycle 52 (Phase 4-b): withGuards で認証・mute・rate limit を共通化。
// channel-specific access (canAccess) と禁止ワード判定はチャットの
// 業務ロジックなので handler 側に残す。
export const POST = withGuards<Request>(
  async (req, ctx) => {
    const params = ctx.params as { channel: string };
    const character = await requireActiveCharacter().catch((r) => r);
    if (character instanceof Response) return character;
    const channel = decode(params.channel);
    if (!canAccess(channel, character)) return NextResponse.json({ error: "no access" }, { status: 403 });
    const parsed = sendSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
    const text = sanitizeText(parsed.data.body, 300);
    if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
    if (containsBannedWord(text)) return NextResponse.json({ error: "禁止ワードを含みます" }, { status: 400 });
    const msg = await prisma.chatMessage.create({
      data: { channel, characterId: character.id, senderName: character.name, body: text },
    });
    emitChat(channel, msg);
    return NextResponse.json({ message: msg });
  },
  {
    requireAuth: true,
    requireNotMuted: true,
    rateLimit: { preset: "CHAT_SEND" },
    audit: { action: "chat_send", targetType: "chatMessage" },
  },
);
