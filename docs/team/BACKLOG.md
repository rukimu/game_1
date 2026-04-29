# 改善バックログ

優先度: P0 (即実装) / P1 (次サイクル) / P2 (構想中) / DONE / DROPPED
工数: S (1h以下) / M (半日) / L (日単位)

---

## Cycle 1 統合結果 (2026-04-29)

**4 専門家全員が独立に指摘した最重要欠陥:**

| 発見 | 企画 | 数値 | 物語 | 技術 |
| --- | :-: | :-: | :-: | :-: |
| Npc テーブルが完全に孤立 | | | ✓ | ✓ |
| シーズン謎が生成テキストに染み込まない | ✓ | | ✓ | |
| bio がゲーム内テキストに逆流しない | ✓ | | ✓ | |
| Lv9→10 ゲートが急峻 | | ✓ | | |
| ドロップシステム未実装 | | ✓ | | |
| 初動 30 分の摩擦 | ✓ | | | |
| 装備装着 API 不在 | | | | ✓ |
| 攻城戦の本実装欠落 | | | | ✓ |

**戦略結論:**
> 神ゲー化の核心は「世界が個に応える」を実装すること。
> 元の MVP は機能カバレッジは合格だが、"あなただけの物語" を支える結線が欠けており、テキスト RPG として平板。

---

## Cycle 3 (進行中) — テーマ: ハクスラ的ドロップ × 装備の意味づけ

