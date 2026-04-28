"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Char = { id: string; name: string; level: number; jobName: string; isCursed: boolean };
type Question = { id: string; prompt: string; options: { id: string; label: string }[] };

export default function CharacterClient({ characters, slots }: { characters: Char[]; slots: number }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0); // 0=name, 1..N=questions, last=submit
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ jobName: string; bio: string | null } | null>(null);

  useEffect(() => {
    if (creating && quiz.length === 0) {
      fetch("/api/quiz").then((r) => r.json()).then((d) => setQuiz(d.questions ?? []));
    }
  }, [creating, quiz.length]);

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
  }
  async function submit() {
    setErr(null);
    if (Object.keys(answers).length < quiz.length) {
      setErr("すべての設問に回答してください");
      return;
    }
    const res = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quizAnswers: answers }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "作成に失敗しました");
      return;
    }
    const data = await res.json();
    setResult({ jobName: data.job?.name ?? "—", bio: data.bio ?? null });
    router.refresh();
  }

  // creation flow
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
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => { reset(); router.refresh(); }}>キャラクター選択へ戻る</button>
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
    if (isFinalQ) {
      return (
        <div className="panel space-y-3">
          <div className="text-sm text-yellow-200">回答を星詠みに委ねますか？</div>
          {err && <div className="text-red-400 text-xs">{err}</div>}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={submit}>運命を委ねる</button>
            <button className="btn" onClick={() => setStep(quiz.length)}>戻って見直す</button>
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
        <div className="flex justify-between">
          <button className="btn" onClick={() => setStep(Math.max(0, step - 1))}>戻る</button>
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
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold">{c.name} {c.isCursed && <span className="text-red-300 text-xs">[呪]</span>}</div>
                <div className="text-xs text-yellow-200/70">Lv{c.level} / {c.jobName}</div>
              </div>
              <div className="flex gap-2">
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
