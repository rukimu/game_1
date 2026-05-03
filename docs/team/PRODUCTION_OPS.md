# Production Ops Guide

> Cycle 37 で導入した運用基盤の現状と「公開直前にやる作業」一覧。
> Postgres / Redis / Stripe / Backup / Monitoring を含む。

---

## 1. データベース: SQLite → Postgres 移行

### 現状
- 既定: SQLite (`prisma/dev.db`, `DATABASE_URL=file:./dev.db`)
- 単一プロセスでの開発・小規模運用に十分
- マルチプロセス / 高スループットには不向き

### 移行手順

```bash
# 1. .env で DATABASE_URL を Postgres に切替
DATABASE_URL="postgresql://rpg:rpg@localhost:5432/rpg"

# 2. prisma/schema.prisma の datasource provider を変更
#    provider = "postgresql"

# 3. Postgres 起動 (docker-compose 同梱)
docker compose up -d

# 4. マイグレーション + seed
npx prisma migrate dev --name init
npm run seed
```

### 注意点
- `prisma db push` (開発フロー) でなく **`migrate dev`** を使う。本番では `migrate deploy`
- BigInt フィールド (`RaidParticipant.attackReadyAt` など) は Postgres でも JSON.stringify で死ぬので、API レスポンス前に `Number(...)` 変換が必要 (既存コードは対応済)
- `@@unique` / `@@index` は Postgres で正しく機能する

---

## 2. Socket.io: Redis Adapter 導入

### 現状
- 単一プロセスでメモリ保持 (rooms: `town:*`, `party:*`, `guild:*`, `battle:*`, `raid:*`, `siege:*`)
- マルチプロセス / 水平スケール時に他ノードに event が届かない

### 導入手順

```bash
npm install @socket.io/redis-adapter ioredis
```

`server.js` の Socket.io 初期化に追加:

```js
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("ioredis");

const pub = createClient(process.env.REDIS_URL);
const sub = pub.duplicate();
io.adapter(createAdapter(pub, sub));
```

### 検証
- 2 ノードを別ポートで起動 (`PORT=3001 npm run dev` を 2 つ)
- クライアント A をノード 1、クライアント B をノード 2 に接続
- A の town チャットが B に届けば OK

---

## 3. 課金: モック → Stripe 本決済

### 現状
- `PaymentTransaction.mock = true` で全ての課金がモック
- 取引可能フラグ (`Item.tradable`) は既に分離されているので、決済層の入れ替えで完結

### 導入手順

```bash
npm install stripe @stripe/stripe-js
```

1. Stripe ダッシュボードで Product + Price を作成
2. Webhook endpoint (`/api/payments/webhook`) を実装し Stripe 署名検証
3. `src/app/api/payments/checkout/route.ts` で Checkout Session を作成
4. 成功 webhook で `PaymentTransaction.mock = false` の row を作る

### 法務
- 利用規約 / 特商法 / 年齢レーティング 15+ 表記が必要
- README に「教育目的の MVP」と記載しているが、本番では削除し利用規約を追加

---

## 4. Rate Limiting

### 実装済 (Cycle 37)
`src/lib/rateLimit.ts` の in-memory limiter。各 endpoint で `checkRateLimit(key, RATE_LIMITS.X)` を呼んで false なら 429 を返す。

```ts
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

if (!checkRateLimit(`chat:${characterId}`, RATE_LIMITS.CHAT_SEND)) {
  return NextResponse.json({ error: "送信が早すぎます" }, { status: 429 });
}
```

### マルチプロセス対応 (DEFERRED)
- 上記は単一プロセスのメモリで動くため、複数ノード間で counter が共有されない
- Redis 移行 (§2) と合わせて Redis ベースの sliding-window に置き換え

### プリセット
- `CHAT_SEND`: 1 req/s
- `ATTACK_SUBMIT`: 3 req/s
- `AUCTION_BID`: 2 req/s
- `CHARACTER_CREATE`: 5 req/min
- `GENERIC_API`: 10 req/s

---

## 5. Audit Log

### 実装済 (Cycle 37)
`AuditLog` モデル + `src/lib/audit.ts` のヘルパ。`recordAudit({ actorType, actorId, action, targetType, targetId, payload })` で記録。

### 記録対象 (推奨フック地点)
- 戦闘終了: `auditBattleEnd(characterId, battleId, "win"|"lose")` (battle.ts)
- 取引完了: `auditTrade(aId, bId, tradeId)` (trade route)
- 装備変更: `auditEquip(characterId, invItemId, equipped)` (equip route)
- アセンション: `auditAscend(characterId, generation)` (ascension.ts)
- 課金成功: `recordAudit({ action: "payment", payload: { amount, productId } })`

### 保管方針
- 永久保管が必要な行 (法務関連 = 課金 / 通報 / BAN) と、定期削除可能な行 (戦闘ログ) を分ける
- 現状は無条件保管。C37 phase 2 で「90 日経過した battle_end は削除」等のクリーンアップジョブを追加

---

## 6. Backup / Disaster Recovery

### Postgres
```bash
# 日次バックアップ (cron)
pg_dump -Fc rpg > /backups/rpg-$(date +%Y%m%d).dump
# S3 等にアップロード
aws s3 cp /backups/rpg-$(date +%Y%m%d).dump s3://my-bucket/backups/
```

### 検証
- 月次でリストア試験
- `pg_restore -d rpg_restore_test rpg-YYYYMMDD.dump` が完了すること

### RPO / RTO
- RPO: 24h (日次バックアップ)
- RTO: 4h (Postgres 構築 + リストア + 動作確認)

---

## 7. ログ集約 / 監視 / アラート

### 推奨スタック
- ログ集約: **Better Stack Logs** (旧 Logtail) or **Datadog**
- メトリクス: **Prometheus** (custom) or **Grafana Cloud**
- アラート: **PagerDuty** or **Slack webhook**

### 監視すべきメトリクス
- API レスポンスタイム (p50/p95/p99)
- 5xx エラー率
- データベース接続数
- Socket.io 同時接続数
- AuditLog 書き込み失敗率

### アラート閾値 (推奨初期値)
- 5xx > 1% で 5 分継続 → page
- p95 > 2s で 10 分継続 → notify
- DB 接続数 > 80% → page

---

## 8. 公開前チェックリスト

- [ ] `.env` の `AUTH_SECRET` を本番用に変更
- [ ] `ADMIN_EMAIL` / `ADMIN_PASSWORD` を本番用に変更
- [ ] Postgres 移行 + マイグレーション完了
- [ ] Socket.io Redis adapter 導入 + 2 ノード検証
- [ ] Stripe 本決済差し替え + Webhook 検証
- [ ] Rate limiting を全 mutation endpoint に適用
- [ ] Audit log を sensitive endpoint に適用
- [ ] 日次バックアップ + 月次リストア検証
- [ ] ログ集約 / 監視 / アラート構築
- [ ] 利用規約 / 特商法 / 年齢レーティング 15+ 表記
- [ ] HTTPS / CSP / セキュリティヘッダ設定 (Next.js の `next.config.js` で)

---

**作成**: 2026-05-02 (Cycle 37)
**著者**: Claude Code
**次の更新**: 公開直前に各項目の実機検証結果を追記。
