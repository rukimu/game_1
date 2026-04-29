import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { getIO } from "@/lib/socket";
import { awardAchievement } from "@/lib/achievements";

// Curse cleansing: requires 3+ supporters in the same party. MVP simplification:
// any other character in the same party can call this; once 3 unique cleansers
// have signaled, the curse is lifted.
const schema = z.object({ targetCharacterId: z.string() });
type CleanseEntry = { supporterIds: Set<string>; supporterNames: string[] };
const cleanseTracker = new Map<string, CleanseEntry>();
const SUPPORT_REWARD_GOLD = 200;

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const target = await prisma.character.findUnique({ where: { id: parsed.data.targetCharacterId } });
  if (!target || !target.isCursed) return NextResponse.json({ error: "対象がいないか、呪われていません" }, { status: 400 });
  if (target.id === c.id) return NextResponse.json({ error: "自分では解除できません" }, { status: 400 });
  // must be in same party
  const partyId = c.partyMembers[0]?.partyId;
  if (!partyId) return NextResponse.json({ error: "同じパーティーに所属する必要があります" }, { status: 400 });
  const targetMember = await prisma.partyMember.findFirst({ where: { partyId, characterId: target.id } });
  if (!targetMember) return NextResponse.json({ error: "対象がパーティーに居ません" }, { status: 400 });
  const entry = cleanseTracker.get(target.id) ?? { supporterIds: new Set<string>(), supporterNames: [] };
  if (!entry.supporterIds.has(c.id)) {
    entry.supporterIds.add(c.id);
    entry.supporterNames.push(c.name);
  }
  cleanseTracker.set(target.id, entry);
  if (entry.supporterIds.size >= 3) {
    await prisma.character.update({ where: { id: target.id }, data: { isCursed: false } });
    // Reward each supporter — 解除に協力した者には個別の報酬。Players that
    // helped someone out of a curse should feel the world thanked them, even
    // if it's just gold.
    for (const supporterId of entry.supporterIds) {
      try {
        await prisma.character.update({
          where: { id: supporterId },
          data: { gold: { increment: SUPPORT_REWARD_GOLD } },
        });
        await awardAchievement("cleanse_helper", supporterId);
        // count lifetime cleanses to award the "thrice" tier
        const helperCount = await prisma.characterAchievement.count({
          where: {
            characterId: supporterId,
            achievement: { slug: "cleanse_helper" },
          },
        });
        // The slug is unique per character, so the count is always 0 or 1.
        // To gauge how many curses they've helped lift we instead audit recent
        // announcements — but for simplicity, award "cleanse_thrice" once a
        // helper crosses the 3-helper threshold by checking their support
        // history of currently-cursed-cleansed pairs is impractical here, so
        // we approximate with helper achievements awarded thus far + the
        // cleanse log heuristic. Good-enough for MVP.
        const totalHelps = await prisma.announcement.count({
          where: {
            title: { contains: "は呪いから解放された" },
            body: { contains: (await prisma.character.findUnique({ where: { id: supporterId }, select: { name: true } }))?.name ?? "__none__" },
          },
        });
        if (totalHelps >= 3) {
          await awardAchievement("cleanse_thrice", supporterId);
        }
      } catch { /* non-fatal */ }
    }
    // Server-wide announcement so the rest of the world hears the news.
    try {
      const supporters = entry.supporterNames.join("、");
      const a = await prisma.announcement.create({
        data: {
          title: `『${target.name}』は呪いから解放された`,
          body: `${supporters} の手によって、${target.name} は呪いの軛を解いた。世界に再びその名が連なる。`,
        },
      });
      getIO()?.emit("system:announcement", a);
    } catch { /* non-fatal */ }
    cleanseTracker.delete(target.id);
    return NextResponse.json({ ok: true, cleansed: true, count: 3, supporters: entry.supporterNames });
  }
  return NextResponse.json({
    ok: true,
    count: entry.supporterIds.size,
    required: 3,
    supporters: entry.supporterNames,
  });
}
