"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GameIcon from "@/components/GameIcon";

// Map an Item's slot/weaponClass to a GameIcon slug. weapon slot uses
// the weaponClass key (sword/bow/...); armor slots map to fixed slugs.
function iconSlugForItem(slot: string | null, weaponClass: string | null): string | null {
  if (slot === "weapon" && weaponClass) return `weapon:${weaponClass}`;
  switch (slot) {
    case "head": return "armor:helmet";
    case "body": return "armor:chest";
    case "arm": return "armor:arms";
    case "leg": return "armor:legs";
    case "foot": return "armor:boots";
    case "accessory": return "accessory:ring";
    case "charm": return "accessory:amulet";
  }
  return null;
}

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

type FilterSlot = "all" | "weapon" | "head" | "body" | "arm" | "leg" | "foot" | "accessory" | "charm" | "consumable";
type FilterTier = "all" | "common" | "rare" | "epic" | "legendary";
type SortMode = "acquired" | "tier" | "name" | "slot";

const TIER_RANK: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };

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
  const [filterSlot, setFilterSlot] = useState<FilterSlot>("all");
  const [filterTier, setFilterTier] = useState<FilterTier>("all");
  const [equippedOnly, setEquippedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("acquired");

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

  // Apply filter + sort. Filters narrow rows; sorting reorders them in-place
  // (always preserving the "equipped first" boost so currently-worn gear is
  // still easy to find).
  const filtered = useMemo(() => {
    let out = rows;
    if (filterSlot !== "all") {
      if (filterSlot === "consumable") out = out.filter((r) => r.category !== "equip");
      else out = out.filter((r) => r.category === "equip" && r.slot === filterSlot);
    }
    if (filterTier !== "all") {
      out = out.filter((r) => r.tier === filterTier);
    }
    if (equippedOnly) out = out.filter((r) => r.equipped);
    if (sortMode !== "acquired") {
      const arr = [...out];
      arr.sort((a, b) => {
        if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
        if (sortMode === "tier") {
          const ta = TIER_RANK[a.tier] ?? 0;
          const tb = TIER_RANK[b.tier] ?? 0;
          if (ta !== tb) return tb - ta;
          return a.displayName.localeCompare(b.displayName, "ja");
        }
        if (sortMode === "name") return a.displayName.localeCompare(b.displayName, "ja");
        if (sortMode === "slot") {
          const sa = a.slot ?? "z";
          const sb = b.slot ?? "z";
          if (sa !== sb) return sa.localeCompare(sb);
          return a.displayName.localeCompare(b.displayName, "ja");
        }
        return 0;
      });
      out = arr;
    }
    return out;
  }, [rows, filterSlot, filterTier, equippedOnly, sortMode]);

  if (rows.length === 0) {
    return <div className="text-yellow-200/50 text-xs">所持品はありません。</div>;
  }

  const slots = ["weapon", "head", "body", "arm", "leg", "foot", "accessory", "charm"];
  const equippable = filtered.filter((r) => r.category === "equip");
  const consumables = filtered.filter((r) => r.category !== "equip");

  const filterCount = filtered.length;
  const totalCount = rows.length;

  return (
    <div className="space-y-3">
      {/* Filter / sort toolbar. Sticks to the top of the panel. */}
      <div className="border border-yellow-900/40 rounded p-2 bg-black/20 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
        <label className="flex items-center gap-1">
          <span className="text-yellow-300/80">スロット</span>
          <select
            className="bg-black/50 border border-yellow-900/60 rounded px-1 py-0.5 text-xs"
            value={filterSlot}
            onChange={(e) => setFilterSlot(e.target.value as FilterSlot)}
          >
            <option value="all">全部</option>
            <option value="weapon">武器</option>
            <option value="head">頭</option>
            <option value="body">体</option>
            <option value="arm">腕</option>
            <option value="leg">脚</option>
            <option value="foot">靴</option>
            <option value="accessory">装飾</option>
            <option value="charm">お守り</option>
            <option value="consumable">消耗品/素材</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-yellow-300/80">ティア</span>
          <select
            className="bg-black/50 border border-yellow-900/60 rounded px-1 py-0.5 text-xs"
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value as FilterTier)}
          >
            <option value="all">全部</option>
            <option value="legendary">伝説</option>
            <option value="epic">希少</option>
            <option value="rare">良質</option>
            <option value="common">並</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-yellow-300/80">並び順</span>
          <select
            className="bg-black/50 border border-yellow-900/60 rounded px-1 py-0.5 text-xs"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            <option value="acquired">取得順</option>
            <option value="tier">ティア降順</option>
            <option value="name">名前順</option>
            <option value="slot">スロット順</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={equippedOnly} onChange={(e) => setEquippedOnly(e.target.checked)} />
          <span className="text-yellow-300/80">装備中のみ</span>
        </label>
        <span className="ml-auto text-yellow-200/50">{filterCount}/{totalCount} 件</span>
      </div>
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
                      <div className="font-bold flex items-center gap-1">
                        {iconSlugForItem(r.slot, r.weaponClass) && (
                          <GameIcon slug={iconSlugForItem(r.slot, r.weaponClass)!} size={16} alt={r.slot ?? ""} />
                        )}
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
