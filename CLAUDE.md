# CLAUDE.md

このファイルは Claude Code が本リポジトリで作業する際の常駐ガイドである。
セッション開始時に必ず読み、ここに書かれた規約に従う。

---

## 1. プロジェクト概要

**Text RPG MVP** — テキストベースの王道ファンタジー オンライン RPG。
Next.js 14 (App Router) + Socket.io + Prisma で構成。SQLite が既定 (Postgres も可)。

- 詳細憲章: `docs/team/MISSION.md`（北極星 / 設計指針 / 禁止事項）
- 戦略ロードマップ: `docs/team/ROADMAP.md`
- 改善バックログ: `docs/team/BACKLOG.md`

開発の北極星は **「攻略サイトでは絶対に答えが出せない、毎日帰りたくなるテキスト RPG」**。
詳細は MISSION.md を参照。

---

## 2. 環境とビルド

### 必要なもの
- Node.js 20+（22 で動作確認）
- 任意で Docker（Postgres を使う場合のみ。既定は SQLite で不要）

### よく使うコマンド

| コマンド | 用途 |
| --- | --- |
| `npm run setup` | `prisma db push` + seed。初回 / schema 変更後 |
| `npm run dev` | `node server.js` で Next.js + Socket.io を同居起動 (`http://localhost:3000`) |
| `npm run build` | 本番ビルド (`next build`) |
| `npx tsc --noEmit` | 型チェックのみ。**コミット前に必ず green** |
| `npm run lint` | ESLint |
| `npm run prisma:push` | schema を DB に反映（migration を残さない開発フロー） |
| `npm run seed` | `prisma/seed.ts` 実行 |
| `npx tsx scripts/smoke_combat.ts` | 戦闘系スモーク |
| `npx tsx scripts/smoke_gen.ts` | テキスト生成スモーク |
| `npx tsx scripts/smoke_loot.ts` | ハクスラドロップスモーク |
| `npx tsx scripts/smoke_raid.ts` | レイドスモーク |

**コミット前の最終チェック**: `npx tsc --noEmit` と関連 smoke が green。
コミットメッセージ末尾に `tsc green; smoke green` を含めるのが本リポジトリの慣習。

---

## 3. ディレクトリ規約

```
prisma/
  schema.prisma       Prisma schema (SQLite / Postgres 両対応)
  seed.ts             街・職・スキル・アイテム・シーズン・城・admin を seed
server.js             Custom server: Next.js + Socket.io 同居
src/
  app/                Next.js App Router (UI + API)
    api/<feat>/.../route.ts   各機能の API
    <feat>/page.tsx           各機能の UI
  components/         共通 UI (Hud / Chat 等)
  lib/                ドメインロジック（機能 1 つ = 1 ファイル）
scripts/
  smoke_<feat>.ts     スモークテスト（実 DB を叩く）
docs/
  team/               開発チーム向け（MISSION / ROADMAP / BACKLOG）
```

### 新機能追加時の置き場所
- ドメインロジック: `src/lib/<feature>.ts`（既存例: `raid.ts`, `mastery.ts`, `dailyChallenge.ts`）
- API: `src/app/api/<feature>/[...]/route.ts`
- UI: `src/app/<feature>/page.tsx` + 必要なら `Client.tsx`
- スモーク: `scripts/smoke_<feature>.ts`

---

## 4. ドキュメント更新規約（最重要）

> **MISSION.md §6 禁止事項**: 「README に古い情報を残さない」「動かない機能を『土台のみ』と誤魔化さない」。
> この規約はそれを実務レベルに落とし込んだものである。

### Cycle 完了の Definition of Done

`feat(cycle N)` または `feat(cycle N-x)` を含むコミットを打つ前に、**以下を必ず更新する**:

1. **`CHANGELOG.md`** に `## Cycle N — <題> (YYYY-MM-DD)` を追記
   - 主要変更を 3〜6 行の箇条書きで
   - 触ったファイルの代表 1〜3 個を列挙
2. **`docs/team/ROADMAP.md`** の「完了」リストに 1 行追加し、「進行・次サイクル」を更新
3. **`README.md`** の「実装した機能」リストに該当機能を 1 行追加
   - URL を増やしたなら「主要画面 URL」表にも追加
   - 「次に実装すべき優先事項」セクションが古くなっていないか確認
4. **`docs/team/BACKLOG.md`** の対応 P0/P1 項目を `DONE` セクションに移動
5. **WIP ハンドオフ** (`CYCLE_<N>_WIP.md` 等) が残っていれば `docs/archive/` に退避
6. `npx tsc --noEmit` と関連 smoke が green

### サイクル中断時

