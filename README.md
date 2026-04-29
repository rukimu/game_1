# Text RPG MVP

王道ファンタジーをモチーフにした、テキストベースのオンラインRPGの MVP です。
Next.js + Socket.io + Prisma で構成され、外部 AI キーが無くても完全にローカルで動きます。

> **方針**: 動くMVPを優先し、根幹の仕様は守る。生成は基本テンプレート、課金はモック、Postgresは任意（既定はSQLiteでDocker不要）。

---

## 起動手順

### 必要なもの
- Node.js 20+ （22で動作確認）
- (任意) Docker — Postgres を使う場合のみ

### 1. 初期セットアップ

```bash
cp .env.example .env       # 必要なら編集
npm install
npm run setup              # prisma db push + seed
```

`setup` で SQLite (`prisma/dev.db`) にスキーマを反映し、街・初期職業・初期スキル・初期アイテム・シーズン・城・管理者ユーザを seed します。

### 2. 開発サーバー起動

```bash
npm run dev
```

- `http://localhost:3000` を開いてください。
- Socket.io は同じポート (`/socket.io`) で同居します（custom server: `server.js`）。
- 既定ポートは `.env` の `PORT` で変更できます。

### 3. 本番ビルド

```bash
npm run build
npm start
```

### 4. (任意) Postgres へ切り替え

1. `.env` の `DATABASE_URL` を Postgres 接続文字列に変更（例: `postgresql://rpg:rpg@localhost:5432/rpg`）。
2. `prisma/schema.prisma` の `datasource db.provider` を `postgresql` に変更。
3. `docker compose up -d` で Postgres を起動。
4. `npx prisma migrate dev --name init && npm run seed`。

---

## テスト用アカウント

| 種類 | メール | パスワード |
| --- | --- | --- |
| 管理者 | `admin@example.com` | `admin1234` |

`.env` の `ADMIN_EMAIL` / `ADMIN_PASSWORD` を変更すると seed 時に反映されます。**本番では必ず変更してください。**

---

## 主要画面 URL

| URL | 説明 |
| --- | --- |
| `/` | ランディング（ログイン中なら `/characters` へ） |
| `/login`, `/register` | 認証 |
| `/characters` | キャラクター選択・作成・削除 |
| `/town` | 街（酒場・宿屋・噂・クエスト掲示・移動・街チャット） |
| `/party` | パーティー作成・参加・パーティーチャット |
| `/battle` | 戦闘開始 |
| `/battle/:id` | ターン制戦闘画面（半リアルタイム同期） |
| `/jobs` | 転職施設（候補生成・転職課題・呪い職警告） |
| `/guild` | ギルド設立・参加・ギルドチャット |
| `/shop` | 道具屋 + 課金ショップ（モック） |
| `/auction` | オークション出品・入札・即決 |
| `/pvp` | 決闘 PvP（即時シミュレート） |
| `/dungeon` | ダンジョン探索（複数階層・撤退選択・累積報酬） |
| `/dungeon/:id` | 現在の探索ラン（進む / 撤退） |
| `/mystery` | シーズンの中心の謎（手がかり収集） |
| `/inventory` | 所持品・装備管理（ティア・アフィックス・職業適性表示・装備切替） |
| `/admin` | 管理者画面（全タブ） |

---

## 実装した機能（MVP）

