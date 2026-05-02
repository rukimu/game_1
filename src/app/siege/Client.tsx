"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Siege = {
  id: string;
  castleName: string;
  region: string;
  status: "pending" | "active" | "ended";
  startsAt: string;
  endsAt: string | null;
  registrations: Array<{ guildId: string; guildName: string; memberCount: number; score: number }>;
  winningGuildName: string | null;
  currentOwnerName: string | null;
  battleLog: Array<{ round: number; kind: string; line: string }>;
  myGuildRegistered: boolean;
  canRegister: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "登録受付中",
  active: "戦闘中",
  ended: "決着済み",
};

export default function SiegeClient({ sieges }: { sieges: Siege[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function register(siegeId: string) {
    setBusy(siegeId);
    setErr(null);
    try {
      const r = await fetch("/api/siege/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siegeId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d.error ?? "登録に失敗しました");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (sieges.length === 0) {
    return <div className="text-yellow-200/60 text-sm italic">城がありません。</div>;
  }
  return (
    <div className="space-y-3">
      {err && <div className="text-red-400 text-xs">{err}</div>}
      {sieges.map((s) => (
        <div
          key={s.id}
          className={`border rounded p-3 ${s.status === "active" ? "border-amber-700/60 bg-amber-950/20" : s.status === "ended" ? "border-yellow-900/40 bg-black/30" : "border-blue-800/50 bg-blue-950/15"}`}
        >
          <div className="flex justify-between items-baseline">
            <div>
              <div className="text-base font-bold text-yellow-100">{s.castleName}</div>
              <div className="text-xs text-yellow-200/70">{s.region}</div>
            </div>
            <div className="text-xs">
              <span className={s.status === "active" ? "text-amber-300" : s.status === "ended" ? "text-yellow-200/60" : "text-blue-300"}>
                ● {STATUS_LABEL[s.status]}
              </span>
            </div>
          </div>
          <div className="text-xs text-yellow-200/70 mt-1">
            開始: {s.startsAt}{s.endsAt ? ` / 決着予定: ${s.endsAt}` : ""}
          </div>
          {s.currentOwnerName && (
            <div className="text-xs text-yellow-100/90 mt-1">
              現在の城主: <span className="text-amber-200">{s.currentOwnerName}</span>
            </div>
          )}
          {s.winningGuildName && (
            <div className="text-xs text-amber-300 mt-1">★ 勝者: {s.winningGuildName}</div>
          )}
          <div className="mt-2">
            <div className="text-xs text-yellow-300/80">登録ギルド ({s.registrations.length})</div>
            {s.registrations.length === 0 ? (
              <div className="text-xs text-yellow-200/50 italic">まだ登録されていない。</div>
            ) : (
              <ul className="text-xs text-yellow-100/90 mt-1 space-y-0.5">
                {s.registrations.map((r) => (
                  <li key={r.guildId}>
                    ・{r.guildName} <span className="text-yellow-200/60">({r.memberCount} 人</span>
                    {s.status === "ended" && <span className="text-yellow-300/70"> / スコア {r.score}</span>}
                    <span className="text-yellow-200/60">)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {s.canRegister && !s.myGuildRegistered && (
            <div className="mt-2">
              <button
                className="btn-primary text-xs"
                disabled={busy === s.id}
                onClick={() => register(s.id)}
              >
                {busy === s.id ? "..." : "ギルドを登録する"}
              </button>
            </div>
          )}
          {s.myGuildRegistered && (
            <div className="mt-2 text-xs text-green-300">★ あなたのギルドは登録済み</div>
          )}
          {s.status === "active" && (
            <div className="mt-2">
              <a className="btn-primary text-xs" href={`/siege/${s.id}/battle`}>
                戦闘画面へ
              </a>
              <span className="text-[10px] text-yellow-200/60 ml-2">
                {s.myGuildRegistered ? "30秒ターン制で操作介入" : "観戦のみ"}
              </span>
            </div>
          )}
          {s.status === "ended" && s.battleLog.length > 0 && (
            <details className="mt-3 border border-yellow-900/40 rounded bg-black/30 p-2">
              <summary className="cursor-pointer text-xs font-bold text-yellow-300/80">
                戦況詳細（{s.battleLog.length} 行）
              </summary>
              <ul className="text-[11px] text-yellow-100/80 mt-1 space-y-0.5">
                {s.battleLog.map((entry, idx) => (
                  <li
                    key={idx}
                    className={
                      entry.kind === "intro"
                        ? "text-yellow-200/90 italic"
                        : entry.kind === "rally"
                          ? "text-amber-300/90"
                          : entry.kind === "summary"
                            ? "text-amber-200 font-bold mt-1"
                            : ""
                    }
                  >
                    {entry.line}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
