"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type OpenP = { id: string; name: string; description: string | null; members: { name: string; level: number }[] };

export default function PartyClient({ myParty, openParties, myCharacterId }: { myParty: any; openParties: OpenP[]; myCharacterId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setErr(null);
    const res = await fetch("/api/parties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description: desc }) });
    if (!res.ok) { setErr((await res.json()).error); return; }
    setName(""); setDesc("");
    router.refresh();
  }
  async function join(id: string) {
    const res = await fetch(`/api/parties/${id}/join`, { method: "POST" });
    if (!res.ok) { setErr((await res.json()).error); return; }
    router.refresh();
  }
  async function leave() {
    if (!myParty) return;
    await fetch(`/api/parties/${myParty.id}/leave`, { method: "POST" });
    router.refresh();
  }
  return (
    <div className="space-y-3">
      {myParty ? (
        <div>
          <div className="text-sm font-bold text-yellow-200">{myParty.name}</div>
          <div className="text-xs text-yellow-100/70">{myParty.description}</div>
          <ul className="mt-2 text-xs text-yellow-100/80">
            {myParty.members.map((m: any) => (
              <li key={m.id}>・{m.character.name} (Lv{m.character.level}) {m.characterId === myParty.leaderCharacterId && "👑"} {m.characterId === myCharacterId && "(自分)"}</li>
            ))}
          </ul>
          <button className="btn-danger mt-2" onClick={leave}>パーティーを抜ける</button>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-yellow-200">パーティーを作る</h3>
          <input className="input" placeholder="名前" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <input className="input" placeholder="紹介" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={140} />
          <button className="btn-primary" onClick={create}>作成</button>
          {err && <div className="text-red-400 text-xs">{err}</div>}
          <h3 className="text-sm font-bold text-yellow-200 mt-3">募集中のパーティー</h3>
          <ul className="space-y-1">
            {openParties.length === 0 && <li className="text-xs text-yellow-200/60">現在募集中のパーティーはいません。</li>}
            {openParties.map((p) => (
              <li key={p.id} className="border border-yellow-900/40 rounded p-2 bg-black/30">
                <div className="text-sm">{p.name} ({p.members.length}/10)</div>
                <div className="text-xs text-yellow-100/70">{p.description}</div>
                <div className="text-xs text-yellow-100/60">メンバー: {p.members.map((m) => `${m.name}(Lv${m.level})`).join("、")}</div>
                <button className="btn mt-1" onClick={() => join(p.id)}>参加</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
