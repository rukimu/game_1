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
  const router = useRouter();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      const r = await fetch(`/api/battles/${battleId}`);
      if (!r.ok) return;
      const d = await r.json();
      if (!cancel) setState(d);
    }
    load();
    const s = getSocket();
    s.emit("join", `battle:${battleId}`);
    s.on("battle:state", (d) => setState(d));
    s.on("battle:turn_started", () => load());
    return () => {
      cancel = true;
      s.emit("leave", `battle:${battleId}`);
      s.off("battle:state");
      s.off("battle:turn_started");
    };
  }, [battleId]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [state?.log]);

  if (!state) return <div className="panel">読み込み中…</div>;
  const { battle, enemies, log } = state;

  async function send(actionType: "attack" | "skill" | "defend", targetIndex?: number) {
    setSubmitting(true);
    setErr(null);
    const body: any = { actionType };
    if (typeof targetIndex === "number") body.targetIndex = targetIndex;
    if (actionType === "skill" && skillId) body.skillId = skillId;
    const r = await fetch(`/api/battles/${battleId}/action`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) setErr((await r.json()).error);
    setSubmitting(false);
  }

  if (battle.status === "ended") {
    return (
      <div className="panel space-y-2">
        <h2 className="text-lg font-bold text-yellow-200">戦闘終了 — {battle.result === "win" ? "勝利！" : "敗北…"}</h2>
        <div ref={logRef} className="scrollbar-y h-64 border border-yellow-900/40 rounded p-2 bg-black/30">
          {log.map((l: any, i: number) => <div key={i} className="log-line">{l.text}</div>)}
        </div>
        <button className="btn-primary" onClick={() => router.push("/town")}>街に戻る</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="md:col-span-2 space-y-3">
        <div className="panel">
          <div className="text-sm font-bold text-yellow-200 mb-2">ターン {battle.turn}</div>
          <div className="space-y-1">
            {enemies.map((e: any, i: number) => (
              <div key={i} className={`flex items-center gap-2 ${e.alive ? "" : "opacity-40 line-through"}`}>
                <div className="w-32 text-yellow-200">{e.name} (Lv{e.level})</div>
                <div className="flex-1 bg-black/40 h-2 border border-yellow-900/50 rounded">
                  <div className="h-full bg-red-700/80" style={{ width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%` }} />
                </div>
                <div className="text-xs">{e.hp}/{e.maxHp}</div>
                {e.alive && <button className="btn" onClick={() => send("attack", i)} disabled={submitting}>攻撃</button>}
                {e.alive && skillId && <button className="btn-primary" onClick={() => send("skill", i)} disabled={submitting}>スキル</button>}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <button className="btn" onClick={() => send("defend")} disabled={submitting}>防御</button>
            {skills.length > 0 && (
              <select className="input w-auto" value={skillId ?? ""} onChange={(e) => setSkillId(e.target.value || null)}>
                <option value="">スキルを選ぶ</option>
                {skills.map((s) => <option key={s.id} value={s.id}>{s.name}（cost:{s.cost}）</option>)}
              </select>
            )}
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
