"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = {
  id: string;
  displayName: string;
  slot: string;
  tier: string;
  tierLabel: string;
  tierClass: string;
  equipped: boolean;
  specials: string[];
};

export default function ForgeClient({ rows, myGold }: { rows: Row[]; myGold: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function forge(id: string, mode: "reroll" | "upgrade") {
    setBusy(`${mode}:${id}`);
    setErr(null); setOk(null);
    try {
      const r = await fetch("/api/forge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemId: id, mode }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? "加工に失敗しました"); return; }
      setOk(`${d.before?.displayName} → ${d.after?.displayName}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return <div className="text-yellow-200/60 text-sm italic">加工できる装備がありません。</div>;
  }
  return (
    <div className="space-y-2">
      {err && <div className="text-red-400 text-xs">{err}</div>}
      {ok && <div className="text-green-300 text-xs">★ {ok}</div>}
      <ul className="space-y-1">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`border rounded p-2 text-sm ${r.equipped ? "border-green-500/60 bg-green-900/10" : "border-yellow-900/40 bg-black/30"}`}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <div className="font-bold">
                  <span className={r.tierClass}>{r.displayName}</span>
                  <span className="ml-2 text-xs">[{r.tierLabel}]</span>
                  {r.equipped && <span className="ml-2 text-green-300 text-xs">[装備中]</span>}
                </div>
                {r.specials.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {r.specials.map((s, i) => (
                      <li key={i} className="text-xs text-purple-200/80 italic">― {s}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  className="btn text-xs"
                  disabled={!!busy}
                  onClick={() => forge(r.id, "reroll")}
                >
                  {busy === `reroll:${r.id}` ? "..." : "リロール"}
                </button>
                <button
                  className="btn-primary text-xs"
                  disabled={!!busy || r.tier === "legendary"}
                  onClick={() => forge(r.id, "upgrade")}
                >
                  {busy === `upgrade:${r.id}` ? "..." : "強化"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
