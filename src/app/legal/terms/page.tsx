export const metadata = { title: "利用規約 - Text RPG MVP" };

// Cycle 55 (Phase 4-d): 利用規約 (MVP ドラフト)。
export default function TermsPage() {
  return (
    <article className="panel space-y-3 text-sm text-yellow-100/90 leading-relaxed">
      <h1 className="text-lg font-bold text-yellow-200">利用規約</h1>
      <p className="text-xs text-yellow-200/70">最終更新: 2026-05-03</p>

      <h2 className="text-base font-bold text-yellow-300 mt-4">第1条 (適用)</h2>
      <p>本規約は、本サービス「Text RPG MVP」の利用に関する条件を、利用者と運営者の間で定めるものです。</p>

      <h2 className="text-base font-bold text-yellow-300 mt-4">第2条 (利用登録)</h2>
      <p>利用者はメールアドレスとパスワードを登録することで本サービスを利用できます。虚偽の情報による登録は禁止します。</p>

      <h2 className="text-base font-bold text-yellow-300 mt-4">第3条 (禁止事項)</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>法令に違反する行為</li>
        <li>他の利用者への嫌がらせ・脅迫・差別的言動</li>
        <li>運営の業務を妨害する行為 (大量アクセス・bot 利用等)</li>
        <li>他人になりすます行為、アカウント譲渡・売買</li>
        <li>RMT (Real Money Trade) ゲーム内通貨・アイテムの現金取引</li>
        <li>本サービスの脆弱性を悪用した不正取得</li>
      </ul>

      <h2 className="text-base font-bold text-yellow-300 mt-4">第4条 (アカウントの停止・削除)</h2>
      <p>運営者は、利用者が本規約に違反した場合、事前通知なくアカウントを停止または削除できます。</p>

      <h2 className="text-base font-bold text-yellow-300 mt-4">第5条 (免責事項)</h2>
      <p>本サービスはβ版/MVP段階であり、データ消失・サービス中断・キャラクター情報の不整合が発生する可能性があります。運営者はこれらに起因する損害について、故意または重過失がない限り責任を負いません。</p>

      <h2 className="text-base font-bold text-yellow-300 mt-4">第6条 (規約の変更)</h2>
      <p>運営者は本規約を予告なく変更できます。変更後も本サービスを利用する場合、変更後の規約に同意したものとみなします。</p>

      <h2 className="text-base font-bold text-yellow-300 mt-4">第7条 (準拠法・管轄)</h2>
      <p>本規約は日本法に準拠します。本サービスに関する紛争は東京地方裁判所を第一審の専属管轄裁判所とします。</p>
    </article>
  );
}
