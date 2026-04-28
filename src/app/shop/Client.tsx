"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Item = { id: string; name: string; description: string; basePrice: number; rarity: string };

export default function ShopClient({ items, myGold }: { items: Item[]; myGold: number }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  async function buy(id: string) {
    setErr(null);
    const r = await fetch("/api/shop/buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: id, quantity: 1 }) });
    if (!r.ok) { setErr((await r.json()).error); return; }
    router.refresh();
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-yellow-200/70">所持G {myGold}</div>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="border border-yellow-900/40 rounded p-2 bg-black/30 flex items-center gap-2">
            <div className="flex-1">
              <div className="text-sm">{i.name} <span className="text-xs text-yellow-200/60">[{i.rarity}]</span></div>
              <div className="text-xs text-yellow-100/70">{i.description}</div>
            </div>
            <div className="text-yellow-300 text-sm">{i.basePrice}G</div>
            <button className="btn-primary" onClick={() => buy(i.id)} disabled={myGold < i.basePrice}>購入</button>
          </li>
        ))}
      </ul>
      {err && <div className="text-red-400 text-xs">{err}</div>}
    </div>
  );
}
