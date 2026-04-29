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

## Cycle 2 (実装中) — テーマ: 「世界が個に応える」+ 「もう一戦」の即効性

### P0 (本サイクルで実装)

| # | 項目 | 工数 | 神ゲー指針 | 触るファイル |
| --- | --- | --- | --- | --- |
| 1 | EXP 曲線の平準化 (Lv9→10 緩和) | S | (即動性) | src/lib/leveling.ts |
| 2 | クイズ後自動で街へリダイレクト | S | 初動30分 | src/app/characters/Client.tsx |
| 3 | 連戦ボーナス (streak) | S | 中毒性 | src/lib/battle.ts |
| 4 | 装備ドロップ最小実装 | S | 中毒性 | src/lib/battle.ts |
| 5 | bio が職業説明・噂に逆流 | M | 個に応じる | src/lib/generation/service.ts, templates.ts |
| 6 | シーズン謎キーワードを噂・敵説明に染み込ませる | M | 不確実性 + 個に応じる | service.ts, mystery.ts |
| 7 | NPC を主要街に seed + 季節を反映する台詞生成 | M | 協調の必然 + テキストの格 | prisma/seed.ts, town/page.tsx, service.ts |

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
