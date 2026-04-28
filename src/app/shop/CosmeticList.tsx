"use client";
import { useEffect, useState } from "react";

type Cos = { code: string; title: string; price: number; kind: string };

export default function CosmeticList() {
  const [items, setItems] = useState<Cos[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/shop/cosmetics").then((r) => r.json()).then((d) => setItems(d.items ?? []));
  }, []);

  async function buy(code: string) {
    const r = await fetch("/api/shop/mock-purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productCode: code }) });
    if (r.ok) setMsg(`${code} を購入しました（モック）`);
    else setMsg("購入に失敗しました");
  }
  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.code} className="border border-yellow-900/40 rounded p-2 bg-black/30 flex items-center gap-2">
            <div className="flex-1 text-sm">{i.title}</div>
            <div className="text-yellow-300 text-sm">¥{i.price}</div>
            <button className="btn-primary" onClick={() => buy(i.code)}>購入</button>
          </li>
        ))}
      </ul>
      {msg && <div className="text-yellow-300 text-xs">{msg}</div>}
    </div>
  );
}
