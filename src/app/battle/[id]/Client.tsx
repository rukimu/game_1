"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

let sharedSocket: Socket | null = null;
function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
  }
  return sharedSocket;
}

type Skill = { id: string; name: string; type: string; cost: number; description: string };

export default function BattleClient({ battleId, characterId, skills }: { battleId: string; characterId: string; skills: Skill[] }) {
  const [state, setState] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const router = useRouter();
  const logRef = useRef<HTMLDivElement>(null);
  const lastSubmittedTurnRef = useRef<number>(-1);

  async function load() {
    const r = await fetch(`/api/battles/${battleId}`, { cache: "no-store" });
    if (!r.ok) return;
    const d = await r.json();
    setState(d);
  }

  useEffect(() => {
    let cancel = false;
    (async () => { if (!cancel) await load(); })();
    const s = getSocket();
    s.emit("join", `battle:${battleId}`);
    const onState = (d: any) => setState(d);
    const onTurnStarted = () => load();
    s.on("battle:state", onState);
    s.on("battle:turn_started", onTurnStarted);
    return () => {
      cancel = true;
      s.emit("leave", `battle:${battleId}`);
      s.off("battle:state", onState);
      s.off("battle:turn_started", onTurnStarted);
    };
  }, [battleId]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [state?.log]);

  // Auto-attack: when a new turn starts and we haven't submitted yet, send attack.
  useEffect(() => {
    if (!auto || !state) return;
    if (state.battle.status !== "active") return;
    if (lastSubmittedTurnRef.current === state.battle.turn) return;
    const firstAlive = (state.enemies as any[]).findIndex((e) => e.alive);
    if (firstAlive < 0) return;
    lastSubmittedTurnRef.current = state.battle.turn;
    send("attack", firstAlive);
  }, [auto, state?.battle?.turn, state?.battle?.status]);

  async function send(actionType: "attack" | "skill" | "defend", targetIndex?: number) {
    setSubmitting(true);
    setErr(null);
    const body: any = { actionType };
    if (typeof targetIndex === "number") body.targetIndex = targetIndex;
    if (actionType === "skill" && skillId) body.skillId = skillId;
    const r = await fetch(`/api/battles/${battleId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) setErr((await r.json()).error);
    setSubmitting(false);
  }

  function returnToTown() {
    setAuto(false);
    router.refresh();
    // micro-delay so refresh kicks in before navigation reads cached data
    setTimeout(() => router.push("/town"), 30);
  }

  if (!state) return <div className="panel">読み込み中…</div>;
  const { battle, enemies, log } = state;

  if (battle.status === "ended") {
    return (
      <div className="panel space-y-2">
        <h2 className="text-lg font-bold text-yellow-200">戦闘終了 — {battle.result === "win" ? "勝利！" : "敗北…"}</h2>
        <div ref={logRef} className="scrollbar-y h-64 border border-yellow-900/40 rounded p-2 bg-black/30">
          {log.map((l: any, i: number) => <div key={i} className="log-line">{l.text}</div>)}
        </div>
        <button className="btn-primary" onClick={returnToTown}>街に戻る</button>
      </div>
    );
  }

  // The "click & hold" implementation: pointerdown starts a 200ms repeating attack on
  // the held target until pointerup/leave. Single click still works as one attack.
  const repeatTimers = new Map<number, ReturnType<typeof setInterval>>();
  function startHoldAttack(idx: number) {
    if (repeatTimers.has(idx)) return;
    send("attack", idx); // immediate
    const t = setInterval(() => send("attack", idx), 250);
    repeatTimers.set(idx, t);
  }
  function stopHoldAttack(idx: number) {
    const t = repeatTimers.get(idx);
    if (t) { clearInterval(t); repeatTimers.delete(idx); }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="md:col-span-2 space-y-3">
        <div className="panel">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold text-yellow-200">ターン {battle.turn}</div>
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
              />
              <span className={auto ? "text-yellow-200" : "text-yellow-200/60"}>自動戦闘</span>
            </label>
          </div>
          <div className="space-y-1">
            {enemies.map((e: any, i: number) => (
              <div key={i} className={`flex items-center gap-2 ${e.alive ? "" : "opacity-40 line-through"}`}>
                <div className="w-32 text-yellow-200 truncate" title={e.name}>{e.name} (Lv{e.level})</div>
                <div className="flex-1 bg-black/40 h-2 border border-yellow-900/50 rounded overflow-hidden">
                  <div className="h-full bg-red-700/80" style={{ width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%` }} />
                </div>
                <div className="text-xs tabular-nums w-16 text-right">{e.hp}/{e.maxHp}</div>
                {e.alive && (
                  <button
                    className="btn"
                    onPointerDown={() => startHoldAttack(i)}
                    onPointerUp={() => stopHoldAttack(i)}
                    onPointerLeave={() => stopHoldAttack(i)}
                    onPointerCancel={() => stopHoldAttack(i)}
                    disabled={submitting}
                    title="クリック=1回攻撃、長押し=連続攻撃"
                  >
                    攻撃
                  </button>
                )}
                {e.alive && skillId && (
                  <button className="btn-primary" onClick={() => send("skill", i)} disabled={submitting}>スキル</button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2 flex-wrap items-center">
            <button className="btn" onClick={() => send("defend")} disabled={submitting}>防御</button>
            {skills.length > 0 && (
              <select className="input w-auto" value={skillId ?? ""} onChange={(e) => setSkillId(e.target.value || null)}>
                <option value="">スキルを選ぶ</option>
                {skills.map((s) => <option key={s.id} value={s.id}>{s.name}（cost:{s.cost}）</option>)}
              </select>
            )}
            <span className="text-[10px] text-yellow-200/50 ml-2">攻撃ボタンは長押しで連続発動</span>
          </div>
          {err && <div className="text-red-400 text-xs mt-1">{err}</div>}
        </div>
        <div className="panel">
          <div className="text-sm font-bold text-yellow-200 mb-1">戦闘ログ</div>
          <div ref={logRef} className="scrollbar-y h-64 border border-yellow-900/40 rounded p-2 bg-black/30">
            {log.map((l: any, i: number) => <div key={i} className="log-line">{l.text}</div>)}
          </div>
        </div>
      </div>
      <div>
        <div className="panel">
          <div className="text-sm font-bold text-yellow-200 mb-1">パーティー</div>
          <ul className="text-xs space-y-1">
            {state.battle.participants.map((p: any) => (
              <li key={p.id} className={p.alive ? "" : "opacity-40 line-through"}>
                {p.character.name} HP {p.hp} / MP {p.mp}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
