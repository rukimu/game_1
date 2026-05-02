"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Leaderboard = Array<{
  characterId: string;
  characterName: string;
  maxFloor: number;
  totalGold: number;
  attempts: number;
}>;

type LastRun = { floor: number; status: string; gold: number; exp: number } | null;

export default function AbyssClient({
  characterLevel,
  runId,
  currentFloor,
  accumulatedGold,
  accumulatedExp,
  activeBattleStatus,
  currentBattleId,
  nextBossName,
  lastRun,
  leaderboard,
}: {
  characterLevel: number;
  runId: string | null;
  currentFloor: number;
  accumulatedGold: number;
  accumulatedExp: number;
  activeBattleStatus: "none" | "active" | "ended";
  currentBattleId: string | null;
  nextBossName: string | null;
  lastRun: LastRun;
  leaderboard: Leaderboard;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(path: string) {
    setPending(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch(path, { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d.error ?? "失敗");
        setPending(false);
        return null;
      }
      const d = await r.json();
      setPending(false);
      return d;
    } catch (e: any) {
      setErr(e?.message ?? "失敗");
      setPending(false);
      return null;
    }
  }

  async function enter() {
    const d = await call("/api/abyss/enter");
    if (d?.runId) {
      setMsg("奈落に入った。");
      router.refresh();
    }
  }
  async function advance() {
    const d = await call("/api/abyss/advance");
    if (d?.battleId) {
      router.push(`/battle/${d.battleId}`);
    }
  }
  async function retreat() {
    const d = await call("/api/abyss/retreat");
    if (d?.ok) {
      setMsg(`撤退完了 — 第 ${d.floor} 層から ${d.paidGold}G / ${d.paidExp}EXP を持ち帰った。`);
      router.refresh();
    }
  }
  async function resumeBattle() {
    if (currentBattleId) router.push(`/battle/${currentBattleId}`);
  }

  const canEnter = characterLevel >= 50 && !runId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-2 space-y-3">
        {!runId && (
          <div className="panel space-y-2">
            <div className="text-sm font-bold text-yellow-200">挑戦準備</div>
            {lastRun && (
              <div className="text-xs text-yellow-100/85 border border-yellow-900/40 rounded p-2 bg-black/30">
                前回の挑戦: 第 {lastRun.floor} 層で
                {lastRun.status === "aborted" ? " 撤退" : " 全滅"}、
                {lastRun.gold}G / {lastRun.exp}EXP を持ち帰った。
              </div>
            )}
            {canEnter ? (
              <button className="btn-primary" onClick={enter} disabled={pending}>
                {pending ? "..." : "奈落に入る"}
              </button>
            ) : (
              <div className="text-xs text-yellow-200/60">
                {characterLevel < 50 ? "Lv50 から挑戦できる。" : "..."}
              </div>
            )}
          </div>
        )}

        {runId && (
          <div className="panel space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-sm font-bold text-yellow-200">挑戦中 — 第 {currentFloor} 層</div>
              <div className="text-xs text-yellow-300/70 tabular-nums">
                累積 {accumulatedGold}G / {accumulatedExp}EXP
              </div>
            </div>
            {nextBossName && (
              <div className="text-xs text-red-300 border border-red-900/40 rounded p-2 bg-red-950/20">
                ★ 次の階はボス階 — 「{nextBossName}」 が立ちはだかる
              </div>
            )}
            {activeBattleStatus === "active" && (
              <div className="space-y-2">
                <div className="text-xs text-yellow-200/85">戦闘継続中。決着をつけてから次の階へ。</div>
                <button className="btn-primary" onClick={resumeBattle}>戦闘画面へ戻る</button>
              </div>
            )}
            {activeBattleStatus !== "active" && (
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" onClick={advance} disabled={pending}>
                  {pending ? "..." : `第 ${currentFloor + 1} 層へ進む`}
                </button>
                <button className="btn" onClick={retreat} disabled={pending}>
                  {pending ? "..." : "撤退して報酬を持ち帰る"}
                </button>
              </div>
            )}
            <div className="text-[10px] text-yellow-200/50">
              全滅すると累積の半分が霧散する。撤退は全額持ち帰り。
            </div>
          </div>
        )}

        {err && <div className="panel text-xs text-red-400">{err}</div>}
        {msg && <div className="panel text-xs text-green-300">{msg}</div>}
      </div>

      <aside className="panel">
        <div className="text-sm font-bold text-yellow-200 mb-2">今週のランキング</div>
        {leaderboard.length === 0 ? (
          <div className="text-xs text-yellow-200/60">まだ挑戦者がいない。先頭を取れ。</div>
        ) : (
          <ol className="text-xs space-y-1">
            {leaderboard.map((r, i) => (
              <li key={r.characterId} className="flex items-center gap-2">
                <span className="tabular-nums w-5 text-yellow-300/80">{i + 1}</span>
                <span className="flex-1 truncate">{r.characterName}</span>
                <span className="tabular-nums text-yellow-200/85">F{r.maxFloor}</span>
                <span className="tabular-nums text-yellow-200/50 text-[10px]">×{r.attempts}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="text-[10px] text-yellow-200/50 mt-2">毎週月曜にリセット。</div>
      </aside>
    </div>
  );
}
