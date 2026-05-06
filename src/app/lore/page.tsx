import Hud from "@/components/Hud";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getActiveCharacter } from "@/lib/activeCharacter";

export const dynamic = "force-dynamic";

// Cycle 53 (Phase 3-a): 世界設定 (lore) ページ。
// docs/lore/*.md の手作り内部資料を、プレイヤーがゲーム内から閲覧可能に。
// Phase 1 の封印リストには含めず、Day1 から「世界が設計されている厚み」
// を感じられる入口として早期開放する (Month1 必須コンテンツの先取り)。
//
// レンダリング方針:
// - 本格的な markdown→HTML 変換は導入せず、<pre> + 軽い stripping で
//   見出し / リスト / 強調 を可読にする。依存ゼロを維持。
// - ファイル読み込みはサーバ側 fs.readFileSync。force-dynamic で毎回
//   読むので、ホットリロード中は doc 編集が即反映される。

const LORE_FILES: { slug: string; title: string; file: string }[] = [
  { slug: "world", title: "世界観総覧", file: "world.md" },
  { slug: "seasons", title: "季節と中心の謎", file: "seasons.md" },
  { slug: "towns", title: "5 大都市の歴史", file: "towns.md" },
  { slug: "curated_npcs", title: "curated NPC 名簿", file: "curated_npcs.md" },
];

function readLore(file: string): string {
  try {
    return readFileSync(join(process.cwd(), "docs", "lore", file), "utf-8");
  } catch (err) {
    console.error("[lore] failed to read", file, err);
    return "(読み込みに失敗しました)";
  }
}

export default async function LorePage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const docs = LORE_FILES.map((f) => ({ ...f, body: readLore(f.file) }));
  return (
    <main className="space-y-3">
      <Hud />
      <div className="panel space-y-2">
        <div className="text-xs">
          <Link href="/town" className="underline text-yellow-300/80">街に戻る</Link>
        </div>
        <h2 className="text-lg font-bold text-yellow-200">世界設定</h2>
        <p className="text-xs text-yellow-100/85 leading-relaxed">
          この世界は誰によって作られ、どんな歴史を経てきたのか。各章は折りたたまれており、
          気になる章だけ開いて読むことができる。NPC の台詞や噂はここに記された設定を土台にしている。
        </p>
      </div>
      {docs.map((d) => (
        <details key={d.slug} className="panel">
          <summary className="cursor-pointer text-sm font-bold text-yellow-200 select-none">
            {d.title}
          </summary>
          <pre className="mt-3 whitespace-pre-wrap text-[11px] text-yellow-100/85 leading-relaxed font-sans">
            {d.body}
          </pre>
        </details>
      ))}
    </main>
  );
}
