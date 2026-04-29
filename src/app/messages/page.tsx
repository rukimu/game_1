import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { listDmThreads, fetchThread, markThreadRead } from "@/lib/dm";
import { prisma } from "@/lib/prisma";
import MessagesClient from "./Client";

export const dynamic = "force-dynamic";

export default async function MessagesPage({ searchParams }: { searchParams?: { with?: string } }) {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");

  const threads = await listDmThreads(c.id);

  // Active thread: from ?with= query, else the latest thread.
  const otherId = searchParams?.with ?? threads[0]?.otherId ?? null;
  let other: { id: string; name: string; level: number } | null = null;
  let messages: Array<{ id: string; fromCharacterId: string; toCharacterId: string; body: string; createdAt: string; readAt: string | null }> = [];
  if (otherId && otherId !== c.id) {
    const found = await prisma.character.findUnique({ where: { id: otherId }, select: { id: true, name: true, level: true } });
    if (found) {
      other = found;
      // Mark unread BEFORE rendering so the badge updates on first paint.
      await markThreadRead(c.id, found.id);
      const raw = await fetchThread(c.id, found.id);
      messages = raw.map((m) => ({
        id: m.id,
        fromCharacterId: m.fromCharacterId,
        toCharacterId: m.toCharacterId,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
      }));
    }
  }

  const threadView = threads.map((t) => ({
    otherId: t.otherId,
    otherName: t.otherName,
    otherLevel: t.otherLevel,
    lastBody: t.lastBody,
    lastAt: t.lastAt.toISOString(),
    lastFromMe: t.lastFromMe,
    unread: otherId === t.otherId ? 0 : t.unread, // active thread is now read
  }));

  return (
    <main>
      <Hud />
      <div className="panel">
        <h2 className="text-lg font-bold text-yellow-200 mb-2">メッセージ</h2>
        <MessagesClient
          myCharacterId={c.id}
          threads={threadView}
          activeOther={other}
          messages={messages}
        />
      </div>
    </main>
  );
}
