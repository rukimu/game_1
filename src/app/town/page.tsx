import { redirect } from "next/navigation";
import Link from "next/link";
import Hud from "@/components/Hud";
import Chat from "@/components/Chat";
import { prisma } from "@/lib/prisma";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { getContentGenerationService } from "@/lib/generation/service";
import { getCurrentSeasonKeywords } from "@/lib/mystery";
import TownActions from "./TownActions";

export const dynamic = "force-dynamic";

export default async function TownPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const town = c.currentTownId
    ? await prisma.town.findUnique({
        where: { id: c.currentTownId },
        include: {
          rumors: { orderBy: { createdAt: "desc" }, take: 6 },
          npcs: true,
          quests: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      })
    : null;
  const towns = await prisma.town.findMany({ orderBy: { danger: "asc" } });
  const myQuests = await prisma.characterQuest.findMany({
    where: { characterId: c.id, completedAt: null },
    include: { quest: true },
  });
  // Per-visit NPC dialogue: archetype-aware + season-keyword-aware. The seed
  // includes the date so the same character sees the same line all day, but
  // tomorrow brings a new exchange.
  const job = c.currentJobId
    ? await prisma.job.findUnique({ where: { id: c.currentJobId }, select: { category: true } })
    : null;
  const archetype = job?.category ?? null;
  const seasonClueWords = await getCurrentSeasonKeywords();
  const dayKey = new Date().toISOString().slice(0, 10);
  const gen = getContentGenerationService();
  const npcLines = town
    ? await Promise.all(
        town.npcs.map(async (n) => {
          try {
            const dlg = await gen.generateNpcDialogue({
              role: n.role,
              seasonClueWords,
              characterArchetype: archetype,
              seed: `${c.id}-${n.id}-${dayKey}`,
            });
            return { id: n.id, name: n.name, role: n.role, line: dlg.line };
          } catch {
            return { id: n.id, name: n.name, role: n.role, line: n.dialogue };
          }
        })
      )
    : [];
  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 panel space-y-3">
          {town ? (
            <>
              <h2 className="text-lg font-bold text-yellow-200">{town.name}</h2>
              <p className="text-sm text-yellow-100/80">{town.description}</p>
              <div className="text-xs text-yellow-200/70">
                危険度 {town.danger} ・ 治安 {town.security} ・ 経済 {town.economy} ・ 宿屋 {town.innFee}G
              </div>
              <TownActions townId={town.id} />
              <section className="mt-3">
                <h3 className="text-sm font-bold text-yellow-200 mb-1">酒場の噂</h3>
                <ul className="text-sm space-y-1">
                  {town.rumors.length === 0 && <li className="text-yellow-200/50 text-xs">まだ噂はない。</li>}
                  {town.rumors.map((r) => <li key={r.id} className="log-line">― {r.text}</li>)}
                </ul>
              </section>
              <section className="mt-3">
                <h3 className="text-sm font-bold text-yellow-200 mb-1">クエスト掲示板</h3>
                <ul className="space-y-1">
                  {town.quests.length === 0 && <li className="text-yellow-200/50 text-xs">クエストがありません。</li>}
                  {town.quests.map((q) => (
                    <li key={q.id} className="border border-yellow-900/40 rounded p-2 bg-black/30">
                      <div className="text-sm font-bold text-yellow-100">{q.title} <span className="text-xs text-yellow-200/60">EXP {q.expReward} / G {q.goldReward}</span></div>
                      <div className="text-xs text-yellow-100/80">{q.description}</div>
                      <form action={`/api/quests/${q.id}/accept`} method="post" className="mt-1">
                        <button className="btn">受注</button>
                      </form>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="mt-3">
                <h3 className="text-sm font-bold text-yellow-200 mb-1">受注中</h3>
                <ul className="text-xs text-yellow-100/80 space-y-1">
                  {myQuests.length === 0 && <li className="text-yellow-200/50">なし</li>}
                  {myQuests.map((q) => <li key={q.id}>・{q.quest.title}（{q.progress}/{q.quest.goalCount}）</li>)}
                </ul>
              </section>
              <section className="mt-3">
                <h3 className="text-sm font-bold text-yellow-200 mb-1">街にいる人々</h3>
                <ul className="text-xs text-yellow-100/80 space-y-1">
                  {npcLines.length === 0 && <li className="text-yellow-200/50">まだ誰もいない。</li>}
                  {npcLines.map((n) => <li key={n.id}>＊{n.name}（{n.role}）：「{n.line}」</li>)}
                </ul>
              </section>
              <section className="mt-3">
                <h3 className="text-sm font-bold text-yellow-200 mb-1">移動</h3>
                <div className="flex flex-wrap gap-2">
                  {towns.map((t) => (
                    <form key={t.id} action={`/api/towns/${t.id}/move`} method="post">
                      <button className={`btn ${t.id === town.id ? "opacity-40" : ""}`} disabled={t.id === town.id}>{t.name}</button>
                    </form>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="space-y-2">
              <p>あなたはまだどの街にも入っていない。</p>
              <div className="flex flex-wrap gap-2">
                {towns.map((t) => (
                  <form key={t.id} action={`/api/towns/${t.id}/move`} method="post">
                    <button className="btn">{t.name}へ向かう</button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3">
          {town && <Chat channel={`town:${town.id}`} title={`${town.name} 街チャット`} />}
          <div className="panel">
            <div className="text-sm font-bold text-yellow-200 mb-2">冒険</div>
            <Link href="/battle" className="btn-primary block text-center">戦いに出る</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
