import { prisma } from "@/lib/prisma";

// Returns a deduplicated list of every other character that has exchanged DMs
// with `characterId`, ordered by latest activity. Each thread carries the
// latest message body, the timestamp, and the unread count for the viewer.
export async function listDmThreads(characterId: string) {
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [{ fromCharacterId: characterId }, { toCharacterId: characterId }],
    },
    orderBy: { createdAt: "desc" },
    take: 500, // recent slice; a heavy user can scroll inside a thread
  });
  const byOther = new Map<string, {
    otherId: string;
    lastBody: string;
    lastAt: Date;
    lastFromMe: boolean;
    unread: number;
  }>();
  for (const m of messages) {
    const otherId = m.fromCharacterId === characterId ? m.toCharacterId : m.fromCharacterId;
    let bucket = byOther.get(otherId);
    if (!bucket) {
      bucket = { otherId, lastBody: m.body, lastAt: m.createdAt, lastFromMe: m.fromCharacterId === characterId, unread: 0 };
      byOther.set(otherId, bucket);
    }
    if (m.toCharacterId === characterId && !m.readAt) bucket.unread++;
  }
  const otherIds = Array.from(byOther.keys());
  const others = otherIds.length
    ? await prisma.character.findMany({
        where: { id: { in: otherIds } },
        select: { id: true, name: true, level: true },
      })
    : [];
  const nameById = new Map(others.map((o) => [o.id, o]));
  return Array.from(byOther.values())
    .map((b) => ({ ...b, otherName: nameById.get(b.otherId)?.name ?? "（不明）", otherLevel: nameById.get(b.otherId)?.level ?? null }))
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

export async function countUnreadDms(characterId: string) {
  return prisma.directMessage.count({
    where: { toCharacterId: characterId, readAt: null },
  });
}

export async function fetchThread(meId: string, otherId: string, take = 200) {
  const msgs = await prisma.directMessage.findMany({
    where: {
      OR: [
        { fromCharacterId: meId, toCharacterId: otherId },
        { fromCharacterId: otherId, toCharacterId: meId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take,
  });
  return msgs;
}

// Marks every unread DM from `otherId` to `meId` as read. Returns the updated
// count so the caller can refresh badges.
export async function markThreadRead(meId: string, otherId: string) {
  const r = await prisma.directMessage.updateMany({
    where: { fromCharacterId: otherId, toCharacterId: meId, readAt: null },
    data: { readAt: new Date() },
  });
  return r.count;
}
