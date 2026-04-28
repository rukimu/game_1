"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PvpClient({ duels }: any) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  async function challenge() {
    setErr(null);
    const r = await fetch("/api/pvp/duels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opponentName: name }) });
    if (!r.ok) { setErr((await r.json()).error); return; }
    setName("");
    router.refresh();
  }
  async function accept(id: string) {
    const r = await fetch(`/api/pvp/duels/${id}/accept`, { method: "POST" });
    if (!r.ok) { setErr((await r.json()).error); return; }
    router.refresh();
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="input flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="相手のキャラクター名" />
        <button className="btn-primary" onClick={challenge}>挑戦</button>
      </div>
      {err && <div className="text-red-400 text-xs">{err}</div>}
      <ul className="space-y-1">
        {duels.map((d: any) => (
          <li key={d.id} className="border border-yellow-900/40 rounded p-2 bg-black/30">
            <div className="text-sm">{d.challengerName} vs {d.opponentName} <span className="text-xs text-yellow-200/60">[{d.status}]</span></div>
            {d.winner && <div className="text-xs text-yellow-300">勝者: {d.winner}</div>}
            {d.log.length > 0 && (
              <details className="mt-1">
                <summary className="text-xs cursor-pointer">戦闘ログを見る</summary>
                <ol className="text-xs text-yellow-100/70 mt-1 pl-4 list-decimal">
                  {d.log.map((l: string, i: number) => <li key={i}>{l}</li>)}
                </ol>
              </details>
            )}
            {d.isMineToAccept && <button className="btn-primary mt-1" onClick={() => accept(d.id)}>受けて立つ</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
