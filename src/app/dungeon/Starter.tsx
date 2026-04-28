"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DungeonStarter() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function start() {
    setLoading(true);
    setErr(null);
    const r = await fetch("/api/dungeons", { method: "POST" });
    setLoading(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErr(d.error ?? "失敗");
      return;
    }
    const d = await r.json();
    router.push(`/dungeon/${d.run.id}`);
  }
  return (
    <div>
      <button className="btn-primary" onClick={start} disabled={loading}>{loading ? "..." : "新たなダンジョンに潜る"}</button>
      {err && <div className="text-red-400 text-xs mt-1">{err}</div>}
    </div>
  );
}
