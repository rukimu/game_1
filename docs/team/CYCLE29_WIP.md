# Cycle 29 — Work In Progress Handoff

> 作業中断時のスナップショット。次セッション再開時にここから拾えるように。
>
> **最終コミット**: `bce76a9` (schema only) + 本ドキュメントと `src/lib/battle.ts` の export 1 行
>
> **作業中断理由**: 同セッションでの API stream timeout のため新セッションへ移行

---

## 完了したこと（コミット済）

### スキーマ（`bce76a9` で push 済 / DB 反映済）

`prisma/schema.prisma`:

- **`model Raid`** 追加（620 行付近）
  - id / townId / name / description / level / maxHp / hp / atk / defense / element / weakness / creatureType
  - status: `joining` / `active` / `ended`
  - lifecycle 時刻: `startsAt` / `joinDeadline` / `combatEndsAt` / `endedAt`
  - 結果: `result` / `rewardsJson` / `combatLogJson`
  - relation: `town: Town?` / `participants: RaidParticipant[]`
  - インデックス: `[status]` / `[townId, status]`

- **`model RaidParticipant`** 追加（651 行付近）
  - id / raidId / characterId / joinedAt
  - 戦闘ステ: `hp / maxHp / mp / maxMp`（参加時にスナップショット）
  - 集計: `damageDealt` / `healingDone`
  - クールダウン (`BigInt` ms): `attackReadyAt` / `skillReadyAt` / `healReadyAt`
  - KO: `alive` / `reviveAt` (BigInt ms)
  - relation: `raid: Raid` / `character: Character`
  - インデックス: `[raidId, characterId]` UNIQUE / `[raidId, damageDealt]`

- **`Town.raids: Raid[]`** リレーション追加
- **`Character.raidParticipants: RaidParticipant[]`** リレーション追加

### コード

- `src/lib/battle.ts`: `rollEquipmentDrop` を `export async function` に変更
  - レイドの撃破報酬（個別ドロップ）から呼ぶ前提
  - **未コミット** — 本コミットで取り込む

---

## 残っているタスク（次セッション）

### 1. `src/lib/raid.ts` 新規作成 — レイドエンジン本体

API:
- `spawnRaidIfDue(townId): Raid | null` — 街訪問時のレイジー湧き判定
- `joinRaid(raidId, characterId): { ok; reason? }` — 参戦
- `attackRaid(raidId, characterId): { ok; damage; ... }` — 通常攻撃 (5s CD)
- `skillRaid(raidId, characterId, skillId): { ok; damage|healing; ... }` — スキル (15s CD, MP 消費)
- `healRaid(raidId, characterId): { ok; healed; ... }` — 最低 HP 仲間を回復 (10s CD)
- `startRaidNow(raidId, characterId): { ok }` — 待機中で 5+ 集まったら手動開始
- `finalizeRaidIfDue(raidId): "victory" | "expired" | "active"` — HP=0 / 時間切れで決算
- `listActiveRaids(townId?): RaidView[]`
- `getRaidView(raidId): RaidView`

設計メモ:
- 攻撃は **非同期 DPS race**。各プレイヤーが個別 CD で連打、ボス HP は共有
- ボス AOE は**遅延適用** — アクションが来るたび `(now - lastTickMs)/30000` で経過分のティックを catch-up 適用
- KO 時は `alive=false` & `reviveAt = now + 90s`、次回アクション時にレイジー復活
- ダメージ計算: `computeCombatStats` + `computeCombatEffects` を流用（クリ/ライフスティール/特効が効く）
- `combatLogJson` は配列でログ追記、 `take 100` 程度に切り詰める

ファイル先頭にこの設計メモをコメントで書く。

### 2. API エンドポイント

```
src/app/api/raids/active/route.ts        GET (?townId=)
src/app/api/raids/[id]/join/route.ts     POST
src/app/api/raids/[id]/attack/route.ts   POST
src/app/api/raids/[id]/skill/route.ts    POST { skillId }
src/app/api/raids/[id]/heal/route.ts     POST
src/app/api/raids/[id]/start/route.ts    POST
src/app/api/raids/[id]/route.ts          GET (view)
```

すべて `requireActiveCharacter`、`force-dynamic`、エラーは `{ error }` JSON。

### 3. UI

- **`src/app/raid/[id]/page.tsx`**: サーバコンポーネントで初期 view を流し込み、Client にハンドオフ
- **`src/app/raid/[id]/Client.tsx`**: useState + 1秒ポーリングで状態更新
  - ボス HP バー（巨大）
  - 参戦者ランキング（与ダメ降順）
  - 自分の HP/MP/CD 表示
  - 攻撃 / スキル選択 / 回復 / 観戦の 4 ボタン（CD 中はカウントダウン）
  - 戦闘ログ（直近 30 件）
  - status=joining なら「⏳ 集合中（残り XX秒）」+ 5+ 集まったら「すぐ開始」ボタン
  - status=ended なら結果画面（Top10 + 自分のドロップ）
