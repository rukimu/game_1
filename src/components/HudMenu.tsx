"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Item = {
  href: string;
  label: string;
  group: "primary" | "more";
  // Optional unlock gate. The link is rendered greyed-out with a hint tag
  // until the condition is satisfied. Hard-blocked links don't navigate.
  unlock?: { kind: "level"; min: number; hint: string }
         | { kind: "guild"; hint: string };
};

// Two-tier nav. The "primary" group always shows inline (4 most-used pages).
// Everything else collapses behind a "メニュー" toggle on small screens, and
// remains expanded on >= sm so desktop users see all 16 links at a glance.
const ITEMS: Item[] = [
  { href: "/town", label: "街", group: "primary" },
  { href: "/inventory", label: "所持品", group: "primary" },
  { href: "/battle", label: "戦闘", group: "primary" },
  { href: "/party", label: "PT", group: "primary" },

  { href: "/messages", label: "DM", group: "more" },
  { href: "/shop", label: "店", group: "more" },
  { href: "/auction", label: "市場", group: "more" },
  { href: "/dungeon", label: "ダンジョン", group: "more", unlock: { kind: "level", min: 3, hint: "Lv3で開放" } },
  { href: "/jobs", label: "転職", group: "more", unlock: { kind: "level", min: 10, hint: "Lv10で開放" } },
  { href: "/mastery", label: "修練", group: "more", unlock: { kind: "level", min: 15, hint: "Lv15で開放" } },
  { href: "/forge", label: "鍛冶", group: "more", unlock: { kind: "level", min: 5, hint: "Lv5で開放" } },
  { href: "/boss", label: "ボス", group: "more", unlock: { kind: "level", min: 5, hint: "Lv5で開放（パーティ必須）" } },
  { href: "/mystery", label: "謎", group: "more", unlock: { kind: "level", min: 4, hint: "Lv4で開放" } },
  { href: "/pvp", label: "闘技", group: "more", unlock: { kind: "level", min: 5, hint: "Lv5で開放" } },
  { href: "/guild", label: "ギルド", group: "more", unlock: { kind: "level", min: 5, hint: "Lv5で開放" } },
  { href: "/siege", label: "攻城戦", group: "more", unlock: { kind: "guild", hint: "ギルド加入で開放" } },
  { href: "/abyss", label: "奈落", group: "more", unlock: { kind: "level", min: 50, hint: "Lv50で開放" } },
  { href: "/curse", label: "呪い", group: "more" },
  { href: "/achievements", label: "称号", group: "more" },
  { href: "/characters", label: "選択", group: "more" },
];

export default function HudMenu({
  isAdmin,
  unreadDms = 0,
  level = 1,
  inGuild = false,
}: {
  isAdmin: boolean;
  unreadDms?: number;
  level?: number;
  inGuild?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  function isLocked(item: Item): { locked: boolean; hint?: string } {
    if (!item.unlock) return { locked: false };
    if (item.unlock.kind === "level") {
      return { locked: level < item.unlock.min, hint: item.unlock.hint };
    }
    if (item.unlock.kind === "guild") {
      return { locked: !inGuild, hint: item.unlock.hint };
    }
    return { locked: false };
  }

  function renderLabel(href: string, label: string) {
    if (href === "/messages" && unreadDms > 0) {
      return (
        <>
          {label}
          <span className="ml-1 text-[10px] bg-red-700 text-white rounded px-1.5 py-0.5">{unreadDms}</span>
        </>
      );
    }
    return label;
  }

  function renderItem(item: Item, onClick?: () => void) {
    const { locked, hint } = isLocked(item);
    if (locked) {
      return (
        <span
          key={item.href}
          className="btn opacity-40 cursor-not-allowed"
          title={hint ?? "未開放"}
          aria-disabled="true"
        >
          {renderLabel(item.href, item.label)}
          <span className="ml-1 text-[9px] text-yellow-300/70">🔒</span>
        </span>
      );
    }
    return (
      <Link key={item.href} href={item.href} className="btn" onClick={onClick}>
        {renderLabel(item.href, item.label)}
      </Link>
    );
  }

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const adminItem: Item | null = isAdmin ? { href: "/admin", label: "管理", group: "more" } : null;
  const moreItems = adminItem ? [...ITEMS.filter((i) => i.group === "more"), adminItem] : ITEMS.filter((i) => i.group === "more");

  return (
    <div ref={containerRef} className="ml-auto flex items-center gap-2 flex-wrap relative">
      {ITEMS.filter((i) => i.group === "primary").map((i) => renderItem(i))}

      {/* Desktop: render the "more" group inline. Mobile: collapse behind a toggle. */}
      <div className="hidden sm:flex gap-2 flex-wrap">
        {moreItems.map((i) => renderItem(i))}
      </div>

      <button
        type="button"
        className="btn sm:hidden"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "閉じる" : "メニュー"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 sm:hidden bg-black/90 border border-yellow-900/60 rounded p-2 grid grid-cols-3 gap-2 min-w-[18rem] shadow-lg">
          {moreItems.map((i) => renderItem(i, () => setOpen(false)))}
        </div>
      )}
    </div>
  );
}
