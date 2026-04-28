"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuctionClient({ listings, myGold, myInventory }: any) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [bid, setBid] = useState<Record<string, number>>({});
  const [iid, setIid] = useState("");
  const [start, setStart] = useState(50);
  const [buyout, setBuyout] = useState(200);

  async function placeBid(id: string) {
    const amt = Number(bid[id] ?? 0);
    if (!amt) return;
    const r = await fetch(`/api/auctions/${id}/bid`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt }) });
    if (!r.ok) setErr((await r.json()).error);
    router.refresh();
  }
  async function buyoutListing(id: string) {
    const r = await fetch(`/api/auctions/${id}/buyout`, { method: "POST" });
    if (!r.ok) setErr((await r.json()).error);
    router.refresh();
  }
  async function list() {
    if (!iid) return;
    const r = await fetch("/api/auctions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventoryItemId: iid, startPrice: start, buyoutPrice: buyout, durationHours: 6 }) });
    if (!r.ok) { setErr((await r.json()).error); return; }
    setIid("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-yellow-200/70">所持G {myGold}</div>
      <ul className="space-y-1">
        {listings.length === 0 && <li className="text-xs text-yellow-200/60">出品はありません。</li>}
        {listings.map((l: any) => (
          <li key={l.id} className="border border-yellow-900/40 rounded p-2 bg-black/30">
            <div className="text-sm">{l.itemName} <span className="text-xs text-yellow-200/60">出品 {l.sellerName}</span></div>
            <div className="text-xs">最低 {l.startPrice}G / 現在入札 {l.currentBid}G {l.buyoutPrice && `/ 即決 ${l.buyoutPrice}G`}</div>
            <div className="text-xs text-yellow-100/60">締切 {new Date(l.endsAt).toLocaleString()}</div>
            <div className="flex gap-2 mt-1">
              <input className="input w-24" type="number" min={1} placeholder="入札額" value={bid[l.id] ?? ""} onChange={(e) => setBid({ ...bid, [l.id]: Number(e.target.value) })} />
              <button className="btn" onClick={() => placeBid(l.id)}>入札</button>
              {l.buyoutPrice && <button className="btn-primary" onClick={() => buyoutListing(l.id)}>即決</button>}
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-yellow-900/40 pt-2">
        <div className="text-sm font-bold text-yellow-200 mb-1">自分のアイテムを出品</div>
        <select className="input mb-1" value={iid} onChange={(e) => setIid(e.target.value)}>
          <option value="">選択…</option>
          {myInventory.filter((i: any) => i.tradable).map((i: any) => <option key={i.id} value={i.id}>{i.name} x{i.qty}</option>)}
        </select>
        <div className="flex gap-2">
          <input className="input w-24" type="number" placeholder="開始" value={start} onChange={(e) => setStart(Number(e.target.value))} />
          <input className="input w-24" type="number" placeholder="即決" value={buyout} onChange={(e) => setBuyout(Number(e.target.value))} />
          <button className="btn-primary" onClick={list} disabled={!iid}>出品</button>
        </div>
      </div>
      {err && <div className="text-red-400 text-xs">{err}</div>}
    </div>
  );
}