- アカウント: 登録 / ログイン / ログアウト / セッションクッキー
- 複数キャラクター: 作成・削除・名前変更（API）・選択
- **職業診断クイズ**: 6問の診断で適性アーキタイプ（戦士/魔導士/盗賊/神官/吟遊詩人）に振り分け、自動生成された生い立ち（bio）も付与。診断後は自動で街へ遷移
- **シーズンの中心の謎 × 世界が個に応える**: 7つの手がかりを噂・戦闘・ダンジョンで発見。最後の手がかりを引き当てた者がサーバー全体に告知（最初の解明者にボーナス）。**さらに季節キーワード（塔/鐘/紋章/禁書/井戸/灯/影/封印者/薄明）が街の噂・NPC 台詞に染み込む**
- **動的 NPC 台詞**: 街に居る NPC の台詞は、訪問日 × プレイヤーの職業 × 季節キーワード から毎日再生成。同じ NPC でも他職には別の台詞を返す
- **ハクスラ的装備ドロップ**: 倒した敵から `同じ名前でも効果が違う` 装備が落ちる。プレフィックス + サフィックス（合計 36 種）+ 特殊効果フレーバー、Common / Rare / Epic / Legendary の 4 ティア。プレイヤーの職業に合う武器が出やすい
- **装備カタログ 35+** 武器種: 剣・大剣・槍・短剣・弓・杖・ロッド・太鼓・笛・槌・フレイル。各武器に職業適性があり、適性外で装備すると効果半減
- **インベントリ画面 + 装備フロー**: `/inventory` でティア色分け表示、ワンクリックで装備切替、適性外バッジ、戦闘ステータス（装備込み）プレビュー
- **連戦ボーナス + EXP 曲線平準化**: 3 連勝以上で EXP+20% / Gold+10%。Lv9→10 の壁を緩和し、Lv50 グラインドを大幅短縮
- **ダンジョン探索**: 複数階層の連戦。各階の報酬は累積し、撤退すれば全て持ち帰る。全滅すると累積の半分を喪失。深層ほど報酬倍率増
- レスポンシブな昔のブラウザRPG風UI（テキスト+ボタン+ログ+チャット）
- 街（複数街、街移動、街情報、街チャット）
- 酒場（噂生成、クエスト生成、クエスト受注）
- 宿屋（HP/MP回復・有料）
- ショップ（消耗品・装備購入）
- オークションハウス（出品・入札・即決・サーバー側残高検証）
- 個人間トレード（API）
- パーティー（最大10人、作成・参加・脱退・リーダー移譲）
- ターン制戦闘（PvE）
  - 攻撃 / スキル / 防御
  - 属性弱点・耐性
  - 15秒のターンタイマー（未入力は自動攻撃）
  - 自動戦闘トグル / 攻撃ボタン長押しで連続攻撃
  - エンカウント数はパーティー人数依存（ソロは1体、3人パーティーは2-4体）
  - 敗北ペナルティ（ゴールド10%減、HP/MP=1）
  - 勝利報酬（経験値・ゴールド・クエスト進行）
- 経験値 / レベルアップ / 自動ステ強化
- 転職システム
  - Lv10/30/50で候補生成
  - 候補ごとに「課題（敵討伐）」を発行し、戦闘で進行
  - 過去職にはいつでも戻れる（呪い職を除く）
  - 呪い職は警告→明示同意→転職、解除はパーティー3名の儀式
- ギルド（Lv5以上 / 200G / 設立・加入・脱退・チャット）
- 決闘 PvP（即時シミュレート、戦績保存、敗北資源ロスト無し）
- 課金モック（追加スロット・名前変更・コスメ）— 本決済なし、強さに影響しない
- AI/テンプレート生成基盤
  - `ContentGenerationService` インターフェース
  - `TemplateContentGenerationService`（既定）
  - 環境変数 `AI_PROVIDER` / `*_API_KEY` で AI フォールバック構造を準備
  - 全生成物に対する `validate*` + `sanitize` + `containsBannedWord` 検証
  - `GeneratedContent` への記録
- 管理者画面
  - ユーザー / キャラクター / チャット / 生成物 / 戦闘 / 取引 / オークション / 告知 / シーズン操作
  - ミュート / BAN / 生成物無効化
- リアルタイム
  - Socket.io rooms: `town:*`, `party:*`, `guild:*`, `battle:*`
  - chat:new / battle:state / battle:turn_started / system:announcement
- セキュリティ
  - bcrypt パスワードハッシュ化
  - サーバー側で全戦闘・取引・オークションを検証
  - チャット送信のスパム制限（1秒）
  - 禁止ワード/サニタイズ（NGワード簡易リスト）
  - 自分のキャラ以外を操作不可
  - admin API は管理者のみ

---

## 土台のみ実装した機能

- **攻城戦**: `Castle` / `CastleOwnership` / `SiegeEvent` のテーブルと初期 seed 城（アルダ城）あり。管理画面から確認可。週次自動実行・GUI上の攻城戦ロジックは未実装。
- **闘技場ランキング**: PvP は決闘のみ。レート・ブラケットなし。
- **ボス戦の途中参加禁止フラグ**: フィールドは未追加（PvP / ボスでの途中参加禁止構造は battle table の拡張で対応する想定）。
- **DM（個人メッセージ）**: `DirectMessage` テーブル + chat ルーム `dm:` の枠だけ用意。UI/フロー未実装。
- **シーズン自動切替・世界状態の日次再生成**: テーブルあり、自動 cron なし。
- **Stripe 等の本決済**: モックのみ。
- **装備の特殊効果**: アフィックスのフレーバーテキスト（「魔法を使う敵に追加 1 ダメージ」等）は表示されるが、戦闘での実効性は未実装（ステータス補正のみ反映）。

---

## 既知の制限

