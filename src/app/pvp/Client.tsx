"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Duel = {
  id: string;
  status: string;
  challengerName: string;
  opponentName: string;
  winner: string | null;
  isMineToAccept: boolean;
  iWon: boolean;
  log: string[];
  createdAt: string;
};

type Suggested = { id: string; name: string; level: number; jobName: string };

export default function PvpClient({
  sent, incoming, finished, suggested,
}: {
  sent: Duel[]; incoming: Duel[]; finished: Duel[]; suggested: Suggested[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function challenge(opponentName: string) {
    setErr(null);
    setBusy(`challenge:${opponentName}`);
    try {
      const r = await fetch("/api/pvp/duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentName }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d.error ?? "挑戦に失敗しました");
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function accept(id: string) {
    setBusy(`accept:${id}`);
    try {
      const r = await fetch(`/api/pvp/duels/${id}/accept`, { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d.error ?? "決闘に失敗しました");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {err && <div className="text-red-400 text-xs">{err}</div>}

      {incoming.filter((d) => d.status === "pending").length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-yellow-200 mb-1">受信中の挑戦</h3>
          <ul className="space-y-1">
            {incoming.filter((d) => d.status === "pending").map((d) => (
              <li key={d.id} className="border border-amber-700/60 bg-amber-950/30 rounded p-2">
                <div className="text-sm">
                  <span className="text-amber-200 font-bold">{d.challengerName}</span> があなたに決闘を申し込んだ
                </div>
                <div className="text-xs text-yellow-200/60 mt-1">{d.createdAt}</div>
                <div className="mt-2">
                  <button
                    className="btn-primary"
                    disabled={busy === `accept:${d.id}`}
                    onClick={() => accept(d.id)}
                  >
                    {busy === `accept:${d.id}` ? "..." : "受けて立つ"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-sm font-bold text-yellow-200 mb-1">挑戦</h3>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="相手のキャラクター名"
          />
          <button
            className="btn-primary"
            disabled={busy === `challenge:${name}` || !name.trim()}
            onClick={() => challenge(name)}
          >
            挑戦
          </button>
        </div>
        {suggested.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-yellow-200/60 mb-1">あなたと近いレベルの挑戦相手:</div>
            <div className="flex flex-wrap gap-2">
              {suggested.map((s) => (
                <button
                  key={s.id}
                  className="btn text-xs"
                  disabled={busy === `challenge:${s.name}`}
                  onClick={() => challenge(s.name)}
                >
                  {s.name} <span className="text-yellow-300/70">Lv{s.level} {s.jobName}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {sent.filter((d) => d.status === "pending").length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-yellow-200 mb-1">送信中の挑戦 (相手の応答待ち)</h3>
          <ul className="space-y-1 text-sm">
            {sent.filter((d) => d.status === "pending").map((d) => (
              <li key={d.id} className="border border-yellow-900/40 rounded p-2 bg-black/30">
                <span className="text-yellow-100">→ {d.opponentName}</span>
                <span className="text-xs text-yellow-200/60 ml-2">{d.createdAt}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-sm font-bold text-yellow-200 mb-1">最近の決闘</h3>
        {finished.length === 0 ? (
          <div className="text-yellow-200/50 text-xs italic">まだ決闘の記録はない。</div>
        ) : (
          <ul className="space-y-1">
            {finished.map((d) => (
              <li
                key={d.id}
                className={`border rounded p-2 ${d.iWon ? "border-green-700/60 bg-green-950/15" : "border-red-700/60 bg-red-950/15"}`}
              >
                <div className="text-sm">
                  {d.challengerName} <span className="text-yellow-200/60">vs</span> {d.opponentName}
                  {d.winner && (
                    <span className={`ml-2 text-xs ${d.iWon ? "text-green-300" : "text-red-300"}`}>
                      勝者: {d.winner}
                    </span>
                  )}
                </div>
                <div className="text-xs text-yellow-200/60">{d.createdAt}</div>
                {d.log.length > 0 && (
                  <details className="mt-1">
                    <summary className="text-xs cursor-pointer text-yellow-300/80">戦闘ログ ({d.log.length} 行)</summary>
                    <ol className="text-xs text-yellow-100/70 mt-1 pl-4 list-decimal">
                      {d.log.map((l, i) => <li key={i}>{l}</li>)}
                    </ol>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
