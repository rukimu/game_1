export const metadata = { title: "プライバシーポリシー - Text RPG MVP" };

// Cycle 55 (Phase 4-d): プライバシーポリシー (個人情報保護法準拠の MVP ドラフト)。
export default function PrivacyPage() {
  return (
    <article className="panel space-y-3 text-sm text-yellow-100/90 leading-relaxed">
      <h1 className="text-lg font-bold text-yellow-200">プライバシーポリシー</h1>
      <p className="text-xs text-yellow-200/70">最終更新: 2026-05-03</p>

      <h2 className="text-base font-bold text-yellow-300 mt-4">1. 取得する個人情報</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>メールアドレス (アカウント識別)</li>
        <li>パスワードハッシュ (bcrypt、平文パスワードは保管しません)</li>
        <li>セッショントークン (cookie 経由でログイン状態を維持)</li>
        <li>キャラクター名・行動ログ (ゲーム動作・不正調査用)</li>
      </ul>

      <h2 className="text-base font-bold text-yellow-300 mt-4">2. 利用目的</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>本サービスの提供・維持・運営</li>
        <li>利用者からの問い合わせ対応</li>
        <li>不正利用の調査・対応</li>
        <li>サービス改善のための統計分析 (個人を特定しない形で)</li>
      </ul>

      <h2 className="text-base font-bold text-yellow-300 mt-4">3. 第三者提供</h2>
      <p>法令に基づく場合、利用者の同意がある場合を除き、第三者に個人情報を提供しません。</p>

      <h2 className="text-base font-bold text-yellow-300 mt-4">4. 委託</h2>
      <p>サーバホスティング・決済処理など外部委託先には、目的に必要な範囲で個人情報を共有します。委託先には適切な管理を求めます。</p>

      <h2 className="text-base font-bold text-yellow-300 mt-4">5. 安全管理措置</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>パスワードは一方向ハッシュ (bcrypt) で保管</li>
        <li>HTTPS 通信 (HSTS / TLS 1.2+)</li>
        <li>アクセス制御・監査ログによる不正検出</li>
      </ul>

      <h2 className="text-base font-bold text-yellow-300 mt-4">6. 利用者の権利</h2>
      <p>利用者は自身の個人情報の開示・訂正・削除を運営者に請求できます。請求方法は問い合わせ窓口を参照してください。</p>

      <h2 className="text-base font-bold text-yellow-300 mt-4">7. 未成年者の保護</h2>
      <p>15 歳未満の利用は禁止しています。15-18 歳の利用者は保護者の同意を得て登録してください。</p>

      <h2 className="text-base font-bold text-yellow-300 mt-4">8. 改訂</h2>
      <p>本ポリシーは予告なく改訂される場合があります。重要な変更はサービス内で告知します。</p>
    </article>
  );
}
