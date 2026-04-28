"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Char = { id: string; name: string; level: number; jobName: string; isCursed: boolean };
type Job = { name: string; description: string };

export default function CharacterClient({ characters, jobs, slots }: { characters: Char[]; jobs: Job[]; slots: number }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [job, setJob] = useState(jobs[0]?.name ?? "");
  const [err, setErr] = useState<string | null>(null);

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
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, jobName: job }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "作成に失敗しました");
      return;
    }
    setCreating(false);
    setName("");
    router.refresh();
  }

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
      {!creating && characters.length < slots && (
        <button className="btn-primary" onClick={() => setCreating(true)}>新規キャラクター作成</button>
      )}
      {creating && (
        <form onSubmit={create} className="panel space-y-3">
          <div>
            <label className="label">名前（2-24文字）</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={24} />
          </div>
          <div>
            <label className="label">職業</label>
            <select className="input" value={job} onChange={(e) => setJob(e.target.value)}>
              {jobs.map((j) => <option key={j.name} value={j.name}>{j.name} - {j.description}</option>)}
            </select>
          </div>
          {err && <div className="text-red-400 text-sm">{err}</div>}
          <div className="flex gap-2">
            <button className="btn-primary" type="submit">作成</button>
            <button type="button" className="btn" onClick={() => setCreating(false)}>キャンセル</button>
          </div>
        </form>
      )}
    </div>
  );
}
