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

type Preview = {
  goldCost: number;
  tier: string;
  outcomeTier: string;
  outcomeAltTier?: string | null;
  outcomeAltChance?: number;
  haveGold: boolean;
  haveMaterials: boolean;
  materials: Array<{ id: string; name: string; tier: string; equipped: boolean }>;
  currentBonusSummary: string;
};

const TIER_LABEL_JA: Record<string, string> = {
  common: "並",
  rare: "良質",
  epic: "希少",
  legendary: "伝説",
};

export default function ForgeClient({ rows, myGold }: { rows: Row[]; myGold: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; mode: "reroll" | "upgrade"; data: Preview } | null>(null);

  async function showPreview(id: string, mode: "reroll" | "upgrade") {
    setBusy(`pv:${mode}:${id}`);
    setErr(null);
    try {
      const r = await fetch("/api/forge/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemId: id, mode }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d.error ?? "プレビューに失敗しました");
        setPreview(null);
      } else {
        setPreview({ id, mode, data: d });
      }
    } finally {
      setBusy(null);
    }
  }

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
      setPreview(null);
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
                <div className="flex gap-1">
                  <button
                    className="btn text-xs"
                    disabled={!!busy}
                    onClick={() => showPreview(r.id, "reroll")}
                    title="加工せずに費用と消費素材を確認"
                  >
                    プレビュー
                  </button>
                </div>
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
            {preview && preview.id === r.id && (
              <div className="mt-2 border-t border-yellow-900/40 pt-2">
                <div className="text-xs flex flex-wrap gap-2 mb-2">
                  <button
                    className={`btn text-[11px] ${preview.mode === "reroll" ? "bg-yellow-700" : ""}`}
                    onClick={() => showPreview(r.id, "reroll")}
                  >
                    リロールで見る
                  </button>
                  <button
                    className={`btn text-[11px] ${preview.mode === "upgrade" ? "bg-yellow-700" : ""}`}
                    disabled={r.tier === "legendary"}
                    onClick={() => showPreview(r.id, "upgrade")}
                  >
                    強化で見る
                  </button>
                  <button className="btn text-[11px] ml-auto" onClick={() => setPreview(null)}>閉じる</button>
                </div>
                <div className="text-[11px] text-yellow-100/85 space-y-0.5">
                  <div>
                    現状: 《{TIER_LABEL_JA[preview.data.tier] ?? preview.data.tier}》
                    {" "}{preview.data.currentBonusSummary}
                  </div>
                  <div>
                    結果ティア: 《{TIER_LABEL_JA[preview.data.outcomeTier] ?? preview.data.outcomeTier}》
                    {preview.data.outcomeAltTier && preview.data.outcomeAltChance && (
                      <span className="text-yellow-300/80">
                        {" "}（{Math.round(preview.data.outcomeAltChance * 100)}% で 《{TIER_LABEL_JA[preview.data.outcomeAltTier]}》 にラッキー上昇）
                      </span>
                    )}
                  </div>
                  <div>
                    費用: <span className={preview.data.haveGold ? "text-yellow-200" : "text-red-300"}>
                      {preview.data.goldCost}G
                    </span>
                    {" / "} 素材 {preview.data.materials.length}/5{" "}
                    <span className={preview.data.haveMaterials ? "text-yellow-200" : "text-red-300"}>
                      {preview.data.haveMaterials ? "（OK）" : "（不足）"}
                    </span>
                  </div>
                  {preview.data.materials.length > 0 && (
                    <div className="mt-1 border border-yellow-900/40 rounded bg-black/20 p-1">
                      <div className="text-yellow-300/70">消費される素材（古い順）:</div>
                      <ul className="ml-2">
                        {preview.data.materials.map((m) => (
                          <li key={m.id}>・{m.name}（{TIER_LABEL_JA[m.tier] ?? m.tier}）</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
