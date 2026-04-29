"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function BossClient({
  canChallenge, partyId, claimed,
}: { canChallenge: boolean; partyId: string | null; claimed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function challenge() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/boss/start", { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(data.error ?? "挑戦に失敗しました");
        return;
      }
      if (data.battleId) {
        router.push(`/battle/${data.battleId}`);
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!partyId) {
    return (
      <div className="text-xs text-yellow-200/80">
        パーティーに所属していません。<a className="underline" href="/party">/party</a> から作成・参加してから挑戦してください。
      </div>
    );
  }
  if (claimed) {
    return (
      <div className="text-xs text-green-300/90">
        ★ 今日のボスは既にあなたのパーティーが討伐済みです。明日の世界をお待ちください。
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {err && <div className="text-red-400 text-xs">{err}</div>}
      <button
        className="btn-primary"
        onClick={challenge}
        disabled={!canChallenge || busy}
      >
        {busy ? "..." : "ボスに挑む"}
      </button>
    </div>
  );
}

// Weekly tier challenge button. Re-exported as a named export for clean
// server-side import (sub-properties on client components don't survive the
// RSC boundary cleanly).
export function WeeklyChallenge({ tier }: { tier: 1 | 2 | 3 }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function challenge() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/boss/start-weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(data.error ?? "挑戦に失敗しました"); return; }
      if (data.battleId) router.push(`/battle/${data.battleId}`);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1">
      {err && <div className="text-red-400 text-xs">{err}</div>}
      <button
        className="btn-primary text-xs"
        onClick={(e) => { e.preventDefault(); challenge(); }}
        disabled={busy}
      >
        {busy ? "..." : `T${tier} に挑む`}
      </button>
    </div>
  );
}

export default BossClient;
