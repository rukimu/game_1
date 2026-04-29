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
- 変更履歴: `CHANGELOG.md`（未作成の場合は次サイクル完了時に新設）