- ソケット用イベントは将来。MVP はポーリング 1〜2s
- **`src/app/town/page.tsx`** にバナー: 自タウンに active raid があれば赤枠で「★ レイド出現中『〜』 残りXX秒で戦闘開始 [参戦する]」

### 4. 自動湧き

`spawnRaidIfDue` を `src/app/town/page.tsx` の冒頭で呼ぶ:

```ts
if (town) {
  await spawnRaidIfDue(town.id);
}
```

ロジック:
- その町に `joining|active` レイドが既にあれば nop
- 直近 1 時間以内に `ended` レイドがあれば nop
- それ以外 8〜12% で湧き
- 湧かせたら `Announcement` を立てて `system:announcement` でブロードキャスト

### 5. アチーブメント追加（`src/lib/achievements.ts`）

- `raid_first` (common) "初めてレイドに参戦した"
- `raid_top_dmg` (rare, title) "レイドで貢献度 1 位を取った"
- `raid_5_kills` (epic, title) "5 体のレイドボスを討伐した"
- `raid_legend` (legendary, title) "レイドで 1 体相手に 5000 ダメージ与えた"

`raid.ts` の `joinRaid` / `finalizeRaidIfDue` から `awardAchievement` を呼ぶ。

### 6. パーティ多様性シナジー（`src/lib/battle.ts`）

`resolveTurn` の partState 構築直後に:

```ts
const archetypes = await getPartyArchetypes(battle.partyId);
const uniqueCount = new Set(archetypes).size;
const synergyMult = uniqueCount >= 5 ? 1.20
                  : uniqueCount >= 3 ? 1.10 : 1.00;
for (const ps of partState.values()) {
  ps.def = Math.floor(ps.def * synergyMult);
  ps.mdf = Math.floor(ps.mdf * synergyMult);
}
if (synergyMult > 1) {
  log.push({ ..., text: `パーティの多様性シナジー: 防御+${(synergyMult-1)*100}%` });
}
```

`getPartyArchetypes` は partyId からメンバーの jobCategory を集めて返すヘルパ（lib/battle.ts 内 or lib/party.ts）。

### 7. デイリーチャレンジに `raid_join` 追加

`src/lib/dailyChallenge.ts` の `TEMPLATES` に:

```ts
{
  goalType: "raid_join",
  goalRange: [1, 1],
  description: () => "今日 ワールドレイドに 1 回参戦する",
  rewardExpRange: [300, 500],
  rewardGoldRange: [200, 400],
}
```

`raid.ts` の `joinRaid` 成功時に `tickDailyChallenge({ goalType: "raid_join", delta: 1 })`。

### 8. ROADMAP_MAX.md に C29 完了反映

`docs/team/ROADMAP_MAX.md` の C29 セクションを「✅ DONE — 実装内容」に書き換え:
- ワールドレイド全機能
- パーティ多様性シナジー
- 残りの C29 項目（救援システム / ギルド討伐 / 協調謎）は C29.5 にデファー

軸 E（協調プレイ）★★★☆☆ → ★★★★☆ に更新。

---

## 動作確認手順（実装後の手動 E2E）

1. 2 ブラウザ（または 2 アカウント）で同じ街にログイン
2. 一方が `/town` に複数回アクセス → レイド湧き
3. 両方の `/town` にバナー表示確認
4. 双方が「参戦する」 → `/raid/[id]` に遷移
5. status=joining、残り時間カウントダウン
6. 5 人未満なら時間経過後に自動 active 化、5+ なら「すぐ開始」可
7. 攻撃連打（CD 5s）、スキル発動（CD 15s）、低 HP メンバーを回復（CD 10s）
8. ボス HP=0 → 結果画面、Top1 が legendary、Top5 が epic 確定
9. サーバ告知が他プレイヤーの `/town` にも流れる
10. デイリーチャレンジ「ワールドレイドに 1 回参戦」が消化される

---

## 注意点

- **BigInt の JSON 化**: `RaidParticipant.attackReadyAt` 等は BigInt なので `JSON.stringify` で死ぬ。API レスポンス前に `Number(...)` に変換すること
- **同時アクション**: 複数プレイヤーが同時攻撃すると lastBossTickMs の更新が競合するので、`prisma.$transaction` で hp 更新と log 追記をまとめる
- **CD 検証はサーバ側**: クライアントの CD は表示用、サーバで `Date.now() < attackReadyAt` を必ず弾く
- **観戦者の動線**: 参戦してない人は同じ街なら `/raid/[id]` を覗ける（read-only）。違う街なら 403

---

## 未コミット

- `src/lib/battle.ts`: `rollEquipmentDrop` の export 化（1 行）

---

**著者**: Claude Code
**作成**: 2026-04-29 (C29 中断時)
**次セッション**: このドキュメントから再開、上の「残っているタスク」を順に実装。
