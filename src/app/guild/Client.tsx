"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GuildClient({ myGuild, guilds, myCharacterId, myLevel, myGold }: any) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState<string | null>(null);
  async function create() {
    setErr(null);
    const r = await fetch("/api/guilds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, tag, description: desc }) });
    if (!r.ok) { setErr((await r.json()).error); return; }
    router.refresh();
  }
  async function join(id: string) {
    const r = await fetch(`/api/guilds/${id}/join`, { method: "POST" });
    if (!r.ok) { setErr((await r.json()).error); return; }
    router.refresh();
  }
  async function leave() {
    if (!myGuild) return;
    await fetch(`/api/guilds/${myGuild.id}/leave`, { method: "POST" });
    router.refresh();
  }
  return (
    <div className="space-y-3">
      {myGuild ? (
        <div>
          <div className="text-sm font-bold text-yellow-200">{myGuild.name}</div>
          <div className="text-xs text-yellow-100/70">{myGuild.description}</div>
          <ul className="mt-2 text-xs text-yellow-100/80">
            {myGuild.members.map((m: any) => (
              <li key={m.id}>・{m.character.name} (Lv{m.character.level}) {m.role === "master" && "👑"}</li>
            ))}
          </ul>
          <button className="btn-danger mt-2" onClick={leave}>ギルドを抜ける</button>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-yellow-200">ギルドを設立する（Lv5以上、200G必要）</h3>
          <input className="input" placeholder="ギルド名" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="タグ（最大8文字）" value={tag} onChange={(e) => setTag(e.target.value)} />
          <input className="input" placeholder="紹介" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <button className="btn-primary" onClick={create} disabled={myLevel < 5 || myGold < 200}>設立</button>
          {err && <div className="text-red-400 text-xs">{err}</div>}
          <h3 className="text-sm font-bold text-yellow-200 mt-3">ギルド一覧</h3>
          <ul className="space-y-1">
            {guilds.map((g: any) => (
              <li key={g.id} className="border border-yellow-900/40 rounded p-2 bg-black/30">
                <div className="text-sm">{g.name}（{g.memberCount}人）</div>
                <div className="text-xs text-yellow-100/70">{g.description}</div>
                <button className="btn mt-1" onClick={() => join(g.id)}>加入</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
