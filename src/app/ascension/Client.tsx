"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Bonus = { hp: number; mp: number; atk: number; def: number; mat: number; mdf: number; spd: number };

function BonusList({ b }: { b: Bonus }) {
  return (
    <ul className="text-[11px] text-yellow-100/85 grid grid-cols-2 gap-x-3">
      <li>HP +{b.hp}</li>
      <li>MP +{b.mp}</li>
      <li>atk +{b.atk}</li>
      <li>def +{b.def}</li>
      <li>mat +{b.mat}</li>
      <li>mdf +{b.mdf}</li>
      <li>spd +{b.spd}</li>
    </ul>
  );
}

export default function AscensionClient({
  characterName,
  level,
  isCursed,
  generation,
  currentBonus,
  nextBonus,
}: {
  characterName: string;
  level: number;
  isCursed: boolean;
  generation: number;
  currentBonus: Bonus | null;
  nextBonus: Bonus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const canAscend = level >= 50 && !isCursed;

  async function ascend() {
    setPending(true);
    setErr(null);
    const r = await fetch("/api/character/ascend", { method: "POST" });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErr(d.error ?? "失敗");
      setPending(false);
      return;
    }
    setPending(false);
    router.refresh();
    setConfirmed(false);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="panel space-y-2">
        <div className="text-sm font-bold text-yellow-200">現在の世代</div>
        <div className="text-2xl text-yellow-100">第 {generation} 世代</div>
        <div className="text-xs text-yellow-200/70">{characterName} ・ Lv{level}{isCursed && " ・ [呪]"}</div>
        {currentBonus ? (
          <>
            <div className="text-xs text-yellow-300/80 mt-2">適用中のボーナス</div>
            <BonusList b={currentBonus} />
          </>
        ) : (
          <div className="text-xs text-yellow-200/60">まだ転生していない (初回の人生)。</div>
        )}
      </div>

      <div className="panel space-y-2">
        <div className="text-sm font-bold text-yellow-200">次の転生</div>
        <div className="text-xl text-yellow-100">第 {generation + 1} 世代</div>
        <div className="text-xs text-yellow-300/80 mt-2">転生後のボーナス (累積)</div>
        <BonusList b={nextBonus} />
        <div className="text-[11px] text-yellow-100/70 mt-2 leading-relaxed">
          • レベルが 1 に戻り、現職の base stat + ボーナスで再スタート<br />
          • 称号 / アチーブメント / インベントリ / ギルドは引き継ぐ<br />
          • 呪い職に就いている間は転生不可
        </div>
        {!canAscend ? (
          <div className="text-xs text-red-300 mt-2">
            {isCursed ? "呪い職を解除してから挑戦せよ。" : `Lv50 から転生可能 (現在 Lv${level})。`}
          </div>
        ) : !confirmed ? (
          <button className="btn-primary mt-3" onClick={() => setConfirmed(true)} disabled={pending}>
            転生する
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-yellow-200/85">本当に第 {generation + 1} 世代に進みますか？</div>
            <div className="flex gap-2">
              <button className="btn-danger" onClick={ascend} disabled={pending}>
                {pending ? "..." : "確定して転生"}
              </button>
              <button className="btn" onClick={() => setConfirmed(false)} disabled={pending}>
                キャンセル
              </button>
            </div>
          </div>
        )}
        {err && <div className="text-xs text-red-400 mt-2">{err}</div>}
      </div>
    </div>
  );
}
