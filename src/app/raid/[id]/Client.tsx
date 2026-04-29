"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RaidView } from "@/lib/raid";

const POLL_MS = 1500;

function fmtSeconds(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function rewardTierLabel(t: string): string {
  switch (t) {
    case "legendary": return "★ レジェ ★";
    case "epic": return "◆ エピック";
    case "rare": return "◇ レア";
    default: return "・通常";
  }
}

export default function RaidClient({
  initial,
  characterId,
}: {
  initial: RaidView;
  characterId: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<RaidView>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const logRef = useRef<HTMLDivElement>(null);

  // Poll the view route. Ticks at POLL_MS while page is open.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      try {
        const r = await fetch(`/api/raids/${view.id}`, { cache: "no-store" });
        if (!cancelled && r.ok) {
          const d = (await r.json()) as RaidView;
          setView(d);
        }
      } catch { /* transient — keep polling */ }
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [view.id]);

  // Local clock for CD countdowns / lobby timer. Ticks 4Hz.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll the log on new entries.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [view.log.length]);

  const me = view.participants.find((p) => p.characterId === characterId);
  const isParticipant = !!me;
  const isJoining = view.status === "joining";
  const isActive = view.status === "active";
  const isEnded = view.status === "ended";

  const lobbyMsLeft = Math.max(0, view.joinDeadline - now);
  const combatMsLeft = Math.max(0, view.combatEndsAt - now);
  const canStartNow = isJoining && view.participants.length >= 5 && isParticipant;

  async function post(path: string): Promise<void> {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(path, { method: "POST" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setErr(body?.error ?? "失敗");
      } else {
        const r2 = await fetch(`/api/raids/${view.id}`, { cache: "no-store" });
        if (r2.ok) setView((await r2.json()) as RaidView);
      }
    } catch {
      setErr("通信失敗");
    } finally {
      setBusy(false);
    }
  }

  async function doJoin() { await post(`/api/raids/${view.id}/join`); }
  async function doStartNow() { await post(`/api/raids/${view.id}/start`); }
  async function doAttack() { await post(`/api/raids/${view.id}/attack`); }
  async function doSkill() { await post(`/api/raids/${view.id}/skill`); }
  async function doHeal() { await post(`/api/raids/${view.id}/heal`); }

  const bossPct = Math.max(0, Math.min(100, (view.hp / Math.max(1, view.maxHp)) * 100));
  const myAttackCdLeft = me ? Math.max(0, me.attackReadyAt - now) : 0;
  const mySkillCdLeft = me ? Math.max(0, me.skillReadyAt - now) : 0;
  const myHealCdLeft = me ? Math.max(0, me.healReadyAt - now) : 0;
  const myReviveLeft = me && !me.alive ? Math.max(0, me.reviveAt - now) : 0;

  // Reward lookup for the ended screen.
  const myReward = isEnded ? view.rewards.find((r) => r.characterId === characterId) : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="md:col-span-2 space-y-3">
        <div className="panel">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <h2 className="text-lg font-bold text-yellow-200">{view.name}</h2>
            <div className="text-xs text-yellow-200/70">
              Lv {view.level} ・ {view.creatureType}
              {view.element && ` ・ 属性 ${view.element}`}
              {view.weakness && ` ・ 弱点 ${view.weakness}`}
            </div>
          </div>
          <p className="text-xs text-yellow-100/80 mb-2">{view.description}</p>

          {/* Boss HP bar — large for visibility */}
          <div className="mb-2">
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-yellow-200/80">HP</span>
              <span className="tabular-nums">{view.hp.toLocaleString()} / {view.maxHp.toLocaleString()}</span>
            </div>
            <div className="h-4 bg-black/60 border border-red-900/60 rounded overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-700 to-red-500" style={{ width: `${bossPct}%` }} />
            </div>
          </div>

          {/* Status banner */}
          <div className="text-xs mb-2">
            {isJoining && (
              <span className="text-amber-300">
                ⏳ 集合中（残り {fmtSeconds(lobbyMsLeft)}）・参戦者 {view.participants.length} 名
                {view.participants.length >= 5 && "（5+ 集まった、すぐ開始可）"}
              </span>
            )}
            {isActive && (
              <span className="text-red-300">
                ⚔ 戦闘中（残り {fmtSeconds(combatMsLeft)}）・参戦者 {view.participants.length} 名
              </span>
            )}
            {isEnded && (
              <span className={view.result === "victory" ? "text-emerald-300" : "text-zinc-400"}>
                {view.result === "victory" ? "★ 討伐完了 ★" : "影に消えた…（時間切れ）"}
              </span>
            )}
          </div>

          {/* Action panel */}
          {!isParticipant && !isEnded && (
            <button className="btn-primary" onClick={doJoin} disabled={busy}>参戦する</button>
          )}
          {isParticipant && !isEnded && (
            <div className="space-y-2">
              {/* Self status */}
              <div className="border border-yellow-900/40 rounded p-2 bg-black/30 text-xs">
                <div className="flex justify-between gap-2 mb-1">
                  <span className="text-yellow-200">あなた</span>
                  {!me?.alive && me ? (
                    <span className="text-red-400">撃沈中（復活まで {fmtSeconds(myReviveLeft)}）</span>
                  ) : (
                    <span className="text-yellow-200/70">
                      与ダメ <span className="text-yellow-100">{me?.damageDealt.toLocaleString()}</span>
                      ・回復 <span className="text-yellow-100">{me?.healingDone.toLocaleString()}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-8 text-yellow-200/70">HP</span>
                  <div className="flex-1 h-2 bg-black/50 border border-yellow-900/40 rounded overflow-hidden">
                    <div className="h-full bg-emerald-600" style={{ width: `${Math.max(0, ((me?.hp ?? 0) / Math.max(1, me?.maxHp ?? 1)) * 100)}%` }} />
                  </div>
                  <span className="tabular-nums w-20 text-right">{me?.hp}/{me?.maxHp}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 text-yellow-200/70">MP</span>
                  <div className="flex-1 h-2 bg-black/50 border border-yellow-900/40 rounded overflow-hidden">
                    <div className="h-full bg-sky-600" style={{ width: `${Math.max(0, ((me?.mp ?? 0) / Math.max(1, me?.maxMp ?? 1)) * 100)}%` }} />
                  </div>
                  <span className="tabular-nums w-20 text-right">{me?.mp}/{me?.maxMp}</span>
                </div>
              </div>

              {isJoining && (
                <div className="flex flex-wrap gap-2">
                  {canStartNow && (
                    <button className="btn-primary" onClick={doStartNow} disabled={busy}>すぐ開始（5+ 集合済み）</button>
                  )}
                  <span className="text-xs text-yellow-200/60 self-center">戦闘開始まで待機中…</span>
                </div>
              )}

              {isActive && (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-primary"
                    onClick={doAttack}
                    disabled={busy || !me?.alive || myAttackCdLeft > 0}
                    title="通常攻撃（CD 5秒）"
                  >
                    攻撃 {myAttackCdLeft > 0 && `(${fmtSeconds(myAttackCdLeft)})`}
                  </button>
                  <button
                    className="btn"
                    onClick={doSkill}
                    disabled={busy || !me?.alive || mySkillCdLeft > 0 || (me?.mp ?? 0) < 10}
                    title="特技（CD 15秒、MP 10）"
                  >
                    特技 {mySkillCdLeft > 0 && `(${fmtSeconds(mySkillCdLeft)})`}
                  </button>
                  <button
                    className="btn"
                    onClick={doHeal}
                    disabled={busy || !me?.alive || myHealCdLeft > 0}
                    title="最も HP の低い味方を回復（CD 10秒）"
                  >
                    回復 {myHealCdLeft > 0 && `(${fmtSeconds(myHealCdLeft)})`}
                  </button>
                </div>
              )}
            </div>
          )}

          {isEnded && (
            <div className="border border-yellow-900/40 rounded p-2 bg-black/30 text-xs space-y-1">
              <div className="font-bold text-yellow-200">あなたの結果</div>
              {myReward ? (
                <>
                  <div>
                    与ダメ <span className="text-yellow-100">{myReward.damage.toLocaleString()}</span>
                    ・回復 <span className="text-yellow-100">{myReward.healing.toLocaleString()}</span>
                  </div>
                  <div>
                    ドロップ {rewardTierLabel(myReward.rewardTier)}：
                    {myReward.drop ? <span className="text-amber-200">{myReward.drop}</span> : <span className="text-yellow-200/60">（なし）</span>}
                  </div>
                </>
              ) : (
                <div className="text-yellow-200/60">あなたは参戦していません</div>
              )}
              <button className="btn mt-2" onClick={() => router.push("/town")}>街に戻る</button>
            </div>
          )}

          {err && <div className="text-red-400 text-xs mt-2">{err}</div>}
        </div>

        {/* Combat log */}
        <div className="panel">
          <div className="text-sm font-bold text-yellow-200 mb-1">戦闘ログ（直近 {Math.min(view.log.length, 30)} 件）</div>
          <div ref={logRef} className="scrollbar-y h-56 border border-yellow-900/40 rounded p-2 bg-black/30 text-xs space-y-0.5">
            {view.log.length === 0 && <div className="text-yellow-200/50">まだログはない。</div>}
            {view.log.slice(-30).map((l, i) => (
              <div key={`${l.at}-${i}`} className="log-line">― {l.line}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking sidebar */}
      <div>
        <div className="panel">
          <div className="text-sm font-bold text-yellow-200 mb-1">貢献ランキング</div>
          <ol className="text-xs space-y-1">
            {view.participants.length === 0 && <li className="text-yellow-200/50">まだ誰も参戦していない。</li>}
            {[...view.participants].sort((a, b) => b.damageDealt - a.damageDealt).map((p, i) => (
              <li
                key={p.characterId}
                className={`flex justify-between gap-2 px-1 ${p.characterId === characterId ? "bg-amber-900/20 rounded" : ""} ${p.alive ? "" : "opacity-50"}`}
              >
                <span className="truncate">
                  <span className="text-yellow-300/70 tabular-nums w-5 inline-block">{i + 1}.</span>
                  {p.name}
                  {!p.alive && <span className="text-red-400 ml-1">×</span>}
                </span>
                <span className="tabular-nums text-yellow-100">{p.damageDealt.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