- DBは既定で SQLite。マルチプロセス本番運用には不向き。
- Socket.io は単一プロセス内のメモリで部屋を保持（Redis adapter 未導入）。
- ターンタイマーは custom server プロセス内 `setTimeout`。プロセス再起動で失われる（次回行動送信時に再開）。
- 装備の装着フローはAPIレベル未実装（インベントリ表示と購入のみ）。
- ジョブ生成の重複候補は `generatedContent` から再利用するため、同 tier では同じ候補が出続けます（仕様）。
- 攻城戦・闘技場ランキング・季節法則は管理画面でデータ確認のみ。
- 文章生成は日本語テンプレート中心。AI連携時は `src/lib/generation/service.ts` の `AiContentGenerationService` を実装してください。

---

## 次に実装すべき優先事項

1. インベントリ画面 + 装備装着フロー（API は素材揃っているのでUIだけ）
2. DM画面と通知
3. AIプロバイダ実装（Anthropic / OpenAI）+ 生成失敗時のフォールバック検証
4. 攻城戦の cron + バトル化
5. 闘技場の自動マッチング & レート
6. 取引（Trade）UI（提案・確認・承認）
7. 戦闘中の途中参加・途中退出フロー
8. シーズン切替時の世界再生成 (`WorldState` の cron)
9. Redis adapter for Socket.io（マルチノード対応）
10. Postgres前提の本番設定 + Stripe 連携 + ロール管理 (RBAC)

---

## ディレクトリ構成

```
.
├── prisma/
│   ├── schema.prisma            # SQLite schema (Postgres でも可)
│   └── seed.ts                  # 街・初期職・スキル・アイテム・シーズン・城・admin ユーザー
├── server.js                    # Custom server: Next.js + Socket.io
├── src/
│   ├── app/                     # Next.js app router (UI + API routes)
│   │   ├── api/                 # 認証 / キャラ / 街 / クエスト / 戦闘 / PT / ギルド / トレード / オークション / PvP / ショップ / 管理者
│   │   ├── town/, battle/, party/, guild/, shop/, auction/, pvp/, jobs/, admin/, characters/, login/, register/
│   │   └── globals.css, layout.tsx
│   ├── components/
│   │   ├── Hud.tsx              # キャラクター情報 + メニュー
│   │   └── Chat.tsx             # Socket.io ベースチャット
│   └── lib/
│       ├── prisma.ts            # Prisma client (singleton)
│       ├── auth.ts              # bcrypt + cookie session
│       ├── activeCharacter.ts   # 現在操作中キャラの cookie
│       ├── socket.ts            # io ヘルパ
│       ├── leveling.ts          # 経験値・転職 tier
│       ├── battle.ts            # ターン制戦闘エンジン
│       ├── sanitize.ts          # NGワード/サニタイズ
│       ├── rng.ts               # 種付き擬似乱数
│       └── generation/
│           ├── templates.ts     # 単語/文テンプレート
│           ├── validate.ts      # 数値範囲・禁止語検査
│           └── service.ts       # ContentGenerationService
├── docker-compose.yml           # 任意の Postgres
├── tailwind.config.js, postcss.config.js, next.config.js, tsconfig.json
└── .env.example
```

---

## 動作確認手順（手動E2E）

1. `/register` で新規ユーザー作成 → 自動ログイン → `/characters` へ。
2. 「新規キャラクター作成」で名前と職業を選び作成 → 「遊ぶ」を押す。
3. `/town` に到達。「酒場で噂を聞く」と「新しいクエストを掲示」を押すと生成される。
4. 街のクエストを「受注」。
5. 「戦いに出る」→ 敵と遭遇 →「攻撃」を押す → ターンが進み、勝利すると経験値とゴールドが入る。
6. ゴールドが溜まったら `/shop` で薬草等を購入。
7. 別アカウントを作って `/pvp` で決闘 → 受け手が「受けて立つ」。
8. 管理者（`admin@example.com`）でログインして `/admin` でユーザー・チャット・生成物・戦闘・取引・告知・シーズンを確認。

---

## 環境変数

| Key | 既定 | 説明 |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | Prisma DB URL |
| `AUTH_SECRET` | `dev-secret-...` | セッション識別子。本番では必ず変更 |
| `PORT` | `3000` | サーバーポート |
| `AI_PROVIDER` | `template` | `template` / `ai`(将来用) |
| `ANTHROPIC_API_KEY` | (未設定) | 設定時のみ AI 経路 |
| `OPENAI_API_KEY` | (未設定) | 設定時のみ AI 経路 |
| `ADMIN_EMAIL` | `admin@example.com` | seed 時の管理者 email |
| `ADMIN_PASSWORD` | `admin1234` | seed 時の管理者 password |

---

## ライセンス / 注意

- ローカル動作 / 教育目的の MVP です。
- 本番運用には Postgres、Redis、Stripe、ロール管理、監視、CI/CD の追加実装が必要です。
- 初期 admin パスワードは開発用です。**本番に上げる前に必ず変更してください。**
