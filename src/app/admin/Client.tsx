"use client";
import { useEffect, useState } from "react";

export default function AdminClient() {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState("users");
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [seasonName, setSeasonName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  async function load() {
    const r = await fetch("/api/admin/overview");
    if (r.ok) setData(await r.json());
  }
  async function mute(userId: string) {
    await fetch("/api/admin/mute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, hours: 24 }) });
    setMsg("ミュートしました");
    load();
  }
  async function ban(userId: string) {
    if (!confirm("BANしますか？")) return;
    await fetch("/api/admin/ban", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, hours: 72 }) });
    setMsg("BANしました");
    load();
  }
  async function disable(id: string) {
    await fetch(`/api/admin/generated/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disable: true }) });
    setMsg("生成コンテンツを無効化しました");
    load();
  }
  async function announce() {
    await fetch("/api/admin/announcement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: annTitle, body: annBody }) });
    setMsg("告知を送信しました");
  }
  async function newSeason() {
    await fetch("/api/admin/seasons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: seasonName, rules: { manual: true } }) });
    setMsg("新シーズンを開始しました");
    load();
  }

  if (!data) return <div>読み込み中…</div>;
  const tabs = ["users", "characters", "chats", "generated", "battles", "trades", "auctions", "season", "tools"];
  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {tabs.map((t) => <button key={t} className={`btn ${tab === t ? "btn-primary" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {msg && <div className="text-yellow-300 text-xs">{msg}</div>}
      {tab === "users" && (
        <ul className="space-y-1">
          {data.users.map((u: any) => (
            <li key={u.id} className="border border-yellow-900/40 rounded p-2 bg-black/30 flex items-center gap-2">
              <div className="flex-1 text-sm">{u.email} {u.isAdmin && "[admin]"} {u.isBanned && "[BAN]"}</div>
              <button className="btn" onClick={() => mute(u.id)}>ミュート</button>
              <button className="btn-danger" onClick={() => ban(u.id)}>BAN</button>
            </li>
          ))}
        </ul>
      )}
      {tab === "characters" && (
        <ul className="space-y-1">
          {data.characters.map((c: any) => (
            <li key={c.id} className="border border-yellow-900/40 rounded p-2 bg-black/30 text-sm">
              {c.name} (Lv{c.level}) — {c.user?.email} — G {c.gold}
            </li>
          ))}
        </ul>
      )}
      {tab === "chats" && (
        <ul className="space-y-1">
          {data.chats.map((m: any) => (
            <li key={m.id} className="border border-yellow-900/40 rounded p-1 bg-black/30 text-xs">
              [{m.channel}] {m.senderName}: {m.body}
            </li>
          ))}
        </ul>
      )}
      {tab === "generated" && (
        <ul className="space-y-1">
          {data.generated.map((g: any) => (
            <li key={g.id} className="border border-yellow-900/40 rounded p-2 bg-black/30 text-xs">
              <div>{g.type}: {g.title} — {g.disabledAt ? "[無効]" : ""}</div>
              <div className="text-yellow-100/70">{g.body}</div>
              <button className="btn mt-1" onClick={() => disable(g.id)}>無効化</button>
            </li>
          ))}
        </ul>
      )}
      {tab === "battles" && (
        <ul className="space-y-1">
          {data.battles.map((b: any) => (
            <li key={b.id} className="border border-yellow-900/40 rounded p-2 bg-black/30 text-xs">
              {b.id} status={b.status} result={b.result ?? "-"} turn={b.turn}
            </li>
          ))}
        </ul>
      )}
      {tab === "trades" && (
        <ul className="space-y-1">
          {data.trades.map((t: any) => (
            <li key={t.id} className="border border-yellow-900/40 rounded p-2 bg-black/30 text-xs">
              {t.from?.name} → {t.to?.name} status={t.status} offer={t.offerGold}G request={t.requestGold}G
            </li>
          ))}
        </ul>
      )}
      {tab === "auctions" && (
        <ul className="space-y-1">
          {data.auctions.map((a: any) => (
            <li key={a.id} className="border border-yellow-900/40 rounded p-2 bg-black/30 text-xs">
              {a.id} status={a.status} start={a.startPrice} bid={a.currentBid}
            </li>
          ))}
        </ul>
      )}
      {tab === "season" && (
        <div className="space-y-2 text-sm">
          <div>現在のシーズン: {data.season?.name ?? "なし"}</div>
          <div className="text-xs text-yellow-100/60">{data.season?.rules}</div>
          <input className="input" placeholder="新シーズン名" value={seasonName} onChange={(e) => setSeasonName(e.target.value)} />
          <button className="btn-primary" onClick={newSeason}>新シーズン開始</button>
        </div>
      )}
      {tab === "tools" && (
        <div className="space-y-2 text-sm">
          <div className="text-sm font-bold text-yellow-200">告知</div>
          <input className="input" placeholder="タイトル" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} />
          <textarea className="input" rows={3} placeholder="本文" value={annBody} onChange={(e) => setAnnBody(e.target.value)} />
          <button className="btn-primary" onClick={announce}>送信</button>
        </div>
      )}
    </div>
  );
}
