import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/characters");
  return (
    <main className="space-y-6 mt-10">
      <h1 className="text-3xl font-bold text-yellow-200">Text RPG MVP</h1>
      <p className="text-yellow-100/80">
        ようこそ。ここはテキストベースのオンラインRPG。<br />
        街、酒場、ダンジョン、戦い、ギルド、噂と転職……すべて文字で紡がれる世界です。
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="btn-primary">ログイン</Link>
        <Link href="/register" className="btn">新規登録</Link>
      </div>
      <ul className="text-xs text-yellow-100/60 list-disc pl-5 space-y-1">
        <li>外部AIキー無しでも完全に動きます（テンプレート生成）。</li>
        <li>本決済はモックです。</li>
        <li>管理者は <code>admin@example.com / admin1234</code> でログインしてください。</li>
      </ul>
    </main>
  );
}
