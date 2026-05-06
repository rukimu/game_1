import Link from "next/link";

export const metadata = { title: "ドロップ確率開示 - Text RPG MVP" };

// Cycle 55 (Phase 4-d): ドロップ確率開示。MMO の課金保護指針に従い、
// ガチャ・ドロップの確率を明示する。テンプレ生成のテーブルで決まっている
// ものは数値で開示する。
export default function TransparencyPage() {
  return (
    <main className="space-y-3 max-w-3xl mx-auto">
      <div className="panel space-y-3 text-sm text-yellow-100/90 leading-relaxed">
        <div className="text-xs mb-2">
          <Link href="/town" className="underline text-yellow-300/80">街に戻る</Link>
          {" / "}
          <Link href="/legal/terms" className="underline text-yellow-300/80">法務トップ</Link>
        </div>
        <h1 className="text-lg font-bold text-yellow-200">ドロップ確率開示</h1>
        <p className="text-xs text-yellow-200/70">最終更新: 2026-05-03</p>
        <p>
          ゲーム内のドロップ・装備ティア・ガチャの確率を、誤解の無いよう公開します。本作には現状ガチャ要素はなく、戦闘ドロップとボス報酬がランダム性を持ちます。
        </p>
      </div>

      <div className="panel space-y-3">
        <h2 className="text-base font-bold text-yellow-300">通常戦闘 (Lv 帯別)</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Common: 約 60%</li>
          <li>Rare: 約 30%</li>
          <li>Epic: 約 8%</li>
          <li>Legendary: 約 2%</li>
        </ul>
        <p className="text-xs text-yellow-200/70">※ プレイヤーの職業適性 / Lv 帯 / 武器熟練度補正で ±5% 程度の変動。</p>
      </div>

      <div className="panel space-y-3">
        <h2 className="text-base font-bold text-yellow-300">本日のボス (1 日 1 体)</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>確定ドロップ: Epic 以上 (65%) / Legendary (35%)</li>
        </ul>
      </div>

      <div className="panel space-y-3">
        <h2 className="text-base font-bold text-yellow-300">週末ボス (T1/T2/T3 段階制)</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>T1: Epic 60% / Legendary 40%</li>
          <li>T2: 2 個ドロップ。Epic 50% / Legendary 50%</li>
          <li>T3: 2 個ドロップ。Legendary 確定</li>
        </ul>
      </div>

      <div className="panel space-y-3">
        <h2 className="text-base font-bold text-yellow-300">ワールドレイドボス</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>貢献度ランキングで個別 tier 確定: Top1 → Legendary / Top2-5 → Epic / 残り → Rare</li>
          <li>与ダメージに比例して EXP / Gold</li>
        </ul>
      </div>

      <div className="panel space-y-3">
        <h2 className="text-base font-bold text-yellow-300">アフィックス (装備の修飾)</h2>
        <p className="text-sm">
          各装備のティアごとに、プレフィックス/サフィックスが下記の数だけランダムに付与されます。
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Common: 0 (無修飾)</li>
          <li>Rare: 1 修飾</li>
          <li>Epic: 2 修飾 (うち 1 は特殊効果フレーバー付き)</li>
          <li>Legendary: 3 修飾 + 確定特殊効果</li>
        </ul>
      </div>

      <div className="panel space-y-3">
        <h2 className="text-base font-bold text-yellow-300">課金 (Stripe、未稼働)</h2>
        <p className="text-sm">
          本サービスは β/MVP 段階のため、課金機能は未稼働です。本番化時にはガチャ要素は導入せず、買い切り型のみを予定しています。
        </p>
      </div>
    </main>
  );
}
