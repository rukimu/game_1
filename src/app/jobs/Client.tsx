"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GameIcon from "@/components/GameIcon";

type Cand = { jobId: string; name: string; description: string; isCursed: boolean; rank: string; category: string };
type InheritableSkill = {
  id: string;
  name: string;
  description: string;
  type: string;
  element: string | null;
  cost: number;
  jobId: string | null;
  jobName: string;
};

type Props = {
  level: number;
  isCursed: boolean;
  history: { id: string; name: string; isCursed: boolean }[];
  activeQuests: { id: string; jobName: string; description: string; progress: number; goalCount: number }[];
  slotCount: number;
  inheritedSkillIds: string[];
  inheritablePool: InheritableSkill[];
};

export default function JobsClient({
  level,
  isCursed,
  history,
  activeQuests,
  slotCount,
  inheritedSkillIds,
  inheritablePool,
}: Props) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Cand[]>([]);
  const [tier, setTier] = useState<number | null>(null);
  const [past, setPast] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmCurse, setConfirmCurse] = useState<string | null>(null);
  const [editingInherit, setEditingInherit] = useState(false);
  const [draftInherit, setDraftInherit] = useState<string[]>(inheritedSkillIds);
  const [savingInherit, setSavingInherit] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => { setDraftInherit(inheritedSkillIds); }, [inheritedSkillIds]);
  async function load() {
    const r = await fetch("/api/jobs/available");
    const d = await r.json();
    setCandidates(d.candidates ?? []);
    setTier(d.tier ?? null);
    setPast(d.past ?? []);
  }

  const poolById = useMemo(
    () => new Map(inheritablePool.map((s) => [s.id, s])),
    [inheritablePool],
  );
  const groupedPool = useMemo(() => {
    const map = new Map<string, InheritableSkill[]>();
    for (const s of inheritablePool) {
      const arr = map.get(s.jobName) ?? [];
      arr.push(s);
      map.set(s.jobName, arr);
    }
    return Array.from(map.entries());
  }, [inheritablePool]);

  function toggleSlot(id: string) {
    setDraftInherit((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= slotCount) return cur;
      return [...cur, id];
    });
  }

  async function saveInherit() {
    setSavingInherit(true);
    setMsg(null);
    setErr(null);
    const r = await fetch("/api/jobs/inherit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillIds: draftInherit }),
    });
    if (r.ok) {
      setMsg("継承スキルを更新しました");
      setEditingInherit(false);
      router.refresh();
    } else {
      const d = await r.json().catch(() => ({}));
      setErr(d.error ?? "失敗");
    }
    setSavingInherit(false);
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
              <li key={j.id} className="border border-yellow-900/40 rounded p-2 bg-black/30 flex justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm flex items-center gap-1">
                    {j.category && <GameIcon slug={`job:${j.category}`} size={14} alt={j.category} />}
                    <span>{j.name}</span>
                    {j.curated && <span className="text-purple-300 text-xs">★固有</span>}
                    {j.isCursed && <span className="text-red-300 text-xs">[呪]</span>}
                  </div>
                  <div className="text-xs text-yellow-100/70">{j.description}</div>
                  {j.curated && j.signatureOutfit && (
                    <div className="text-[10px] text-purple-200/70 italic">《{j.signatureOutfit}》</div>
                  )}
                </div>
                <button className="btn shrink-0" onClick={() => change(j.id)} disabled={isCursed || j.isCursed}>戻る</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-sm font-bold text-yellow-200">
          継承スキル <span className="text-xs text-yellow-100/70">({draftInherit.length}/{slotCount} スロット)</span>
        </h3>
        <p className="text-xs text-yellow-100/70">
          過去に経験した職のスキルを最大 {slotCount} 個、現職に持ち込めます（Lv30 で 2 つ、Lv50 で 3 つに開放）。
        </p>
        {!editingInherit ? (
          <div className="flex flex-wrap gap-2 items-center mt-1">
            {draftInherit.length === 0 && (
              <span className="text-xs text-yellow-100/50">未設定</span>
            )}
            {draftInherit.map((id) => {
              const s = poolById.get(id);
              return s ? (
                <span key={id} className="text-xs px-2 py-0.5 rounded bg-purple-900/50 border border-purple-700/60">
                  {s.name} <span className="text-yellow-100/60">/ {s.jobName}</span>
                </span>
              ) : (
                <span key={id} className="text-xs px-2 py-0.5 rounded bg-gray-900/50 border border-gray-700/60">[消失]</span>
              );
            })}
            <button className="btn ml-auto" onClick={() => setEditingInherit(true)}>編集</button>
          </div>
        ) : (
          <div className="space-y-2 mt-1">
            {inheritablePool.length === 0 ? (
              <p className="text-xs text-yellow-100/60">過去に経験した職がまだありません。一度転職してから戻ってくると継承候補が現れます。</p>
            ) : (
              groupedPool.map(([jobName, skills]) => (
                <div key={jobName} className="border border-yellow-900/40 rounded p-2 bg-black/30">
                  <div className="text-xs font-bold text-yellow-200/80">{jobName}</div>
                  <ul className="space-y-1 mt-1">
                    {skills.map((s) => {
                      const checked = draftInherit.includes(s.id);
                      const disabled = !checked && draftInherit.length >= slotCount;
                      return (
                        <li key={s.id}>
                          <label className={`text-xs flex items-start gap-2 ${disabled ? "opacity-50" : ""}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleSlot(s.id)}
                              className="mt-0.5"
                            />
                            <span>
                              <span className="font-bold">{s.name}</span>
                              <span className="text-yellow-100/60"> ({s.type}{s.element ? `・${s.element}` : ""}, MP {s.cost})</span>
                              <div className="text-yellow-100/70">{s.description}</div>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
            <div className="flex gap-2">
              <button className="btn-primary" onClick={saveInherit} disabled={savingInherit}>
                {savingInherit ? "保存中…" : "保存"}
              </button>
              <button
                className="btn"
                onClick={() => {
                  setDraftInherit(inheritedSkillIds);
                  setEditingInherit(false);
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </section>

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
