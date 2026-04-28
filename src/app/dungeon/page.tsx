import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import DungeonStarter from "./Starter";

export const dynamic = "force-dynamic";

export default async function DungeonPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const active = await prisma.dungeonRun.findFirst({
    where: { characterId: c.id, status: "active" },
  });
  if (active) redirect(`/dungeon/${active.id}`);
  const past = await prisma.dungeonRun.findMany({
    where: { characterId: c.id, status: { in: ["cleared", "aborted", "dead"] } },
    orderBy: { startedAt: "desc" },
    take: 10,
  });
  return (
    <main>
      <Hud />
      <div className="panel space-y-3">
        <h2 className="text-lg font-bold text-yellow-200">ダンジョン探索</h2>
        <p className="text-sm text-yellow-100/80">
          ダンジョンは複数階層の連戦。<strong>各階の報酬は累積し、撤退すれば全て持ち帰れる</strong>。
          <strong className="text-red-300">全滅すると累積報酬の半分を失う</strong>。
          深く潜るほど敵は強くなり、報酬倍率も上がる。
        </p>
        <DungeonStarter />
        {past.length > 0 && (
          <div className="border-t border-yellow-900/40 pt-3">
            <div className="text-sm font-bold text-yellow-200 mb-1">過去の探索</div>
            <ul className="space-y-1 text-xs">
              {past.map((r) => (
                <li key={r.id} className="border border-yellow-900/40 rounded p-2 bg-black/30">
                  <div>{r.name} ({r.currentFloor}/{r.totalFloors}階)</div>
                  <div className="text-yellow-200/70">結果: {r.status} ／ 累積exp {r.accumulatedExp} / G {r.accumulatedGold}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