- ハンドオフ: `docs/team/CYCLE_<N>_WIP.md` を作成（既存 `CYCLE29_WIP.md` がテンプレ）
- 「完了したこと」「残タスク」「未コミット差分」「次セッションでの再開手順」を必ず含める
- サイクル完了コミットで `git mv docs/team/CYCLE_<N>_WIP.md docs/archive/` する

### 通常コミット（サイクルに紐付かない修正）

- バグ修正・小改修は doc 更新を強要しない
- ただし**ユーザ向け挙動の変更**を含む場合は README に反映

---

## 5. コミット規約

```
feat(cycle N): <題>             サイクル本体
feat(cycle N-x): <サブ題>       マルチコミットなサイクル (例: cycle 29-a)
feat(<scope>): <題>             サイクル外の機能追加
fix(<scope>): <題>              バグ修正
docs(cycle N): <題>             cycle に紐づくドキュメント更新
docs: <題>                      汎用ドキュメント更新
chore(cycle N): <題>            tsbuildinfo 更新等
chore: <題>                     依存更新等
refactor(<scope>): <題>         挙動変更なしの整理
```

本文の最後の行は `tsc green; smoke green`（または不要な場合は省略可だが、コア機能を触った場合は必須）。

### 禁止事項
- `--no-verify` / `--no-gpg-sign` をユーザの明示指示なしで使わない
- main ブランチへの force push をしない
- `git add -A` / `git add .` を避け、ファイル単位で stage する

---

## 6. アーキテクチャの要点

- **サーバ権威**: 戦闘・取引・装備・PvP・オークション・レイドはすべてサーバ側で検証する。クライアント値を信用しない（MISSION.md §2 の不変則）
- **Socket.io**: `town:*`, `party:*`, `guild:*`, `battle:*`, `raid:*` の rooms。`server.js` が単一プロセスでメモリ保持（Redis adapter は未導入、Cycle 22 でデファー）
- **生成基盤**: `src/lib/generation/service.ts` の `ContentGenerationService` インターフェース。既定は `TemplateContentGenerationService`。AI 経路は環境変数で切替可能だが現状未実装（C21 は方針変更で DROPPED、テンプレ事前大量生成路線）
- **戦闘エンジン**: `src/lib/battle.ts` の `resolveTurn` が中核。装備込みステータス算出は `src/lib/equipment.ts` の `computeCombatStats` を経由
- **BigInt 注意**: `RaidParticipant.attackReadyAt` 等は BigInt。API レスポンス前に `Number(...)` 変換が必須（`JSON.stringify` で死ぬ）

---

## 7. 作業フロー（推奨）

1. `docs/team/ROADMAP.md` の「進行・次サイクル」を読み、本セッションのテーマを確定
2. `docs/team/BACKLOG.md` の P0/P1 を見て本サイクルで取り込む項目を決める
3. 実装（schema 変更があれば `npm run setup`）
4. `npx tsc --noEmit` と関連 smoke を回す
5. **§4 の Definition of Done に従って doc を更新**
6. コミット → push

---

## 8. 既知の制約

- DB 既定は SQLite。マルチプロセス本番運用には不向き（C22 でデファー中）
- Socket.io は単一プロセス（Redis adapter 未導入）
- ターンタイマーはプロセス内 `setTimeout` で再起動で失われる（次回行動送信時に再開）
- 文章生成は日本語テンプレート中心。AI 連携は `src/lib/generation/service.ts` の `AiContentGenerationService` を実装する設計だが現状未実装

---

## 9. 参考リンク

- 憲章: `docs/team/MISSION.md`
- ロードマップ: `docs/team/ROADMAP.md`
- バックログ: `docs/team/BACKLOG.md`
- 一般ユーザー向け: `README.md`
- 変更履歴: `CHANGELOG.md`
- 体験設計: `docs/team/PLAYER_JOURNEY.md`, `docs/team/CORE_LOOP.md`, `docs/team/SKILL_DESIGN.md` (Cycle 39 で新設予定)
- 運用: `docs/team/PRODUCTION_OPS.md`
- テスト計画: `docs/team/MANUAL_TEST_PLAN.md`

---

## 10. 自律型開発規律 (2026-05-02 追加)

> 監督方針: 「速度より正確性・保守性・検証可能性を優先」「動いたように見える実装ではなく、仕様・テスト・型・ビルド・実行確認に基づいて進める」。
> 私 (Claude) は確認を求めすぎず合理的に判断して進める。ただし破壊的変更・仕様の大幅変更・データ削除・認証/課金/権限まわりは必ず止まって確認する。

### 10.1 開発サイクル (各タスク必須の流れ)

