"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Cand = { jobId: string; name: string; description: string; isCursed: boolean; rank: string; category: string };

export default function JobsClient({ level, isCursed, history, activeQuests }: any) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Cand[]>([]);
  const [tier, setTier] = useState<number | null>(null);
  const [past, setPast] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmCurse, setConfirmCurse] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  async function load() {
    const r = await fetch("/api/jobs/available");
    const d = await r.json();
    setCandidates(d.candidates ?? []);
    setTier(d.tier ?? null);
    setPast(d.past ?? []);
  }

  async function change(jobId: string, accept = false) {
    setMsg(null);
    setErr(null);
    const r = await fetch("/api/jobs/change", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, acceptCurse: accept }) });
    if (r.ok) {
      const d = await r.json();
      if (d.quest) setMsg(`転職課題が出ました: ${d.quest.description}`);
      else setMsg("転職しました！");
      router.refresh();
      load();
    } else {
      const d = await r.json().catch(() => ({}));
      if (d.warning) {
        // ask for confirmation
        setConfirmCurse(jobId);
      } else {
        setErr(d.error ?? "失敗");
        if (d.quest) setMsg(`転職課題が未達成: ${d.quest.description}`);
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-yellow-200/70">あなたのLv: {level}{isCursed && <span className="text-red-300 ml-2">[呪い職に就いています]</span>}</div>
      {tier === null && <div className="text-sm">Lv10で最初の転職機会が訪れます。</div>}

      {tier !== null && (
        <section>
          <h3 className="text-sm font-bold text-yellow-200">転職候補（Tier {tier}）</h3>
          <ul className="space-y-1">
            {candidates.map((c) => (
              <li key={c.jobId} className="border border-yellow-900/40 rounded p-2 bg-black/30">
                <div className="text-sm font-bold">{c.name} {c.isCursed && <span className="text-red-300 text-xs">[呪]</span>}</div>
                <div className="text-xs text-yellow-100/70">{c.description}</div>
                <div className="text-xs text-yellow-200/60">cat:{c.category} / rank:{c.rank}</div>
                {confirmCurse === c.jobId ? (
                  <div className="mt-1 flex gap-2">
                    <button className="btn-danger" onClick={() => change(c.jobId, true)}>本当に呪いを受け入れる</button>
                    <button className="btn" onClick={() => setConfirmCurse(null)}>キャンセル</button>
                  </div>
                ) : (
                  <button className="btn-primary mt-1" onClick={() => change(c.jobId)} disabled={isCursed}>転職する</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-yellow-200">過去に経験した職業</h3>
          <ul className="space-y-1">
            {past.map((j: any) => (
              <li key={j.id} className="border border-yellow-900/40 rounded p-2 bg-black/30 flex justify-between">
                <div>
                  <div className="text-sm">{j.name}{j.isCursed && <span className="text-red-300 text-xs ml-1">[呪]</span>}</div>
                  <div className="text-xs text-yellow-100/70">{j.description}</div>
                </div>
                <button className="btn" onClick={() => change(j.id)} disabled={isCursed || j.isCursed}>戻る</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeQuests.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-yellow-200">転職課題</h3>
          <ul className="space-y-1">
            {activeQuests.map((q: any) => (
              <li key={q.id} className="border border-yellow-900/40 rounded p-2 bg-black/30 text-xs">
                <div>「{q.jobName}」: {q.description}</div>
                <div className="text-yellow-200/70">進捗 {q.progress}/{q.goalCount}（戦闘で進行）</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isCursed && (
        <section className="border border-red-900/60 rounded p-2 bg-red-950/30">
          <h3 className="text-sm font-bold text-red-300">呪いの解除</h3>
          <p className="text-xs">同じパーティーに3名の協力者を集め、各自で「呪い解除を試みる」を実行してください（API: /api/jobs/curse/cleanse）。</p>
        </section>
      )}

      {msg && <div className="text-yellow-300 text-xs">{msg}</div>}
      {err && <div className="text-red-400 text-xs">{err}</div>}
    </div>
  );
}
