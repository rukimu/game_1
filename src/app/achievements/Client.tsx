"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { slug: string; title: string; rarity: string };

const RARITY_CLASS: Record<string, string> = {
  common: "text-yellow-100",
  rare: "text-blue-300",
  epic: "text-purple-300",
  legendary: "text-orange-300",
  mythic: "text-pink-300",
};

export default function AchievementsClient({
  currentTitle, options,
}: { currentTitle: string | null; options: Option[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function set(slug: string | null) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/achievements/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleSlug: slug }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d.error ?? "設定に失敗しました");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (options.length === 0) {
    return (
      <div className="text-xs text-yellow-200/60">
        まだ称号付きアチーブメントを獲得していません。世界に名を残せば、ここに称号が並びます。
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {err && <div className="text-red-400 text-xs">{err}</div>}
      <div className="text-xs text-yellow-200/70">
        現在の称号: {currentTitle ? <span className="text-amber-200 font-bold">「{currentTitle}」</span> : <span className="italic text-yellow-200/50">なし</span>}
      </div>
      <ul className="space-y-1">
        {options.map((o) => {
          const active = currentTitle === o.slug;
          return (
            <li key={o.slug}>
              <button
                className={`w-full text-left text-sm border rounded p-2 ${active ? "border-amber-500 bg-amber-900/20" : "border-yellow-900/40 bg-black/30 hover:bg-yellow-900/10"}`}
                disabled={busy}
                onClick={() => set(active ? null : o.slug)}
              >
                <span className={RARITY_CLASS[o.rarity] ?? ""}>{o.title}</span>
                {active && <span className="ml-2 text-xs text-amber-200">[装備中]</span>}
              </button>
            </li>
          );
        })}
        <li>
          <button
            className="w-full text-left text-xs border rounded p-2 border-yellow-900/30 bg-black/20 italic"
            disabled={busy || !currentTitle}
            onClick={() => set(null)}
          >
            称号を外す
          </button>
        </li>
      </ul>
    </div>
  );
}
