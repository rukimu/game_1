import Link from "next/link";
import type { ReactNode } from "react";

// Cycle 55 (Phase 4-d): 法務 4 点セット共通レイアウト。
// 規約 / プライバシー / 特商法 / 年齢の 4 ページにナビを共有させる。
// 表記内容は MVP ドラフト段階。本番公開前に必ず弁護士レビュー予定。
const LINKS = [
  { href: "/legal/terms", label: "利用規約" },
  { href: "/legal/privacy", label: "プライバシーポリシー" },
  { href: "/legal/transactions", label: "特商法に基づく表記" },
  { href: "/legal/age", label: "年齢レーティング" },
  { href: "/transparency", label: "ドロップ確率開示" },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="space-y-3 max-w-3xl mx-auto">
      <div className="panel">
        <div className="text-xs mb-2">
          <Link href="/town" className="underline text-yellow-300/80">街に戻る</Link>
        </div>
        <nav className="flex flex-wrap gap-2 text-xs">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="border border-yellow-900/40 bg-black/40 px-2 py-1 rounded hover:border-yellow-500/60"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
      <div className="panel text-[11px] text-yellow-200/60 leading-relaxed">
        ※ 本ページの記載は MVP ドラフトです。商用公開前に弁護士レビューを経て確定します。
      </div>
    </main>
  );
}
