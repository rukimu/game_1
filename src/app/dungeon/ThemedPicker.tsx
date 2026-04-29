"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Themed = {
  key: string;
  name: string;
  flavor: string;
  recommendedLevel: { min: number; max: number };
  totalFloors: number;
  recommendedParty: string;
  bossDropTier: string;
  cleared: boolean;
};

const TIER_LABEL: Record<string, string> = {
  epic: "希少",
  legendary: "伝説",
};

export default function ThemedDungeonPicker({
  characterLevel,
  dungeons,
}: {
  characterLevel: number;
  dungeons: Themed[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function start(key: string) {
    setBusy(key);
    setErr(null);
    const r = await fetch("/api/dungeons/themed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: key }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) {
      setErr(data.error ?? "失敗しました");
      return;
    }
    if (data.run?.id) router.push(`/dungeon/${data.run.id}`);
    else router.refresh();
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-yellow-200">専用ダンジョン (中盤・上級)</h3>
      <p className="text-[11px] text-yellow-200/60">
        各テーマには固有の敵・ボス・確定ドロップがある。Lv 推奨を満たさないと挑戦できない。
      </p>
      {err && <div className="text-red-400 text-xs">{err}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {dungeons.map((d) => {
          const meetsLevel = characterLevel >= d.recommendedLevel.min;
          return (
            <div
              key={d.key}
              className={`border rounded p-2 ${
                d.cleared
                  ? "border-green-700/60 bg-green-950/15"
                  : meetsLevel
                    ? "border-yellow-900/40 bg-black/30"
                    : "border-yellow-900/40 bg-black/30 opacity-60"
              }`}
            >
              <div className="flex justify-between items-baseline">
                <div className="text-sm font-bold text-yellow-100">{d.name}</div>
                <div className="text-[10px] text-yellow-200/60">
                  Lv{d.recommendedLevel.min}-{d.recommendedLevel.max}
                </div>
              </div>
              <div className="text-[11px] italic text-yellow-100/80 mt-0.5">― {d.flavor}</div>
              <div className="text-[10px] text-yellow-200/70 mt-1 flex flex-wrap gap-x-3">
                <span>{d.totalFloors}階構成</span>
                <span>推奨: {d.recommendedParty}</span>
                <span>
                  確定ドロップ:{" "}
                  <span className={d.bossDropTier === "legendary" ? "text-amber-300" : "text-purple-300"}>
                    {TIER_LABEL[d.bossDropTier] ?? d.bossDropTier}
                  </span>
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  className="btn-primary text-xs"
                  disabled={!meetsLevel || busy !== null}
                  onClick={() => start(d.key)}
                  title={meetsLevel ? "このテーマで探索を開始" : `Lv${d.recommendedLevel.min}以上で挑戦可`}
                >
                  {busy === d.key ? "..." : meetsLevel ? "潜る" : "未開放"}
                </button>
                {d.cleared && <span className="text-[10px] text-green-300">★ 踏破済</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
