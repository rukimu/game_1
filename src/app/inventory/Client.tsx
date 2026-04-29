"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Stats = { atk: number; def: number; mat: number; mdf: number; hp: number; mp: number };
type Row = {
  id: string;
  itemId: string;
  baseName: string;
  displayName: string;
  slot: string | null;
  weaponClass: string | null;
  category: string;
  rarity: string;
  tier: string;
  tierLabel: string | null;
  tierClass: string;
  equipped: boolean;
  affineWeapon: boolean;
  quantity: number;
  bonuses: Stats;
  diffVsEquipped: Stats | null;
  specials: string[];
};

const SLOT_LABEL: Record<string, string> = {
  weapon: "武器",
  head: "頭", body: "体", arm: "腕", leg: "脚", foot: "靴",
  accessory: "装飾", charm: "お守り",
};

const WEAPON_CLASS_LABEL: Record<string, string> = {
  sword: "剣", greatsword: "大剣", spear: "槍", dagger: "短剣",
  bow: "弓", staff: "杖", rod: "ロッド", drum: "太鼓",
  flute: "笛", hammer: "槌", flail: "フレイル",
};

export default function InventoryClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function toggle(row: Row) {
    setBusy(row.id);
    setErr(null);
    const url = row.equipped
      ? `/api/inventory/${row.id}/unequip`
      : `/api/inventory/${row.id}/equip`;
    try {
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error ?? "操作に失敗しました");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return <div className="text-yellow-200/50 text-xs">所持品はありません。</div>;
  }

  // Group by slot for readability.
  const slots = ["weapon", "head", "body", "arm", "leg", "foot", "accessory", "charm"];
  const equippable = rows.filter((r) => r.category === "equip");
  const consumables = rows.filter((r) => r.category !== "equip");

  return (
    <div className="space-y-3">
      {err && <div className="text-red-400 text-xs">{err}</div>}
      {slots.map((slot) => {
        const slotRows = equippable.filter((r) => r.slot === slot);
        if (slotRows.length === 0) return null;
        return (
          <section key={slot}>
            <h3 className="text-xs font-bold text-yellow-300/80 mb-1">{SLOT_LABEL[slot] ?? slot}</h3>
            <ul className="space-y-1">
              {slotRows.map((r) => (
                <li key={r.id} className={`border rounded p-2 text-sm ${r.equipped ? "border-green-500/60 bg-green-900/15" : "border-yellow-900/40 bg-black/30"}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="font-bold">
                        <span className={r.tierClass}>{r.displayName}</span>
                        {r.tierLabel && <span className="ml-2 text-xs">[{r.tierLabel}]</span>}
                        {r.equipped && <span className="ml-2 text-green-300 text-xs">[装備中]</span>}
                        {r.weaponClass && !r.affineWeapon && (
                          <span className="ml-2 text-amber-300/80 text-xs">[適性外 効果半減]</span>
                        )}
                      </div>
                      <div className="text-xs text-yellow-200/60">
                        {r.weaponClass && (WEAPON_CLASS_LABEL[r.weaponClass] ?? r.weaponClass)}
                        {r.weaponClass && " / "}
                        基: {r.baseName}
                      </div>
                      <div className="text-xs text-yellow-100/80 mt-1 flex flex-wrap gap-x-3">
                        {r.bonuses.atk !== 0 && <span>攻 {sign(r.bonuses.atk)}</span>}
                        {r.bonuses.def !== 0 && <span>防 {sign(r.bonuses.def)}</span>}
                        {r.bonuses.mat !== 0 && <span>魔攻 {sign(r.bonuses.mat)}</span>}
                        {r.bonuses.mdf !== 0 && <span>魔防 {sign(r.bonuses.mdf)}</span>}
                        {r.bonuses.hp !== 0 && <span>HP {sign(r.bonuses.hp)}</span>}
                        {r.bonuses.mp !== 0 && <span>MP {sign(r.bonuses.mp)}</span>}
                      </div>
                      {r.diffVsEquipped && hasAnyDiff(r.diffVsEquipped) && (
                        <div className="text-[11px] mt-1 flex flex-wrap gap-x-2 opacity-80">
                          <span className="text-yellow-300/70">装備中比:</span>
                          {diffStats(r.diffVsEquipped)}
                        </div>
                      )}
                      {r.specials.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {r.specials.map((s, i) => (
                            <li key={i} className="text-xs text-purple-200/90 italic">― {s}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      className={r.equipped ? "btn" : "btn-primary"}
                      disabled={busy === r.id}
                      onClick={() => toggle(r)}
                    >
                      {busy === r.id ? "..." : r.equipped ? "解除" : "装備"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {consumables.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-yellow-300/80 mb-1">消耗品 / 素材</h3>
          <ul className="text-sm text-yellow-100/90 space-y-0.5">
            {consumables.map((r) => (
              <li key={r.id}>・{r.baseName} ×{r.quantity}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function sign(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

function hasAnyDiff(d: Stats): boolean {
  return d.atk !== 0 || d.def !== 0 || d.mat !== 0 || d.mdf !== 0 || d.hp !== 0 || d.mp !== 0;
}

function diffSpan(label: string, n: number) {
  if (n === 0) return null;
  const cls = n > 0 ? "text-green-300" : "text-red-300";
  return <span className={cls}>{label} {sign(n)}</span>;
}

function diffStats(d: Stats) {
  return (
    <>
      {diffSpan("攻", d.atk)}
      {diffSpan("防", d.def)}
      {diffSpan("魔攻", d.mat)}
      {diffSpan("魔防", d.mdf)}
      {diffSpan("HP", d.hp)}
      {diffSpan("MP", d.mp)}
    </>
  );
}
