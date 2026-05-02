import Hud from "@/components/Hud";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import { getActiveAbyssRun, getWeeklyAbyssLeaderboard, abyssBossNameForFloor } from "@/lib/abyss";
import AbyssClient from "./Client";

export const dynamic = "force-dynamic";

export default async function AbyssPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");

  const run = await getActiveAbyssRun(c.id);
  let activeBattleStatus: "none" | "active" | "ended" = "none";
  if (run?.currentBattleId) {
    const battle = await prisma.battle.findUnique({ where: { id: run.currentBattleId } });
    if (battle) activeBattleStatus = battle.status === "active" ? "active" : "ended";
  }

  // Latest dead/aborted run for the after-action summary.
  const lastRun = await prisma.abyssRun.findFirst({
    where: { characterId: c.id, status: { in: ["aborted", "dead"] } },
    orderBy: { endedAt: "desc" },
  });

  const leaderboard = await getWeeklyAbyssLeaderboard(20);

  return (
    <main className="space-y-3">
      <Hud />
      <div className="panel space-y-2">
        <div className="text-xs">
          <Link href="/town" className="underline text-yellow-300/80">街に戻る</Link>
        </div>
        <h2 className="text-lg font-bold text-yellow-200">奈落 — 無限階の挑戦</h2>
        <p className="text-xs text-yellow-100/80">
          階を進むほど敵は強く、報酬は指数的に増える。10 階ごとに固有ボスが立ちはだかる。
          撤退は累積報酬を全額持ち帰るが、全滅すると半分が霧散する。週次でランキングがリセット。
        </p>
        {c.level < 50 && (
          <div className="text-xs text-red-300">奈落は Lv50 から挑戦できる。あなたは Lv{c.level}。</div>
        )}
      </div>
      <AbyssClient
        characterLevel={c.level}
        runId={run?.id ?? null}
        currentFloor={run?.currentFloor ?? 0}
        accumulatedGold={run?.accumulatedGold ?? 0}
        accumulatedExp={run?.accumulatedExp ?? 0}
        activeBattleStatus={activeBattleStatus}
        currentBattleId={run?.currentBattleId ?? null}
        nextBossName={abyssBossNameForFloor((run?.currentFloor ?? 0) + 1)}
        lastRun={lastRun ? {
          floor: lastRun.currentFloor,
          status: lastRun.status,
          gold: lastRun.accumulatedGold,
          exp: lastRun.accumulatedExp,
        } : null}
        leaderboard={leaderboard}
      />
    </main>
  );
}
