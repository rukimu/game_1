export const metadata = { title: "特商法に基づく表記 - Text RPG MVP" };

// Cycle 55 (Phase 4-d): 特定商取引法に基づく表記 (MVP ドラフト)。
// 課金導入時に運営者の正式社名・住所・電話番号で確定する。
export default function TransactionsPage() {
  return (
    <article className="panel space-y-3 text-sm text-yellow-100/90 leading-relaxed">
      <h1 className="text-lg font-bold text-yellow-200">特定商取引法に基づく表記</h1>
      <p className="text-xs text-yellow-200/70">最終更新: 2026-05-03</p>
      <table className="w-full text-xs border border-yellow-900/40">
        <tbody>
          <tr className="border-b border-yellow-900/40">
            <th className="text-left p-2 bg-black/40 align-top w-1/3">販売事業者</th>
            <td className="p-2">(MVP 段階のため未確定。商用公開前に確定)</td>
          </tr>
          <tr className="border-b border-yellow-900/40">
            <th className="text-left p-2 bg-black/40 align-top">運営責任者</th>
            <td className="p-2">(MVP 段階のため未確定)</td>
          </tr>
          <tr className="border-b border-yellow-900/40">
            <th className="text-left p-2 bg-black/40 align-top">所在地</th>
            <td className="p-2">(MVP 段階のため未確定)</td>
          </tr>
          <tr className="border-b border-yellow-900/40">
            <th className="text-left p-2 bg-black/40 align-top">問い合わせ先</th>
            <td className="p-2">サポートメール: support@example.com (placeholder)</td>
          </tr>
          <tr className="border-b border-yellow-900/40">
            <th className="text-left p-2 bg-black/40 align-top">販売価格</th>
            <td className="p-2">各商品ページに税込で表示します。</td>
          </tr>
          <tr className="border-b border-yellow-900/40">
            <th className="text-left p-2 bg-black/40 align-top">支払い方法</th>
            <td className="p-2">クレジットカード (Stripe 経由予定)</td>
          </tr>
          <tr className="border-b border-yellow-900/40">
            <th className="text-left p-2 bg-black/40 align-top">商品の引渡時期</th>
            <td className="p-2">決済完了後即時 (デジタルコンテンツ)</td>
          </tr>
          <tr className="border-b border-yellow-900/40">
            <th className="text-left p-2 bg-black/40 align-top">返品・キャンセル</th>
            <td className="p-2">デジタルコンテンツの性質上、購入後の返品・キャンセルは原則お受けできません。重大な不具合時は個別にご連絡ください。</td>
          </tr>
          <tr>
            <th className="text-left p-2 bg-black/40 align-top">未成年者の購入</th>
            <td className="p-2">未成年者の課金には保護者の同意が必要です。月額 1 万円・累計 5 万円の上限を設けます (詳細は年齢ページ参照)。</td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}