1. **現状把握** — 既存コード・ドキュメントを Read
2. **仕様整理** — 曖昧な箇所は **合理的仮定を明記**
3. **実装計画** — 影響範囲・想定リスクを列挙
4. **テスト方針** — 何をテストで守るか決定
5. **必要ならテスト追加** — 既知バグ修正は再現テストが先
6. **最小実装** — 1 機能・1 フロー単位
7. **検証** — typecheck / lint / build / seed / 関連 smoke
8. **バグ修正** — 検証で見つかった不具合を修正
9. **報告** — §10.5 のフォーマット
10. **次の小さなタスク**

### 10.2 実装前チェック (各タスク開始時に書く)

各タスク着手前に以下を明記する。コミットメッセージ本文に含めるか、CHANGELOG に残す:

- このタスクの **目的**
- 想定する **正しい挙動**
- **変更予定ファイル**
- **影響範囲** (他機能・既存データ)
- **追加・更新するテスト**
- **想定リスク** (特にセキュリティ・データ整合性)
- **検証方法**

### 10.3 仮定の明示

仕様が不明な場合は次の優先順位で判断:

1. 既存コードの設計思想
2. README / ドキュメント
3. 既存 UI/UX の一貫性
4. 一般的な Web アプリの期待挙動
5. セキュリティ・データ保護
6. 保守性
7. 実装の単純さ

判断した内容は **コミットメッセージに「仮定」または「既知の未実装」として記録**。

### 10.4 完了条件 (Definition of Done)

タスクは以下を全て満たした場合のみ完了:

- 仕様に沿っている
- 主要な正常系が動く
- 主要な異常系が処理される
- テストが追加または更新されている (テストを書けない場合は理由を明記し、手動確認手順を作成)
- 既存テストが通る
- typecheck が通る
- lint が通る
- build が通る (実行可能なら)
- 既存機能を壊していない
- **残課題が明記されている**

検証できなかった項目は「未検証」と明記。完了扱いしない。

### 10.5 報告フォーマット (コミットメッセージ本文に含める)

```
## 実施内容
- (何をしたか)

## 変更ファイル
- (主要なもの)

## 仮定・既知の未実装
- (合理的に判断した内容、未実装の機能)

## 追加・更新したテスト
- (なければ理由)

## 実行した検証
[x] typecheck
[x] lint
[ ] test  ← 該当タスクで vitest が未導入なら未チェックでよい (理由明記)
[x] seed/smoke
[ ] build
[ ] UI 動作 (監督実機 or Playwright)

## 残課題
- (BACKLOG に転記すべき項目)

## 次に進むべきタスク
- (自律判断、ROADMAP 整合)
```

### 10.6 禁止事項 (CLAUDE.md §5 を補強)

- テストを削除して通す
- 型を `any` で雑に逃がす
- エラーを try/catch で**握りつぶす**（`/* non-fatal */` の濫用を含む — 銀行勘定系では明確な error log を残す）
- console.log を大量に残す
- TODO のまま完了扱いにする
- 未検証なのに「完了」と言う
- 確認なしに大規模リファクタリング
- 関係ないファイルを大量変更
- 仕様不明点を勝手に都合よく解釈して黙って進める

### 10.7 タスク分割原則

1 回の作業単位は **「1 つのユーザーフロー」または「1 つの不具合」**。

良い例:
- ログイン成功後の遷移だけ実装
- フォーム送信時のバリデーションだけ直す
- 一覧画面のデータ取得だけ実装

悪い例:
- 認証 + 管理画面 + DB 設計 + UI 改善をまとめて実装
- 全体をリファクタ
- ついでに関係ないファイルを直す

### 10.8 監督に止まって確認する場面

以下は **必ず止まって確認**:

- 破壊的マイグレーション (既存データ削除可能性)
- 認証・認可・セッション周りの仕様変更
- 課金・決済まわり
- 権限管理の変更
- 大規模リファクタリング
- 仕様の大幅変更 (北極星に関わる)
- 既存テストの削除

### 10.9 エラー対応

エラーが出たら場当たり的に直さず:

1. エラー内容を読む
2. 原因を特定する
3. 関連ファイルを確認
4. 最小修正案を作る
5. 修正
6. 同じ検証コマンドを再実行
7. 結果を記録

**同じエラー修正で 3 回以上失敗した場合は立ち止まり**、原因の仮説と代替案を整理してから次の修正に進む。

---

**§10 改訂**: 2026-05-02。監督が ChatGPT 経由で提示した自律型開発ガイドラインを採用。
これ以降、Cycle 39 (Phase 0 設計図) からはこの規律で進める。
