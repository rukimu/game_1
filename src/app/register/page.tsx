"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "登録に失敗しました");
      return;
    }
    router.push("/characters");
    router.refresh();
  }

  return (
    <main className="max-w-sm mx-auto mt-10 panel">
      <h1 className="text-xl font-bold text-yellow-200 mb-3">新規登録</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">メールアドレス</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">パスワード（6文字以上）</label>
          <input className="input" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "..." : "登録"}</button>
      </form>
      <div className="text-xs mt-4 text-yellow-200/70">
        既に登録済み？ <Link href="/login" className="underline">ログイン</Link>
      </div>
    </main>
  );
}
