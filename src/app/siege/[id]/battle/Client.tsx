"use client";
import { useEffect, useRef, useState } from "react";
import Chat from "@/components/Chat";

type GuildRow = {
  guildId: string;
  guildName: string;
  hp: number;
  maxHp: number;
  alive: boolean;
  members: Array<{ characterId: string; name: string; level: number; role: string }>;
  rallyUsed: boolean;
  cureUsed: boolean;
};

type View = {
  id: string;
  siegeId: string;
  status: "lobby" | "active" | "resolved";
  turn: number;
  turnEndsAt: string | null;
  winningGuildName: string | null;
  guilds: GuildRow[];
  log: Array<{ turn: number; kind: string; line: string }>;
};

export default function SiegeBattleClient({
  siegeId,
  castleName,
  characterId,
  myGuildId,
  myRole,
  participating,
  initialView,
}: {
  siegeId: string;
  castleName: string;
  characterId: string;
  myGuildId: string | null;
  myRole: string | null;
  participating: boolean;
  initialView: View | null;
}) {
  const [view, setView] = useState<View | null>(initialView);
  const [now, setNow] = useState(Date.now());
  const [target, setTarget] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submittedTurn, setSubmittedTurn] = useState<number>(-1);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch(`/api/siege/${siegeId}/battle`, { cache: "no-store" });
        if (cancelled || !r.ok) return;
        const d = await r.json();
        setView(d);
      } catch { /* non-fatal */ }
    }
    const i = setInterval(tick, 1500);
    return () => { cancelled = true; clearInterval(i); };
  }, [siegeId]);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [view?.log?.length]);

  if (!view) {
    return <div className="panel text-yellow-200/70">攻城戦の戦闘はまだ始まっていません。登録期間が終了するか、ギルドが登録されたら開始します。</div>;
  }

  const turnEndsMs = view.turnEndsAt ? new Date(view.turnEndsAt).getTime() : 0;
  const turnRemaining = view.status === "active" && turnEndsMs > 0
    ? Math.max(0, Math.floor((turnEndsMs - now) / 1000))
    : 0;
  const myGuild = view.guilds.find((g) => g.guildId === myGuildId) ?? null;
  const myAlive = !!myGuild?.alive;
  const enemies = view.guilds.filter((g) => g.guildId !== myGuildId && g.alive);
  const myDoneThisTurn = submittedTurn === view.turn;

  async function send(action: string, payload: { targetGuildId?: string } = {}) {
    setPending(true);
    setErr(null);
    try {
      const r = await fetch(`/api/siege/${siegeId}/battle/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d.error ?? "失敗");
        setPending(false);
        return;
      }
      setSubmittedTurn(view!.turn);
      setErr(null);
      const r2 = await fetch(`/api/siege/${siegeId}/battle`, { cache: "no-store" });
      if (r2.ok) setView(await r2.json());
    } catch (e: any) {
      setErr(e?.message ?? "失敗");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-2 space-y-3">
        <div className="panel">
          <div className="flex justify-between items-center flex-wrap gap-1">
            <div className="text-sm font-bold text-yellow-200">{castleName} の攻城戦</div>
            <div className="text-xs text-yellow-300/80 tabular-nums">
              {view.status === "active" && `ターン ${view.turn} / 残 ${turnRemaining}s`}
              {view.status === "resolved" && (
                view.winningGuildName ? `決着: ${view.winningGuildName} の勝利` : "決着: 引き分け"
              )}
              {view.status === "lobby" && "戦闘準備中"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {view.guilds.map((g) => {
            const pct = g.maxHp > 0 ? Math.max(0, Math.min(100, (g.hp / g.maxHp) * 100)) : 0;
            const isMine = g.guildId === myGuildId;
            const hpClass = g.hp > g.maxHp * 0.5 ? "bg-green-500" : g.hp > g.maxHp * 0.2 ? "bg-yellow-500" : "bg-red-500";
            return (
              <div
                key={g.guildId}
                className={`border rounded p-2 bg-black/30 ${
                  !g.alive ? "opacity-40" : isMine ? "border-yellow-500" : "border-yellow-900/40"
                }`}
              >
                <div className="text-sm font-bold flex justify-between">
                  <span>
                    {g.guildName}
                    {isMine && <span className="text-yellow-300 ml-1 text-xs">[自陣]</span>}
                    {!g.alive && <span className="text-red-300 ml-1 text-xs">[退却]</span>}
                  </span>
                  <span className="tabular-nums text-yellow-200/70 text-xs">{g.hp} / {g.maxHp}</span>
                </div>
                <div className="h-2 bg-black/60 border border-yellow-900/40 rounded overflow-hidden mt-1">
                  <div className={`h-full ${hpClass}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] text-yellow-200/60 mt-1 flex flex-wrap gap-x-2">
                  <span>メンバー {g.members.length}</span>
                  {g.rallyUsed && <span className="text-orange-300">号令済</span>}
                  {g.cureUsed && <span className="text-green-300">治療済</span>}
                </div>
              </div>
            );
          })}
        </div>

        {participating && view.status === "active" && myAlive && (
          <div className="panel space-y-2">
            <div className="text-sm font-bold text-yellow-200">
              行動選択 {myDoneThisTurn && <span className="text-xs text-green-300 ml-1">(送信済 — ターン進行待ち)</span>}
            </div>
            {enemies.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-yellow-200/70">対象ギルド:</span>
                <select
                  className="input w-auto"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <option value="">選択</option>
                  {enemies.map((e) => (
                    <option key={e.guildId} value={e.guildId}>{e.guildName}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-primary"
                disabled={pending || myDoneThisTurn || !target}
                onClick={() => send("attack", { targetGuildId: target })}
                title="単体攻撃 — 基本ダメージ"
              >
                攻撃
              </button>
              <button
                className="btn"
                disabled={pending || myDoneThisTurn || enemies.length === 0}
                onClick={() => send("aoe")}
                title="全敵に 50% ダメージ"
              >
                全体攻撃
              </button>
              <button
                className="btn"
                disabled={pending || myDoneThisTurn || !target}
                onClick={() => send("heavy", { targetGuildId: target })}
                title="単体に 1.5× ダメージ"
              >
                渾身の一撃
              </button>
              <button
                className="btn"
                disabled={pending || myDoneThisTurn}
                onClick={() => send("support")}
                title="自陣 HP 5% 回復"
              >
                援護
              </button>
              {myRole === "master" && myGuild && !myGuild.rallyUsed && (
                <button
                  className="btn-primary"
                  disabled={pending || myDoneThisTurn}
                  onClick={() => send("rally")}
                  title="このターン味方の攻撃 +20% (1 戦闘 1 回)"
                >
                  号令
                </button>
              )}
              {myRole === "sub" && myGuild && !myGuild.cureUsed && (
                <button
                  className="btn-primary"
                  disabled={pending || myDoneThisTurn}
                  onClick={() => send("cure")}
                  title="自陣 HP 30% 回復 (1 戦闘 1 回)"
                >
                  治療
                </button>
              )}
            </div>
            {err && <div className="text-red-400 text-xs">{err}</div>}
          </div>
        )}
        {!participating && (
          <div className="panel text-xs text-yellow-200/70">
            あなたのギルドはこの攻城戦に登録していません。観戦のみです。
          </div>
        )}
        {participating && view.status === "active" && !myAlive && (
          <div className="panel text-xs text-red-300">
            自陣は陣形を崩した。観戦のみとなります。
          </div>
        )}

        <div className="panel">
          <div className="text-sm font-bold text-yellow-200 mb-1">戦闘ログ</div>
          <div ref={logRef} className="scrollbar-y h-64 border border-yellow-900/40 rounded p-2 bg-black/30 text-xs">
            {view.log.slice(-30).map((l, i) => (
              <div key={i} className="log-line">{l.line}</div>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-2">
        <div className="panel">
          <div className="text-sm font-bold text-yellow-200 mb-1">アクション一覧</div>
          <ul className="text-[11px] text-yellow-200/85 space-y-0.5">
            <li><span className="text-yellow-300">攻撃</span>: 単体に 1× ダメージ</li>
            <li><span className="text-yellow-300">全体攻撃</span>: 全敵に 50% ダメージ</li>
            <li><span className="text-yellow-300">渾身の一撃</span>: 単体に 1.5× ダメージ</li>
            <li><span className="text-yellow-300">援護</span>: 自陣 HP 5% 回復</li>
            <li><span className="text-orange-300">号令</span>: 味方攻撃 +20% (ギルマス、1 回)</li>
            <li><span className="text-green-300">治療</span>: 自陣 HP 30% 回復 (サブ、1 回)</li>
          </ul>
          <div className="text-[10px] text-yellow-200/50 mt-2">
            ターン制 30s。各メンバーは 1 ターン 1 アクション。ターン終了か全員提出で進行。
          </div>
        </div>
        <Chat channel={`siege:${siegeId}`} title="応援チャット" />
      </aside>
    </div>
  );
}
