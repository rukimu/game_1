"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BattleStarter() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function start() {
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/battles/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setLoading(false);
    if (!res.ok) { setErr((await res.json()).error ?? "失敗"); return; }
    const data = await res.json();
    router.push(`/battle/${data.battleId}`);
  }
  return (
    <div className="mt-3">
      <button className="btn-primary" onClick={start} disabled={loading}>{loading ? "..." : "敵と遭遇する"}</button>
      {err && <div className="text-red-400 text-xs mt-1">{err}</div>}
    </div>
  );
}
