"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Run = {
  id: string;
  name: string;
  totalFloors: number;
  currentFloor: number;
  status: string;
  accumulatedExp: number;
  accumulatedGold: number;
  currentBattleId: string | null;
};

export default function DungeonClient({ initialRunId }: { initialRunId: string }) {
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [battle, setBattle] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/dungeons/${initialRunId}`, { cache: "no-store" });
    if (!r.ok) return;
    const d = await r.json();
    setRun(d.run);
    setBattle(d.battle);
  }
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [initialRunId]);

  async function advance() {
    setBusy(true); setErr(null);
    const r = await fetch(`/api/dungeons/${initialRunId}/advance`, { method: "POST" });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error); return; }
    const d = await r.json();
    if (d.battleId) router.push(`/battle/${d.battleId}`);
  }
  async function retreat() {
    setBusy(true); setErr(null);
    const r = await fetch(`/api/dungeons/${initialRunId}/retreat`, { method: "POST" });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error); return; }
    router.push("/dungeon");
    router.refresh();
  }

  if (!run) return <div className="panel">読み込み中…</div>;

  return (
    <div className="panel space-y-3">
      <div className="text-xs text-yellow-300/70">{run.name}</div>
      <h2 className="text-lg font-bold text-yellow-200">第 {run.currentFloor} / {run.totalFloors} 階</h2>
      <div className="text-sm">
        累積報酬: <span className="text-yellow-200">経験値 {run.accumulatedExp}</span> ／ <span className="text-yellow-200">G {run.accumulatedGold}</span>
      </div>
      <div className="border border-yellow-900/40 rounded p-3 bg-black/30 text-sm">
        {run.status === "active" ? (
          run.currentBattleId && battle && battle.status === "active" ? (
            <div>
              <div className="mb-2">戦闘中だ。戦いを進めよ。</div>
              <button className="btn-primary" onClick={() => router.push(`/battle/${run.currentBattleId}`)}>戦闘画面へ</button>
            </div>
          ) : run.currentFloor < run.totalFloors ? (
            <div className="space-y-2">
              <div>
                {run.currentFloor === 0 ? "ダンジョンの入口に立った。" : "次の階段が見える。"}
                <span className="text-yellow-200/70 text-xs"> ／ 撤退すれば累積報酬を持ち帰れる。死ねば半分を失う。</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button className="btn-primary" onClick={advance} disabled={busy}>進む（{run.currentFloor + 1}階へ）</button>
                <button className="btn" onClick={retreat} disabled={busy || run.currentFloor === 0}>撤退する（報酬を持ち帰る）</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div>最深部まで踏破した！</div>
              <button className="btn-primary" onClick={retreat} disabled={busy}>報酬を受け取って戻る</button>
            </div>
          )
        ) : run.status === "dead" ? (
          <div className="space-y-2">
            <div className="text-red-300">ダンジョンで力尽きた。累積報酬の半分が霧散した。</div>
            <button className="btn" onClick={() => router.push("/town")}>街に戻る</button>
          </div>
        ) : (
          <div className="space-y-2">
            <div>探索は終わった（{run.status}）。</div>
            <button className="btn" onClick={() => router.push("/town")}>街に戻る</button>
          </div>
        )}
      </div>
      {err && <div className="text-red-400 text-xs">{err}</div>}
    </div>
  );
}
