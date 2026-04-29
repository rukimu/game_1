"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type StorageRow = {
  id: string;
  name: string;
  category: string;
  rarity: string;
  quantity: number;
  slot: string | null;
  depositedByCharacterId: string | null;
  depositedAt: string;
};
type DepositableRow = {
  id: string;
  name: string;
  category: string;
  rarity: string;
  quantity: number;
  slot: string | null;
};

export default function GuildStorageView({
  storage,
  depositable,
  depositorMap,
}: {
  storage: StorageRow[];
  depositable: DepositableRow[];
  depositorMap: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function deposit(invId: string) {
    setErr(null);
    setBusy("dep:" + invId);
    const r = await fetch("/api/guilds/storage/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventoryItemId: invId }),
    });
    if (!r.ok) setErr((await r.json().catch(() => ({}))).error ?? "預けられませんでした");
    setBusy(null);
    router.refresh();
  }

  async function withdraw(storageId: string) {
    setErr(null);
    setBusy("wd:" + storageId);
    const r = await fetch(`/api/guilds/storage/${storageId}/withdraw`, { method: "POST" });
    if (!r.ok) setErr((await r.json().catch(() => ({}))).error ?? "引き出せませんでした");
    setBusy(null);
    router.refresh();
  }

  return (
    <section className="border-t border-yellow-900/40 pt-3 mt-3">
      <h3 className="text-sm font-bold text-yellow-200 mb-2">ギルド倉庫</h3>
      <p className="text-xs text-yellow-200/60 mb-2">
        ギルド員なら誰でも預け入れ・引き出し可能。装備中のアイテムは預けられません。
      </p>
      {err && <div className="text-red-400 text-xs mb-2">{err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-xs font-bold text-yellow-300/80 mb-1">倉庫の中身（{storage.length}）</div>
          {storage.length === 0 ? (
            <div className="text-yellow-200/50 text-xs">空っぽ。</div>
          ) : (
            <ul className="space-y-1">
              {storage.map((s) => (
                <li key={s.id} className="border border-yellow-900/40 rounded p-2 bg-black/30 text-sm flex items-start gap-2">
                  <div className="flex-1">
                    <div>
                      {s.name}
                      <span className="text-xs text-yellow-200/60 ml-1">[{s.rarity}]</span>
                      {s.quantity > 1 && <span className="text-xs text-yellow-200/60 ml-1">×{s.quantity}</span>}
                      {s.slot && <span className="text-xs text-yellow-200/50 ml-1">（{s.slot}）</span>}
                    </div>
                    <div className="text-[11px] text-yellow-200/50">
                      預けた人: {s.depositedByCharacterId && depositorMap[s.depositedByCharacterId]
                        ? depositorMap[s.depositedByCharacterId]
                        : "—"}
                    </div>
                  </div>
                  <button
                    className="btn"
                    onClick={() => withdraw(s.id)}
                    disabled={busy !== null}
                  >
                    {busy === "wd:" + s.id ? "..." : "引き出す"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="text-xs font-bold text-yellow-300/80 mb-1">あなたの預け入れ可能アイテム</div>
          {depositable.length === 0 ? (
            <div className="text-yellow-200/50 text-xs">預けられるものがありません。</div>
          ) : (
            <ul className="space-y-1">
              {depositable.map((d) => (
                <li key={d.id} className="border border-yellow-900/40 rounded p-2 bg-black/30 text-sm flex items-start gap-2">
                  <div className="flex-1">
                    <div>
                      {d.name}
                      <span className="text-xs text-yellow-200/60 ml-1">[{d.rarity}]</span>
                      {d.quantity > 1 && <span className="text-xs text-yellow-200/60 ml-1">×{d.quantity}</span>}
                      {d.slot && <span className="text-xs text-yellow-200/50 ml-1">（{d.slot}）</span>}
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => deposit(d.id)}
                    disabled={busy !== null}
                  >
                    {busy === "dep:" + d.id ? "..." : "預ける"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
