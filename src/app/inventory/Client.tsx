"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type InvView = {
  id: string;
  quantity: number;
  equipped: boolean;
  item: {
    id: string;
    name: string;
    description: string;
    category: string;
    slot: string | null;
    rarity: string;
    atkBonus: number;
    defBonus: number;
    matBonus: number;
    mdfBonus: number;
    hpBonus: number;
    mpBonus: number;
  };
};

function statLine(it: InvView["item"]) {
  const parts: string[] = [];
  if (it.atkBonus) parts.push(`ATK+${it.atkBonus}`);
  if (it.defBonus) parts.push(`DEF+${it.defBonus}`);
  if (it.matBonus) parts.push(`MAT+${it.matBonus}`);
  if (it.mdfBonus) parts.push(`MDF+${it.mdfBonus}`);
  if (it.hpBonus) parts.push(`HP+${it.hpBonus}`);
  if (it.mpBonus) parts.push(`MP+${it.mpBonus}`);
  return parts.join(" / ");
}

export default function InventoryClient({ items }: { items: InvView[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(id: string, action: "equip" | "unequip" | "use") {
    setBusy(id + ":" + action);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch(`/api/inventory/${id}/${action}`, { method: "POST" });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(json.error ?? "失敗しました");
      } else if (action === "use") {
        const parts = [];
        if (json.healedHp) parts.push(`HP+${json.healedHp}`);
        if (json.healedMp) parts.push(`MP+${json.healedMp}`);
        setMsg(parts.length ? `使用: ${parts.join(" / ")}` : "使用しました");
        router.refresh();
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <div className="text-yellow-200/50 text-sm">所持品はありません。</div>;
  }
  return (
    <div className="space-y-2">
      {err && <div className="text-red-400 text-xs">{err}</div>}
      {msg && <div className="text-green-300 text-xs">{msg}</div>}
      <ul className="space-y-1">
        {items.map((inv) => {
          const bonus = statLine(inv.item);
          const isEquip = inv.item.category === "equip" && !!inv.item.slot;
          const isConsumable = inv.item.category === "consumable";
          return (
            <li
              key={inv.id}
              className="border border-yellow-900/40 rounded p-2 bg-black/30 flex flex-wrap items-center gap-2"
            >
              <div className="flex-1 min-w-[12rem]">
                <div className="text-sm">
                  {inv.item.name}
                  <span className="text-xs text-yellow-200/60 ml-1">[{inv.item.rarity}]</span>
                  {inv.quantity > 1 && (
                    <span className="text-xs text-yellow-200/60 ml-1">×{inv.quantity}</span>
                  )}
                  {inv.equipped && (
                    <span className="text-xs text-green-300 ml-1">[装備中]</span>
                  )}
                </div>
                <div className="text-xs text-yellow-100/70">{inv.item.description}</div>
                {bonus && <div className="text-xs text-yellow-300/80">{bonus}</div>}
              </div>
              <div className="flex gap-1">
                {isEquip && !inv.equipped && (
                  <button
                    className="btn-primary"
                    onClick={() => call(inv.id, "equip")}
                    disabled={busy !== null}
                  >
                    装備
                  </button>
                )}
                {isEquip && inv.equipped && (
                  <button
                    className="btn"
                    onClick={() => call(inv.id, "unequip")}
                    disabled={busy !== null}
                  >
                    外す
                  </button>
                )}
                {isConsumable && (
                  <button
                    className="btn-primary"
                    onClick={() => call(inv.id, "use")}
                    disabled={busy !== null}
                  >
                    使う
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