**ユーザリクエスト (2026-04-29 #2):**
> ハクスラっぽくドロップアイテムや装備が同名でも効果が違ったり特殊効果ついてたり。武器の種類も沢山、各職業毎に適正な武器がある。

**監督判断:** Cycle 1 で技術エージェントが指摘した「装備装着 API 不在」ブロッカーと完全に重なる。装備システムを一気にハクスラ仕様で立ち上げる。

### P0 (本サイクルで実装)

| # | 項目 | 工数 | 神ゲー指針 | 触るファイル |
| --- | --- | --- | --- | --- |
| 1 | InventoryItem に per-instance フィールド (displayName, instanceJson) | S | (前提) | prisma/schema.prisma |
| 2 | Item に weaponClass + jobAffinity フィールド | S | 個に応じる | 同上 |
| 3 | 武器カタログ拡張 (剣・大剣・槍・短剣・弓・杖・ロッド・太鼓・笛・槌・フレイル 等 30+) | M | 中毒性 | prisma/seed.ts |
| 4 | アフィックス生成モジュール (prefix/suffix/special、tier 別) | M | 不確実性 + 中毒性 | src/lib/affixes.ts (新規) |
| 5 | ドロップ時にアフィックスをロール、InventoryItem の displayName/instanceJson に保存 | S | 中毒性 | src/lib/battle.ts |
| 6 | 装備計算 helper: equipped + affix を合成して戦闘ステータス算出 | M | (前提) | src/lib/equipment.ts (新規) |
| 7 | 戦闘で装備合成ステータスを参照 | S | バランス | src/lib/battle.ts |
| 8 | Equip / Unequip API | S | (前提) | src/app/api/inventory/[id]/equip/route.ts (新規) |
| 9 | インベントリ画面 (/inventory) + 装備変更フロー | M | 初動 + 中毒性 | src/app/inventory/page.tsx (新規) |
| 10 | 職業適性ボーナス/ペナルティ (職業 × 武器カテゴリで ±) | S | 個に応じる | equipment.ts |

---

## P1 (次サイクル候補)

- 決闘 PvP の検索・受理 UI（API はあるが UI 不在）
- 呪い職解除をパーティ 3 人必須化 + 解除時サーバー告知
- ガイドツール (新規プレイヤー向け「次にやること」)
- インベントリ・装備装着 UI
- ダンジョン UI の体験向上 (現在は "進む / 撤退" 二択のみ — 道中描写を追加)
- 経験値 Lv30+ のグラインド緩和

## P2 (構想中)

- 攻城戦本実装 (Castle / Siege テーブル活用)
- AI プロバイダ実装 (Anthropic / OpenAI)
- マルチパスクエスト (職業・履歴で分岐)
- NPC 会話の進化 (複数プレイヤーが同 NPC に会うと話題が進化)
- シーズン自動切替 cron

## DROPPED (今は捨てる)

- 孤立テーブル一括削除 — Castle/Siege は P2 で活かす方針なので削除しない。WorldState/DirectMessage/Report/TownState は機能未確定なので保留 (削除リスク > 価値)
- AiContentGenerationService の完全置換 — API キー無し前提のテンプレート世界で十分な品質を得る方が優先

## DONE

### Cycle 20 (2026-04-29) — モバイル HUD
- [x] HudMenu.tsx 新規: 4 primary + collapsible (3-col grid) for sm 未満
- [x] HUD のリンク列を全部 HudMenu に委譲、admin リンクは props 経由

### Cycle 19 (2026-04-29) — シーズン自動切替
- [x] Season.expectedDurationDays 追加 (default 30)
- [x] src/lib/seasonRotation.ts: Season 2 (鏡の森) / Season 3 (灰の唄) テンプレート
- [x] worldstate.ts の getTodayWorldState() が rotation を駆動
- [x] mystery.ts の SEASON_KEYWORDS_BY_NAME に新シーズン分を追加

### Cycle 18 (2026-04-29) — インベントリ装備比較
- [x] /inventory に装備中比 ±N 表示 (色分け: 緑+/赤-)
- [x] 適性ペナルティを反映した実効ボーナスでの diff

### Cycle 17 (2026-04-29) — NPC が訪問者を記憶
- [x] Npc.lastSpokenName / lastSpokenAt / visitCount 追加
- [x] /town で 30 分以内の他訪問者を NPC 台詞末尾に追記

### Cycle 16 (2026-04-29) — 闘技場 ELO レート
- [x] Character.duelRating (default 1500) 追加
- [x] /api/pvp/duels/[id]/accept で K=32 ELO 更新 (transaction)
- [x] /pvp ランキングをレート順に、適正帯マッチング (±200) でサジェスト

### Cycle 15 (2026-04-29) — 攻城戦 MVP
- [x] SiegeEvent に status / winningGuildId / SiegeRegistration を追加
- [x] src/lib/siege.ts: 24h 登録窓 + 3h 戦闘窓 + 自動決着 (lazy advance)
- [x] /siege ページ + /api/siege/register
- [x] 勝利ギルドはサーバー全体告知 + CastleOwnership 更新

### Cycle 14 (2026-04-29) — アダプティブチュートリアル
- [x] Character.tutorialState 追加
- [x] src/lib/tutorial.ts: 6 段階のヒントを行動履歴から自動選択
- [x] /town に TutorialBox + /api/tutorial/dismiss

### Cycle 13 (2026-04-29) — クエスト多様化
- [x] QUEST_TEMPLATES を 3 → 10 (defeat / collect / explore / endure)
- [x] generateQuest が kind 別の title/goalParam/goalCount を出力
- [x] battle.ts で win_battles / collect_drop / defeat_enemy を tick
- [x] towns/[id]/move で visit_town を tick

### Cycle 12 (2026-04-29) — 鍛冶 (アフィックス加工)
- [x] src/lib/forge.ts: Reroll / Upgrade、5 素材消費、ティア別ゴールド
- [x] /forge ページ + /api/forge

### Cycle 11 (2026-04-29) — 戦闘状態異常
- [x] EnemyState に statuses[] を追加 (poison/burn/stun)
- [x] debuff スキル → 必中、attack スキルのクリ時 → 50% 確率
- [x] 毒/火傷の tick ダメージ、スタンの行動阻止

### Cycle 10 (2026-04-29) — アチーブメント / 称号
- [x] Achievement / CharacterAchievement モデル + 15 種シード
- [x] battle.ts / curse / duel / mystery / guild / dungeon にフック
- [x] /achievements + /api/achievements/title + HUD 称号

### Cycle 9 (2026-04-29) — 街に「最近の世界の出来事」表示
- [x] /town に最新 5 件の Announcement を表示。呪い告知・ボス討伐・謎解明が一目で分かる

### Cycle 8 (2026-04-29) — 本日のボス
- [x] Battle スキーマに kind / bossSlug を追加
- [x] src/lib/boss.ts: 日付決定論的なボス生成 (世界状態とトーンを反映)
- [x] /api/boss/start: パーティ単位 / 1 日 1 回 / 進行中バトルチェック
- [x] battle.ts のボス勝利パスで初討伐告知 + 確定 epic/legendary 装備
- [x] /boss ページ + HUD 「ボス」リンク

### Cycle 7 (2026-04-29) — 世界が毎日少し変わる
- [x] src/lib/worldstate.ts: 日付ごとの WorldState を lazy 生成 (静穏/不穏/祝祭/凶兆)
- [x] /town に「今日の世界」ヘッドライン表示

### Cycle 6 (2026-04-29) — 決闘 UI 完成
- [x] /pvp 全面リライト: 受信中/送信中/最近の決闘 を分離
- [x] 近レベル相手のサジェストボタン (1 クリック挑戦)
- [x] 戦績カード + 累計勝利数ランキング
- [x] 決闘シミュ: 装備 + アフィックス効果 (crit/lifesteal) を反映

### Cycle 5 (2026-04-29) — 呪い職を物語化
- [x] 呪い職就業時のサーバー告知
- [x] 解除完了時の告知 + 解除協力者全員に 200G 報酬
- [x] /curse ページで呪われし者一覧を可視化

### Cycle 4 (2026-04-29) — 戦闘深度
- [x] アフィックスに structured SpecialEffect[] (crit_rate, crit_damage, lifesteal, post_battle_regen, speed_aura, slay)
- [x] 敵に creatureType を推論して付与
- [x] battle.ts: applyEffects ヘルパで crit + slay + lifesteal を適用、戦闘後リジェネ

### Cycle 3 (2026-04-29) — テーマ: ハクスラ × 装備の意味づけ

- [x] **InventoryItem に per-instance フィールド** — `displayName` + `instanceJson` 追加 (`prisma/schema.prisma`)
- [x] **Item に weaponClass + jobAffinity** — 武器分類と職業適性 JSON (`prisma/schema.prisma`)
- [x] **武器カタログ拡張 35+ アイテム** — 剣・大剣・槍・短剣・弓・杖・ロッド・太鼓・笛・槌・フレイル + 防具 + 装飾 (`prisma/seed.ts`)
- [x] **アフィックスモジュール** — Common/Rare/Epic/Legendary の 4 ティア。プレフィックス 23 種、サフィックス 13 種、ティア毎の確率 + 特殊効果テキスト 18 種 (`src/lib/affixes.ts` 新規)
- [x] **ハクスラドロップ** — 倒した敵から **同名でも別アフィックス**の装備が落ちる。スモークテストで「古びた剣」が "燻し銀の 古びた剣の継承"、"練磨の 古びた剣の風斬り" など別個体に展開を確認 (`src/lib/battle.ts`)
- [x] **archetype 重み付きドロップ** — プレイヤーの職業に合う武器が出やすいが、無関係武器も低確率で出る (探索の余地)
- [x] **装備計算ヘルパー** — base + affix + 職業適性 (適性外 50% 効果) を合成 (`src/lib/equipment.ts` 新規)
- [x] **戦闘で装備込みステータス参照** — `computeCombatStats` を使って partState を構築 (`battle.ts`)
- [x] **Equip / Unequip API** — `POST /api/inventory/[id]/equip` および `/unequip` (新規)
- [x] **インベントリ画面 `/inventory`** — スロット別グルーピング、ティア色分け、適性外バッジ、特殊効果フレーバー、ワンクリック装備切替
- [x] **HUD に「所持品」リンク追加**
- [x] **スモークテスト** — `scripts/smoke_loot.ts` でアフィックス展開確認

### Cycle 2 (2026-04-29)

- [x] **EXP 曲線平準化** (S) — `expForLevel` を サブ二次 `15·level^1.6 + 30·level` に変更。Lv9→10 が 33% → 16% の負担減 (`src/lib/leveling.ts`)
- [x] **敵報酬の超線形スケール** (S) — `expReward = 15 + level·(7 + ⌊level/4⌋)`、Lv50 で 4 倍以上の増加 (`src/lib/generation/service.ts`)
- [x] **クイズ後 4.5s で街へ自動遷移** (S) — 結果画面を表示しつつ自動 push、即遷移ボタンも提供 (`src/app/characters/Client.tsx`)
- [x] **新規キャラの自動 active 化** (S) — POST /api/characters の後に /select を呼ぶ。"遊ぶ" 1 回省略 (同上)
- [x] **連戦 (streak) ボーナス** (S) — 直近の Battle 履歴から連勝数を引いて 3 連勝以上で EXP+20%・Gold+10% (`src/lib/battle.ts`)
- [x] **装備ドロップ最小実装** (S) — Lv に応じて 5.5%〜13% で Item プールから装備が落ちる (同上)
- [x] **シーズンキーワード Helper** (S) — `getCurrentSeasonKeywords()` を追加。Season 1 「灯の年」のキーワード 9 個 (`src/lib/mystery.ts`)
- [x] **噂への季節染み込み** (M) — 45% 確率で SEASONAL_RUMOR_TEMPLATES を選択。スモークテストで 10 件中 9 件にキーワードが入ることを確認 (`templates.ts`, `service.ts`, `rumors/generate/route.ts`)
- [x] **NPC vivification** (M) — 3 街に各 3 NPC を seed。役職毎の台詞バリエーション 3 種、季節キーワード混入、archetype 反応 (`prisma/seed.ts`, `service.ts`, `town/page.tsx`)
- [x] **生成検証スモークテスト** — `scripts/smoke_gen.ts` で噂・NPC・敵・EXP を一括確認可能に
