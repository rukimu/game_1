import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import PvpClient from "./Client";

export const dynamic = "force-dynamic";

export default async function PvpPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const duels = await prisma.duel.findMany({
    where: { OR: [{ challengerCharacterId: c.id }, { opponentCharacterId: c.id }] },
    include: { challenger: true, opponent: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // Personal record.
  const finishedDuels = await prisma.duel.findMany({
    where: {
      status: "finished",
      OR: [{ challengerCharacterId: c.id }, { opponentCharacterId: c.id }],
    },
    select: { winnerCharacterId: true, challengerCharacterId: true, opponentCharacterId: true },
  });
  let myWins = 0, myLosses = 0;
  for (const d of finishedDuels) {
    if (d.winnerCharacterId === c.id) myWins++;
    else if (d.winnerCharacterId) myLosses++;
  }

  // Suggested opponents: nearby rating (±200) AND nearby level (±5),
  // excluding self and currently cursed players. Sorted by recent activity.
  const myRating = c.duelRating;
  const suggested = await prisma.character.findMany({
    where: {
      id: { not: c.id },
      level: { gte: Math.max(1, c.level - 5), lte: c.level + 5 },
      duelRating: { gte: myRating - 200, lte: myRating + 200 },
      isCursed: false,
    },
    select: { id: true, name: true, level: true, currentJobId: true, currentTownId: true, duelRating: true },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const jobIds = Array.from(new Set(suggested.map((s) => s.currentJobId).filter((j): j is string => !!j)));
  const jobs = jobIds.length > 0
    ? await prisma.job.findMany({ where: { id: { in: jobIds } }, select: { id: true, name: true } })
    : [];
  const jobMap = new Map(jobs.map((j) => [j.id, j.name]));

  // Top arena board: ranked by ELO rating among characters who have at
  // least one finished duel. Lifetime wins are shown alongside.
  const ratedTop = await prisma.character.findMany({
    where: {
      OR: [
        { duelsA: { some: { status: "finished" } } },
        { duelsB: { some: { status: "finished" } } },
      ],
    },
    select: { id: true, name: true, level: true, duelRating: true },
    orderBy: { duelRating: "desc" },
    take: 10,
  });
  const winsByCid = new Map<string, number>();
  if (ratedTop.length > 0) {
    const wins = await prisma.duel.groupBy({
      by: ["winnerCharacterId"],
      where: { status: "finished", winnerCharacterId: { in: ratedTop.map((r) => r.id) } },
      _count: { _all: true },
    });
    for (const w of wins) {
      if (w.winnerCharacterId) winsByCid.set(w.winnerCharacterId, w._count._all);
    }
  }
  const leaderboard = ratedTop.map((r) => ({
    id: r.id,
    name: r.name,
    level: r.level,
    rating: r.duelRating,
    wins: winsByCid.get(r.id) ?? 0,
  }));

  const sent = duels.filter((d) => d.challengerCharacterId === c.id);
  const incoming = duels.filter((d) => d.opponentCharacterId === c.id);
  const finished = duels.filter((d) => d.status === "finished");

  const meId = c.id;
  function formatDuel(d: typeof duels[number]) {
    return {
      id: d.id,
      status: d.status,
      challengerName: d.challenger.name,
      opponentName: d.opponent.name,
      winner: d.winnerCharacterId === d.challengerCharacterId
        ? d.challenger.name
        : d.winnerCharacterId === d.opponentCharacterId
          ? d.opponent.name
          : null,
      isMineToAccept: d.opponentCharacterId === meId && d.status === "pending",
      iWon: d.winnerCharacterId === meId,
      log: JSON.parse(d.log || "[]"),
      createdAt: d.createdAt.toISOString().slice(0, 16).replace("T", " "),
    };
  }

  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 panel space-y-4">
          <h2 className="text-lg font-bold text-yellow-200">闘技場 / 決闘</h2>
          <p className="text-xs text-yellow-200/70">
            敗北しても所持金・経験値は失われない。戦績だけが残る。
            装備とアフィックス効果が反映されるので、武器を選んで挑むこと。
          </p>
          <PvpClient
            sent={sent.map(formatDuel)}
            incoming={incoming.map(formatDuel)}
            finished={finished.map(formatDuel)}
            suggested={suggested.map((s) => ({
              id: s.id,
              name: s.name,
              level: s.level,
              jobName: s.currentJobId ? jobMap.get(s.currentJobId) ?? "—" : "—",
              rating: s.duelRating,
            }))}
          />
        </div>
        <div className="space-y-3">
          <div className="panel">
            <div className="text-sm font-bold text-yellow-200 mb-1">あなたの戦績</div>
            <div className="text-2xl font-bold tabular-nums">
              <span className="text-green-300">{myWins}</span>
              <span className="text-yellow-200/60 text-base mx-1">勝</span>
              <span className="text-red-300">{myLosses}</span>
              <span className="text-yellow-200/60 text-base mx-1">敗</span>
            </div>
            <div className="text-sm mt-1">
              <span className="text-yellow-200/60">レート </span>
              <span className="text-amber-200 font-bold tabular-nums">{c.duelRating}</span>
            </div>
            {(myWins + myLosses) > 0 && (
              <div className="text-xs text-yellow-200/60 mt-1">
                勝率 {Math.round((myWins / (myWins + myLosses)) * 100)}%
              </div>
            )}
          </div>
          <div className="panel">
            <div className="text-sm font-bold text-yellow-200 mb-1">闘技場ランキング (レート上位)</div>
            {leaderboard.length === 0 ? (
              <div className="text-yellow-200/50 text-xs italic">まだ誰も決闘を行っていない。</div>
            ) : (
              <ol className="text-sm space-y-0.5">
                {leaderboard.map((r, idx) => (
                  <li key={r.id} className={r.id === c.id ? "text-green-200 font-bold" : ""}>
                    <span className="text-yellow-300 tabular-nums">#{idx + 1}</span>
                    <span className="ml-2">{r.name}</span>
                    <span className="text-xs text-yellow-200/60 ml-2">Lv{r.level}</span>
                    <span className="text-xs text-amber-300 ml-2 tabular-nums">R {r.rating}</span>
                    <span className="text-xs text-yellow-300/60 ml-2 tabular-nums">{r.wins}勝</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
