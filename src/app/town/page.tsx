import { redirect } from "next/navigation";
import Link from "next/link";
import Hud from "@/components/Hud";
import Chat from "@/components/Chat";
import { prisma } from "@/lib/prisma";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { getContentGenerationService } from "@/lib/generation/service";
import { getCurrentSeasonKeywords } from "@/lib/mystery";
import { getTodayWorldState, jpElementName } from "@/lib/worldstate";
import { pickTutorialHint } from "@/lib/tutorial";
import { listTodayChallenges, describeDailyChallenge, tickDailyChallenge } from "@/lib/dailyChallenge";
import { spawnRaidIfDue, listActiveRaids } from "@/lib/raid";
import { getActiveOnboardingQuest } from "@/lib/onboarding";
import TownActions from "./TownActions";
import TutorialBox from "./TutorialBox";

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
  // Cycle 40 Phase 1: アクセス可能な町のみ表示。Day1 体験集中のため
  // procedural 110 街は default 999 で封印、5 主要都市が Lv 1/5/10/25/40
  // で段階開放される。schema の Town.unlockLevel を参照。
  const towns = await prisma.town.findMany({
    where: { unlockLevel: { lte: c.level } },
    orderBy: [{ unlockLevel: "asc" }, { danger: "asc" }],
  });
  // 「次の解放」予告。HUD 風に「Lv X で開放: 街名」を 1 件先取り表示。
  const nextLockedTown = await prisma.town.findFirst({
    where: { unlockLevel: { gt: c.level } },
    orderBy: { unlockLevel: "asc" },
  });
  const myQuests = await prisma.characterQuest.findMany({
    where: { characterId: c.id, completedAt: null },
    include: { quest: true },
  });
  // Cycle 41-2: 受注済み (進行中 + 完了済み) の questId 集合。掲示板から
  // 除外するため別 query で全件取得。@@unique([characterId, questId])
  // により受注済み quest は重複受注できないため、表示しても押せない。
  const acceptedQuestIdsRows = await prisma.characterQuest.findMany({
    where: { characterId: c.id },
    select: { questId: true },
  });
  const acceptedQuestIds = new Set(acceptedQuestIdsRows.map((r) => r.questId));
  // Per-visit NPC dialogue: archetype-aware + season-keyword-aware. The seed
  // includes the date so the same character sees the same line all day, but
  // tomorrow brings a new exchange.
  const job = c.currentJobId
    ? await prisma.job.findUnique({ where: { id: c.currentJobId }, select: { category: true } })
    : null;
  const archetype = job?.category ?? null;
  const seasonClueWords = await getCurrentSeasonKeywords();
  const world = await getTodayWorldState();
  const dayKey = world.date;
  const gen = getContentGenerationService();
  const npcLines = town
    ? await Promise.all(
        town.npcs.map(async (n) => {
          let line = n.dialogue;
          try {
            const dlg = await gen.generateNpcDialogue({
              role: n.role,
              // Cycle 33-d: curated NPCs preserve their hand-written line as
              // the base; season/archetype color still layers on top.
              baseLine: n.curated ? n.dialogue : undefined,
              seasonClueWords,
              characterArchetype: archetype,
              seed: `${c.id}-${n.id}-${dayKey}`,
            });
            line = dlg.line;
          } catch { /* fall back to seeded dialogue */ }
          // NPC memory: if someone else came by recently, the NPC mentions it.
          // 30 minutes is the freshness window — long enough that two players
          // who are online together feel each other, short enough that the
          // line doesn't loop forever after one visit.
          const fresh = n.lastSpokenAt && (Date.now() - n.lastSpokenAt.getTime()) < 30 * 60 * 1000;
          if (fresh && n.lastSpokenName && n.lastSpokenName !== c.name) {
            line = `${line}（${n.lastSpokenName} もさっき同じ席に座っていた。）`;
          }
          // Cycle 33: curated NPCs surface their bio + relation graph
          // for a richer "this NPC has a story" feel.
          let relations: { name: string; relation: string; note?: string }[] = [];
          if (n.curated && n.relationsJson) {
            try {
              const parsed = JSON.parse(n.relationsJson);
              if (Array.isArray(parsed)) relations = parsed;
            } catch { /* ignore */ }
          }
          return {
            id: n.id,
            name: n.name,
            role: n.role,
            line,
            curated: n.curated,
            bio: n.bio,
            relations,
          };
        })
      )
    : [];
  // Mark this character as the latest visitor on each NPC. Best-effort —
  // failures here must not break the page render.
  if (town) {
    try {
      await prisma.npc.updateMany({
        where: { townId: town.id },
        data: { lastSpokenName: c.name, lastSpokenAt: new Date(), visitCount: { increment: 1 } },
      });
    } catch { /* non-fatal */ }
  }
  // The world is alive — surface recent announcements (curse onsets,
  // boss first-kills, mystery-solver flashes) on the town page so a
  // returning player feels the realm shifting under their feet.
  const recentEvents = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  // Per-character onboarding hint. Adapts to whether they've fought,
  // looted, joined a party, etc. Hidden after dismissal.
  const tutorialHint = await pickTutorialHint(c.id);
  // Cycle 41-4: 5 連鎖オンボーディング クエスト。Day1 プレイヤに「次に
  // やること」を 1 件だけ提示する。完了で次が自動受注される線形誘導。
  const activeOnboarding = await getActiveOnboardingQuest(c.id);

  // Daily challenges: lazy-create today's 3 if missing. Town visit also
  // counts as one tick of the talk_npc / explore goals — increment progress
  // before reading so the panel always shows the freshest state.
  await tickDailyChallenge({ characterId: c.id, goalType: "talk_npc", delta: 1 });
  const dailyChallenges = await listTodayChallenges(c.id);

  // Lazy world-raid spawn check (gated to ~10% with a 60min respawn cooldown
  // inside spawnRaidIfDue). Visiting the town is what drives world activity,
  // so this is the natural trigger point.
  const activeRaids = town
    ? (await spawnRaidIfDue(town.id), await listActiveRaids(town.id))
    : [];
  return (
    <main>
      <Hud />
      {activeOnboarding && (
        <div className="panel mb-3 border-amber-500/60 bg-gradient-to-br from-amber-950/40 to-yellow-950/20">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-amber-300 font-bold text-sm">★ 次の目標</span>
            <span className="text-yellow-100 font-bold">{activeOnboarding.title}</span>
            <span className="ml-auto text-xs text-yellow-200/70 tabular-nums">
              {activeOnboarding.progress}/{activeOnboarding.goalCount}
            </span>
          </div>
          <p className="text-xs text-yellow-100/85 leading-relaxed">{activeOnboarding.description}</p>
          <div className="mt-2 h-1.5 bg-black/50 border border-yellow-900/50 rounded overflow-hidden">
            <div
              className="h-full bg-amber-400"
              style={{
                width: `${Math.min(100, Math.max(0, (activeOnboarding.progress / Math.max(1, activeOnboarding.goalCount)) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 panel space-y-3">
          {town ? (
            <>
              <h2 className="text-lg font-bold text-yellow-200">{town.name}</h2>
              <p className="text-sm text-yellow-100/80">{town.description}</p>
              <div className="text-xs text-yellow-200/70">
                危険度 {town.danger} ・ 治安 {town.security} ・ 経済 {town.economy} ・ 宿屋 {town.innFee}G
              </div>
              <div className="border-t border-b border-yellow-900/40 py-2 my-2 text-xs text-yellow-200/90 space-y-0.5">
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span><span className="text-yellow-300/70">{world.date}</span> の世界:</span>
                  <span className="text-yellow-100">{world.weatherTone}</span>
                  <span>弱点属性 <span className="text-yellow-100">{jpElementName(world.weakElement)}</span></span>
                  <span>動向 <span className="text-yellow-100">{world.monsterTrend}</span></span>
                </div>
                <div className="italic text-yellow-100/80">― {world.headline}</div>
              </div>
              {tutorialHint && <TutorialBox hint={tutorialHint} />}
              {activeRaids.length > 0 && (
                <section className="border border-red-700/70 bg-red-950/30 rounded p-2">
                  {activeRaids.map((r) => {
                    const lobbyMs = Math.max(0, r.joinDeadline - Date.now());
                    const combatMs = Math.max(0, r.combatEndsAt - Date.now());
                    return (
                      <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-red-300 font-bold">★ レイド出現</span>
                        <span className="text-amber-200">『{r.name}』</span>
                        <span className="text-yellow-100/80">
                          {r.status === "joining"
                            ? `集合中・残り ${Math.ceil(lobbyMs / 1000)}s`
                            : `戦闘中・残り ${Math.ceil(combatMs / 60000)}分`}
                        </span>
                        <span className="text-yellow-200/70">参戦 {r.participants.length} 名</span>
                        <Link href={`/raid/${r.id}`} className="btn-primary ml-auto">参戦する</Link>
                      </div>
                    );
                  })}
                </section>
              )}
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
                  {(() => {
                    // Cycle 41-2: 受注済み + 完了済みクエストは掲示板から除外。
                    // 「進行中」セクションが下にあるので、ここは「未受注」
                    // のみに絞ってプレイヤーの選択肢を整理する。acceptedQuestIds
                    // は完了済みも含む (重複受注 unique 制約あり)。
                    const openQuests = town.quests.filter((q) => !acceptedQuestIds.has(q.id));
                    if (openQuests.length === 0) {
                      return <li className="text-yellow-200/50 text-xs">未受注のクエストはありません。</li>;
                    }
                    return openQuests.map((q) => (
                      <li key={q.id} className="border border-yellow-900/40 rounded p-2 bg-black/30">
                        <div className="text-sm font-bold text-yellow-100">{q.title} <span className="text-xs text-yellow-200/60">EXP {q.expReward} / G {q.goldReward}</span></div>
                        <div className="text-xs text-yellow-100/80">{q.description}</div>
                        <form action={`/api/quests/${q.id}/accept`} method="post" className="mt-1">
                          <button className="btn">受注</button>
                        </form>
                      </li>
                    ));
                  })()}
                </ul>
              </section>
              <section className="mt-3">
                <h3 className="text-sm font-bold text-yellow-200 mb-1">受注中</h3>
                <ul className="text-xs text-yellow-100/80 space-y-1">
                  {(() => {
                    // Cycle 41-4: onboarding は上部の専用バナーで表示するので
                    // 重複を避けるためここから除外する。chain 完走後は通常
                    // クエストのみが残る。
                    const nonOnboarding = myQuests.filter((q) => q.quest.generatedBy !== "onboarding");
                    if (nonOnboarding.length === 0) {
                      return <li className="text-yellow-200/50">なし</li>;
                    }
                    return nonOnboarding.map((q) => (
                      <li key={q.id}>・{q.quest.title}（{q.progress}/{q.quest.goalCount}）</li>
                    ));
                  })()}
                </ul>
              </section>
              {recentEvents.length > 0 && (
                <section className="mt-3">
                  <h3 className="text-sm font-bold text-yellow-200 mb-1">最近の世界の出来事</h3>
                  <ul className="space-y-1">
                    {recentEvents.map((a) => (
                      <li key={a.id} className="border border-amber-900/40 bg-black/30 rounded p-2">
                        <div className="text-xs text-amber-300/80">
                          {a.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                        </div>
                        <div className="text-sm font-bold text-amber-200">{a.title}</div>
                        <div className="text-xs text-yellow-100/80">{a.body}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="mt-3">
                <h3 className="text-sm font-bold text-yellow-200 mb-1">街にいる人々</h3>
                <ul className="text-xs text-yellow-100/80 space-y-1">
                  {npcLines.length === 0 && <li className="text-yellow-200/50">まだ誰もいない。</li>}
                  {npcLines.map((n) => (
                    n.curated ? (
                      <li key={n.id}>
                        <details className="border border-purple-900/40 rounded p-2 bg-purple-950/20">
                          <summary className="cursor-pointer">
                            <span className="text-purple-300 mr-1">★</span>
                            {n.name}（{n.role}）：「{n.line}」
                          </summary>
                          {n.bio && (
                            <div className="mt-1 text-[11px] text-purple-100/85 leading-relaxed">{n.bio}</div>
                          )}
                          {n.relations.length > 0 && (
                            <div className="mt-1 text-[10px] text-purple-200/80">
                              関係: {n.relations.map((r, i) => (
                                <span key={i}>
                                  {i > 0 && <span className="text-purple-200/40"> / </span>}
                                  {r.name}（{r.relation}）
                                </span>
                              ))}
                            </div>
                          )}
                        </details>
                      </li>
                    ) : (
                      <li key={n.id}>＊{n.name}（{n.role}）：「{n.line}」</li>
                    )
                  ))}
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
                {nextLockedTown && (
                  <div className="mt-2 text-[11px] text-yellow-200/60">
                    🔒 Lv{nextLockedTown.unlockLevel} で開放: {nextLockedTown.name}（{nextLockedTown.region}）
                  </div>
                )}
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
            <Link href="/mastery" className="btn block text-center mt-2">修練クエスト</Link>
          </div>
          <div className="panel">
            <div className="text-sm font-bold text-yellow-200 mb-2">本日のチャレンジ（3 件）</div>
            <ul className="space-y-1 text-xs">
              {dailyChallenges.map((d) => {
                const pct = Math.min(100, Math.floor((d.progress / d.goalCount) * 100));
                const done = !!d.completedAt;
                return (
                  <li key={d.id} className={`border rounded p-2 ${done ? "border-green-700/60 bg-green-950/15" : "border-yellow-900/40 bg-black/30"}`}>
                    <div className="flex justify-between gap-1">
                      <span className={done ? "line-through text-yellow-200/60" : "text-yellow-100"}>
                        {describeDailyChallenge(d)}
                      </span>
                      {done ? (
                        <span className="text-green-300">★</span>
                      ) : (
                        <span className="text-yellow-200/70 tabular-nums">{d.progress}/{d.goalCount}</span>
                      )}
                    </div>
                    {!done && (
                      <div className="mt-1 h-1 bg-black/50 border border-yellow-900/40 rounded overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    <div className="text-[10px] text-yellow-300/70 mt-0.5">EXP +{d.rewardExp} / G +{d.rewardGold}</div>
                  </li>
                );
              })}
            </ul>
            <div className="text-[10px] text-yellow-200/60 mt-1">3 件全クリで追加報酬（EXP +600 / G +500）</div>
          </div>
        </div>
      </div>
    </main>
  );
}
