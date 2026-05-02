"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Char = {
  id: string;
  name: string;
  level: number;
  jobName: string;
  isCursed: boolean;
  jobCurated?: boolean;
  signatureOutfit?: string | null;
};
type Question = { id: string; prompt: string; options: { id: string; label: string }[] };
type CuratedCandidate = {
  name: string;
  category: string;
  rank: string;
  description: string;
  quirk: string | null;
  signatureOutfit: string | null;
  signatureBio: string | null;
  skills: { name: string; description: string; type: string; element: string | null; cost: number }[];
};

export default function CharacterClient({ characters, slots }: { characters: Char[]; slots: number }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0); // 0=name, 1..N=questions, last=submit
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ jobName: string; bio: string | null } | null>(null);
  const [curatedCandidates, setCuratedCandidates] = useState<CuratedCandidate[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (creating && quiz.length === 0) {
      fetch("/api/quiz").then((r) => r.json()).then((d) => setQuiz(d.questions ?? []));
    }
  }, [creating, quiz.length]);

  // Cycle 31-b: once the player reaches the summary screen with all
  // questions answered, fetch curated suggestions matching their top
  // archetype. Lets them pick a hand-crafted personality instead of
  // the procedural starter job.
  useEffect(() => {
    if (!creating) return;
    if (quiz.length === 0) return;
    if (step - 1 < quiz.length) return;
    if (Object.keys(answers).length < quiz.length) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/characters/curated-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizAnswers: answers }),
        });
        if (!cancelled && r.ok) {
          const d = await r.json();
          setCuratedCandidates(d.candidates ?? []);
        }
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [creating, step, quiz.length, answers]);

  async function select(id: string) {
    await fetch(`/api/characters/${id}/select`, { method: "POST" });
    router.push("/town");
    router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("本当に削除しますか？")) return;
    await fetch(`/api/characters/${id}`, { method: "DELETE" });
    router.refresh();
  }
  function reset() {
    setCreating(false);
    setName("");
    setAnswers({});
    setStep(0);
    setErr(null);
    setResult(null);
    setCuratedCandidates([]);
  }
  async function submit(curatedJobName?: string) {
    setErr(null);
    if (Object.keys(answers).length < quiz.length) {
      setErr("すべての設問に回答してください");
      return;
    }
    setSubmitting(true);
    const body: { name: string; quizAnswers: Record<string, string>; jobName?: string } = {
      name,
      quizAnswers: answers,
    };
    if (curatedJobName) body.jobName = curatedJobName;
    const res = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "作成に失敗しました");
      setSubmitting(false);
      return;
    }
    const data = await res.json();
    setSubmitting(false);
    // Auto-select the freshly-created character so the upcoming redirect to
    // /town actually has an active character to render. Errors here are
    // non-fatal — the user can still pick from the list manually.
    if (data.character?.id) {
      try {
        await fetch(`/api/characters/${data.character.id}/select`, { method: "POST" });
      } catch { /* non-fatal */ }
    }
    setResult({ jobName: data.job?.name ?? "—", bio: data.bio ?? null });
    router.refresh();
  }

  // creation flow — once the quiz resolves, send the player straight to the town.
  // The bio echoes back to them inside generated text afterward.
  useEffect(() => {
    if (!creating || !result) return;
    const t = setTimeout(() => {
      router.push("/town");
      router.refresh();
    }, 4500);
    return () => clearTimeout(t);
  }, [creating, result, router]);

  if (creating && result) {
    return (
      <div className="panel space-y-3">
        <div className="text-sm text-yellow-200">星があなたに告げた職業は…</div>
        <div className="text-2xl font-bold text-yellow-100">{result.jobName}</div>
        {result.bio && (
          <div className="border border-yellow-900/40 rounded p-3 bg-black/40 text-sm">
            <div className="text-xs text-yellow-300/70 mb-1">あなたの生い立ち</div>
            <div>{result.bio}</div>
          </div>
        )}
        <div className="text-xs text-yellow-300/60">数秒後、街へ向かいます…</div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => { router.push("/town"); router.refresh(); }}>すぐに街へ向かう</button>
          <button className="btn" onClick={() => { reset(); router.refresh(); }}>キャラクター選択へ戻る</button>
        </div>
      </div>
    );
  }

  if (creating) {
    if (step === 0) {
      return (
        <div className="panel space-y-3">
          <div className="text-sm font-bold text-yellow-200">第一歩 — 名乗りを上げよ</div>
          <input className="input" placeholder="名前 (2-24文字)" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={24} />
          {err && <div className="text-red-400 text-xs">{err}</div>}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => {
              if (name.trim().length < 2) { setErr("名前は2文字以上"); return; }
              setErr(null);
              setStep(1);
            }}>次へ</button>
            <button className="btn" onClick={reset}>やめる</button>
          </div>
        </div>
      );
    }
    const qIndex = step - 1;
    const isFinalQ = qIndex >= quiz.length;
    function restartQuiz() {
      setAnswers({});
      setStep(1);
      setErr(null);
    }
    if (isFinalQ) {
      // Summary of current answers so the player can review before committing.
      return (
        <div className="panel space-y-3">
          <div className="text-sm text-yellow-200">回答を星詠みに委ねますか？</div>
          <div className="border border-yellow-900/40 rounded p-2 bg-black/30 text-xs space-y-1">
            <div className="text-yellow-300/80">回答一覧</div>
            {quiz.map((q, idx) => {
              const aId = answers[q.id];
              const aLabel = q.options.find((o) => o.id === aId)?.label ?? "（未回答）";
              return (
                <div key={q.id} className="flex gap-2">
                  <span className="text-yellow-300/60 tabular-nums">Q{idx + 1}</span>
                  <span className="flex-1 text-yellow-100/90">{aLabel}</span>
                  <button
                    className="text-yellow-300/80 hover:text-yellow-200 underline text-[10px]"
                    onClick={() => setStep(idx + 1)}
                  >
                    変更
                  </button>
                </div>
              );
            })}
          </div>
          {curatedCandidates.length > 0 && (
            <section className="border border-purple-700/50 rounded p-2 bg-purple-950/20 space-y-2">
              <div className="text-xs text-purple-200 font-bold">あなたに似た固有職</div>
              <div className="text-[10px] text-purple-200/70">
                指名するとテンプレ職ではなく、手作りの背景物語と固有スキルを持って始められます。
              </div>
              <ul className="space-y-2">
                {curatedCandidates.map((c) => (
                  <li key={c.name} className="border border-purple-900/40 rounded p-2 bg-black/30">
                    <div className="font-bold text-yellow-100">{c.name}</div>
                    <div className="text-[10px] text-yellow-300/70">
                      {c.quirk && <>癖: {c.quirk}　/　</>}
                      {c.signatureOutfit}
                    </div>
                    <div className="text-xs text-yellow-100/85 mt-1">{c.description}</div>
                    {c.signatureBio && (
                      <div className="text-[10px] text-yellow-100/70 mt-1 leading-relaxed">
                        {c.signatureBio}
                      </div>
                    )}
                    {c.skills.length > 0 && (
                      <div className="mt-1 text-[10px] text-purple-200/80">
                        固有スキル: {c.skills.map((s) => `${s.name}(${s.type}/MP${s.cost})`).join("・")}
                      </div>
                    )}
                    <button
                      className="btn-primary mt-2 text-xs"
                      disabled={submitting}
                      onClick={() => submit(c.name)}
                    >
                      {submitting ? "作成中…" : `${c.name} で始める`}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {err && <div className="text-red-400 text-xs">{err}</div>}
          <div className="flex gap-2 flex-wrap">
            <button className="btn-primary" onClick={() => submit()} disabled={submitting}>
              {submitting ? "作成中…" : (curatedCandidates.length > 0 ? "テンプレ職で運命を委ねる" : "運命を委ねる")}
            </button>
            <button className="btn" onClick={() => setStep(1)}>1問目から見直す</button>
            <button className="btn" onClick={restartQuiz} title="全回答をクリアして最初の設問へ">最初からやり直す</button>
            <button className="btn" onClick={reset}>やめる</button>
          </div>
        </div>
      );
    }
    const q = quiz[qIndex];
    if (!q) return <div className="panel">読み込み中…</div>;
    return (
      <div className="panel space-y-3">
        <div className="text-xs text-yellow-300/70">設問 {qIndex + 1} / {quiz.length}</div>
        <div className="text-sm font-bold text-yellow-100 leading-relaxed">{q.prompt}</div>
        <ul className="space-y-1">
          {q.options.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => {
                  setAnswers({ ...answers, [q.id]: o.id });
                  setStep(step + 1);
                }}
                className={`w-full text-left border rounded p-2 text-sm hover:bg-yellow-900/30 ${answers[q.id] === o.id ? "border-yellow-400 bg-yellow-900/40" : "border-yellow-900/40 bg-black/30"}`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 justify-between">
          <div className="flex gap-2">
            <button className="btn" onClick={() => setStep(Math.max(0, step - 1))}>戻る</button>
            <button
              className="btn"
              onClick={restartQuiz}
              title="今までの回答をクリアして最初からやり直す"
            >
              最初から
            </button>
          </div>
          <button className="btn" onClick={reset}>やめる</button>
        </div>
      </div>
    );
  }

  // selection screen
  return (
    <div className="space-y-4">
      <div className="text-xs text-yellow-300/80">使用枠 {characters.length} / {slots}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {characters.map((c) => (
          <div key={c.id} className="panel flex flex-col gap-2">
            <div className="flex justify-between items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold">
                  {c.name}
                  {c.isCursed && <span className="text-red-300 text-xs ml-1">[呪]</span>}
                </div>
                <div className="text-xs text-yellow-200/70">
                  Lv{c.level} / {c.jobName}
                  {c.jobCurated && <span className="text-purple-300 ml-1">★固有</span>}
                </div>
                {c.jobCurated && c.signatureOutfit && (
                  <div className="text-[10px] text-purple-200/70 italic truncate">《{c.signatureOutfit}》</div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="btn-primary" onClick={() => select(c.id)}>遊ぶ</button>
                <button className="btn-danger" onClick={() => remove(c.id)}>削除</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {characters.length < slots && (
        <button className="btn-primary" onClick={() => setCreating(true)}>新規キャラクター作成（職業診断）</button>
      )}
    </div>
  );
}
