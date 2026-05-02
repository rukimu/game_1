import Hud from "@/components/Hud";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Cycle 34: 季節カノン (Season Canon).
// A read-only chronicle of every season the world has lived through.
// Solved mysteries surface their solver and date so players can see
// "ああ、あのシーズンは ○○ が解いたのか" — collective memory.
export default async function CanonPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const seasons = await prisma.season.findMany({
    orderBy: { startedAt: "desc" },
  });
  return (
    <main className="space-y-3">
      <Hud />
      <div className="panel space-y-2">
        <div className="text-xs">
          <Link href="/town" className="underline text-yellow-300/80">街に戻る</Link>
        </div>
        <h2 className="text-lg font-bold text-yellow-200">季節カノン — 世界の年表</h2>
        <p className="text-xs text-yellow-100/85">
          世界が生きてきた季節の記録。中心の謎は誰がいつ解き明かしたか、
          解明後どれだけの間その季節は続いたか。集合的な記憶。
        </p>
      </div>
      <div className="panel">
        {seasons.length === 0 ? (
          <div className="text-xs text-yellow-200/70">まだ記録がない。</div>
        ) : (
          <ol className="space-y-3">
            {seasons.map((s) => {
              const isCurrent = s.isCurrent;
              const solved = s.mysterySolvedAt;
              return (
                <li
                  key={s.id}
                  className={`border rounded p-3 ${
                    isCurrent
                      ? "border-amber-500/60 bg-amber-950/20"
                      : solved
                        ? "border-green-900/40 bg-green-950/10"
                        : "border-yellow-900/40 bg-black/30"
                  }`}
                >
                  <div className="flex justify-between items-baseline flex-wrap gap-1">
                    <div className="text-sm font-bold text-yellow-100">
                      {s.name}
                      {isCurrent && <span className="ml-2 text-xs text-amber-300">[現在]</span>}
                    </div>
                    <div className="text-[10px] text-yellow-200/60 tabular-nums">
                      {s.startedAt.toISOString().slice(0, 10)}
                      {s.endedAt && ` 〜 ${s.endedAt.toISOString().slice(0, 10)}`}
                    </div>
                  </div>
                  {s.mysteryTitle && (
                    <div className="mt-2 text-xs">
                      <span className="text-yellow-300/80">中心の謎:</span>{" "}
                      <span className="text-yellow-100">{s.mysteryTitle}</span>
                    </div>
                  )}
                  {s.mysteryHint && (
                    <div className="text-[11px] text-yellow-100/70 mt-1 leading-relaxed">{s.mysteryHint}</div>
                  )}
                  {solved ? (
                    <div className="mt-2 text-xs border-t border-yellow-900/40 pt-2">
                      <span className="text-green-300">★ 解明:</span>{" "}
                      <span className="text-yellow-100">{s.mysterySolverName ?? "不明"}</span>
                      {" — "}
                      <span className="text-yellow-200/70 tabular-nums">
                        {solved.toISOString().slice(0, 10)}
                      </span>
                    </div>
                  ) : isCurrent ? (
                    <div className="mt-2 text-xs text-amber-300/80">→ 進行中。手がかりを集めよ。</div>
                  ) : (
                    <div className="mt-2 text-xs text-yellow-200/50">→ 解明されぬまま閉じた季節</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
