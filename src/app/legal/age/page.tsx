export const metadata = { title: "年齢レーティング - Text RPG MVP" };

// Cycle 55 (Phase 4-d): 年齢レーティング & 未成年課金保護 (MVP ドラフト)。
export default function AgePage() {
  return (
    <article className="panel space-y-3 text-sm text-yellow-100/90 leading-relaxed">
      <h1 className="text-lg font-bold text-yellow-200">年齢レーティング</h1>
      <p className="text-xs text-yellow-200/70">最終更新: 2026-05-03</p>

      <div className="border border-yellow-700/60 bg-yellow-950/30 p-3 rounded">
        <p className="text-base font-bold text-yellow-200">対象年齢: 15 歳以上</p>
        <p className="text-xs text-yellow-100/80 mt-1">
          本作には戦闘描写 (テキスト) と一部の暗いテーマ (呪い・死霊・血族の継承等) を含むため、15 歳以上を推奨対象としています。
        </p>
      </div>

      <h2 className="text-base font-bold text-yellow-300 mt-4">含まれる表現</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>テキストベースの戦闘描写 (具体的なゴア表現は含まない)</li>
        <li>状態異常 (毒・出血・呪い化) の文章表現</li>
        <li>ダーク要素 (呪い職・葬儀・死霊・不死者の血族 等)</li>
        <li>飲酒関連の演出 (酔いどれ吟遊詩人など)、ただし喫煙描写なし</li>
      </ul>

      <h2 className="text-base font-bold text-yellow-300 mt-4">含まれない表現</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>性的表現</li>
        <li>具体的な暴力描写 (流血・身体損壊の詳述)</li>
        <li>賭博 (ゲーム内ガチャは課金強要を回避する設計)</li>
      </ul>

      <h2 className="text-base font-bold text-yellow-300 mt-4">未成年者の課金保護</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>15 歳未満の利用は禁止です。</li>
        <li>15-17 歳の利用者は保護者の同意を得てください。登録時に確認画面を表示します。</li>
        <li>未成年者の課金には月額 1 万円・累計 5 万円の上限を設けます。</li>
        <li>保護者からの問い合わせがあった場合、速やかに利用状況を開示し、必要に応じて返金対応します。</li>
      </ul>
    </article>
  );
}
