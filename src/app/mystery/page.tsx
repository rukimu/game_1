import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { getCharacterMystery } from "@/lib/mystery";

export const dynamic = "force-dynamic";

export default async function MysteryPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const m = await getCharacterMystery(c.id);
  return (
    <main>
      <Hud />
      <div className="panel space-y-3">
        <div className="text-xs text-yellow-300/70">{m?.seasonName}</div>
        <h2 className="text-lg font-bold text-yellow-200">{m?.title ?? "今シーズンの謎"}</h2>
        {m?.hint && <p className="text-sm text-yellow-100/80">{m.hint}</p>}
        {m?.solvedAt && (
          <div className="text-xs text-yellow-300">
            この謎は{m.solverName ?? "誰か"}によって解き明かされた。
          </div>
        )}
        <div className="text-xs text-yellow-200/60">手がかり {m?.foundCount ?? 0} / {m?.totalCount ?? 0}</div>
        <ol className="space-y-2">
          {m?.clues.map((c) => (
            <li key={c.id} className={`border rounded p-3 ${c.text ? "border-yellow-700/60 bg-yellow-900/10" : "border-yellow-900/40 bg-black/30"}`}>
              <div className="text-xs text-yellow-300/60">手がかり {c.idx + 1}{c.isFinal ? "（核心）" : ""}</div>
              {c.text ? (
                <div className="text-sm text-yellow-100">{c.text}</div>
              ) : (
                <div className="text-sm text-yellow-100/40 italic">
                  ??? — {c.hint ?? "まだ見つけていない手がかり。"}
                </div>
              )}
              {c.foundAt && (
                <div className="text-[10px] text-yellow-300/60 mt-1">
                  発見: {new Date(c.foundAt).toLocaleString()} ／ {c.source}
                </div>
              )}
            </li>
          ))}
        </ol>
        <p className="text-xs text-yellow-200/50">
          手がかりは酒場の噂、戦いの最中、ダンジョンの奥などで見つかることがある。
          すべての手がかりを集めた者が、最初に世界の謎に到達する。
        </p>
      </div>
    </main>
  );
}
