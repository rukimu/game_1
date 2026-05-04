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

- ダンジョン UI の体験向上 (現在は「進む / 撤退」二択のみ。道中描写の追加)
- 経験値 Lv30+ のグラインド緩和 (C2 で曲線平準化済、追加緩和は実プレイ検証待ち)
- 装備合成の経済バランス検証 (C12 を実プレイで詰める)
- forge の preview→commit 確定一致 (deterministic-roll)

## P0 (Phase A〜D — 公開可能化までの必須)

詳細プランは `docs/team/ROADMAP.md` の Phase A〜D セクション、監督向け実機チェックリストは `docs/team/MANUAL_TEST_PLAN.md`。

### Phase A: 動作検証可能化
- **Cycle 39 (NEXT)**: 実機検証 §1-3 + デバッグツール (Lv50 即昇 / gold 配布 / 全 curated 解放) + 致命バグ第一波修正
- **Cycle 40**: エンドゲーム + 並行プレイ検証 §4-6 + バグ第二波

### Phase B: 自動テスト被覆
- **Cycle 41**: vitest 導入 + 純関数 unit test 30 本（applyDamage / 装備計算 / forge / abyss / ascension / 継承）
- **Cycle 42**: Playwright E2E 5 本 + smoke 拡充

### Phase C: 致命項目の修正
- **Cycle 43**: `withGuards(handler, { rateLimit, audit, mute })` 共通 middleware + 全 mutation endpoint に配備 + **Mute enforcement 実装** (現状 no-op の致命バグ) + CSP/HSTS/CSRF/CORS
- **Cycle 44**: 奈落 F25+ 報酬 cap + ascension 利得増額 + PvP placement 10 戦 + Gen0 限定リーグ + 奈落「祝福/呪い/取引」3 択ランダムイベント (北極星準拠)

### Phase D: 公開準備
- **Cycle 45**: 法務 4 点セット (規約/プライバシー/特商法/15+) + `/legal/*` ルート + 同意ログ + 個情法 + 未成年課金規制 + ドロップ確率開示 `/transparency`
- **Cycle 46**: Postgres 移行 + index 追加 + Redis adapter + Stripe 差替 + バックアップ + 監視

## P1 (体験設計再構築の中で扱う)

- **眼鏡反射 reflect 実装**: 眼鏡戦士の signature スキル「眼鏡反射」は現状 `type="buff"` で engine 上は no-op。受けた物理ダメージの 50% を反射するロジックを `battle.ts:resolveTurn` に追加 (skill use パスに reflect 分岐 + status effect として保持)
- **既存「観察眼」の type 変更**: 現状 `type="buff"` だが C39 サンプルで debuff 役割に変更。seed の `findFirst by name` だと skip されるので upsert 化が必要
- **既存キャラへの onboarding 遡及受注**: C41-4 onboarding chain は新規キャラのみ自動受注。既存 DB のキャラに [1/5] を遡及付与する one-shot script は未実装 (Phase 1 主対象は新規 Day1 ユーザのため後回し)

## P2 (任意拡張、Phase 4 完了後)

- **ピクセルアート差し替え (C35 Phase 2)**: itch.io 等で素材購入 or プロ発注、`IconSource.kind = "pixel"` に書き換え（既存 SVG 基盤が流用可能）
- **シーズン Hall of Fame**: 殿堂入りシステム
- **C31 Phase 3**: curated job を 100 → 300 体まで増量（`CURATED_JOB_BULK.md` 同手順）
- **NPC 季節台詞の curated 個別 hook**: 同 NPC が違う日に違う話をする実感の強化
- **Cycle 32**: 攻城戦に本物の戦闘 UI (現在は narrative log + スコア決着のみ、プレイヤー操作介入)
- **Cycle 33**: 世界観の手作り厚み (手作りユニーク NPC 30 体 + lore docs)
- **Cycle 34〜38**: 真のエンドゲーム / pixel art / endless dungeon / a11y / 本番化
- マルチパスクエスト (職業・履歴で分岐)
- レート分布バッジの公開ボード
- 出血の重ね掛け / 呪い化の伝播

## DROPPED (今は捨てる)

- 孤立テーブル一括削除 — Castle/Siege は C15 で活用済、DirectMessage は C25 で活用、WorldState は C7 で活用。Report/TownState は機能未確定なので保留 (削除リスク > 価値)
- AiContentGenerationService の完全置換 — API キー無し前提のテンプレート世界で十分な品質を得る方が優先
- AI プロバイダ実装 (元 Cycle 21 計画、2026-04-29 ユーザ判断) — API 課金 + レイテンシのコストがテンプレート方式の体験価値を超えると判断、テンプレ大量生成路線 (C21A〜D) で代替

## DONE

### Cycle 47 (2026-05-03) — Phase 2 craft 13 職 × 10 スキル = 130
- [x] **47-a**: 鍛冶娘 / 蜂蜜屋 / 仕立屋 各 10 スキル (= 30) 設計
- [x] **47-b**: 革職人 / 陶工 / 製本屋 各 10 スキル (= 30) 設計
- [x] **47-c**: 楽器作り / 機械工 / 紙漉き 各 10 スキル (= 30) 設計
- [x] **47-d**: 染物屋 / 鈴職人 / 鑿師 / 元武器商人 各 10 スキル (= 40) 設計
- [x] 既存 13 craft スキル全て seed name skip で保持。新規 117 skill create
- [x] 累計 640 unique skills (warrior+mage+rogue+cleric+craft)、Phase 2 残り 36 職 × 10 = 360

### Cycle 46 (2026-05-03) — Phase 2 cleric 12 職 × 10 スキル = 120
- [x] **46-a**: 老師 / 歌う司祭 / 元戦士の司祭 各 10 スキル (= 30) 設計
- [x] **46-b**: 沈黙派 / 童顔 / 雪国育ち 各 10 スキル (= 30) 設計
- [x] **46-c**: 元修道女 / 元軍医 / 双子の司祭 各 10 スキル (= 30) 設計
- [x] **46-d**: 元司書 / 元葬儀屋 / 裸足 各 10 スキル (= 30) 設計
- [x] 既存 12 cleric スキル全て seed name skip で保持。新規 108 skill create
- [x] 累計 510 unique skills (warrior 130 + mage 130 + rogue 130 + cleric 120)、Phase 2 残り 49 職 × 10 = 490

### Cycle 45 (2026-05-03) — Phase 2 rogue 13 職 × 10 スキル = 130
- [x] **45-a**: 甘党 / 影語り / 元道化師 各 10 スキル (= 30) 設計
- [x] **45-b**: 美食家 / 元医療助手 / 港育ち 各 10 スキル (= 30) 設計
- [x] **45-c**: 双子 / 写真記憶 / 偽名常用 各 10 スキル (= 30) 設計
- [x] **45-d**: 動物使い / 元軍楽隊 / 元郵便配達 / 元落書き屋 各 10 スキル (= 40) 設計
- [x] 既存 C31 スキル 13 個 (甘い罠 / 影分身 / 笑わせの一撃 / 毒見の心得 / 麻痺の一突 / 群衆抜け / 二段刺し / 弱点記録 / 別人成り / 鳩偵察 / 不協和音 / 近道の知識 / 目眩ましの飛沫) は seed `findFirst by name` skip で保持
- [x] 累計 390 unique skills (warrior 130 + mage 130 + rogue 130)、Phase 2 残り 61 職 × 10 = 610

### Cycle 44 (2026-05-03) — Phase 2 mage 13 職 × 10 スキル = 130
- [x] **44-a**: 猫好き / 不眠 / 喘息 各 10 スキル (= 30) 設計
- [x] **44-b**: 妖精と契約 / 元教師 / 数学狂 各 10 スキル (= 30) 設計
- [x] **44-c**: 不器用 / 沈黙派 / 古文書狂 各 10 スキル (= 30) 設計
- [x] **44-d**: 双頭 / 元錬金術師 / 元天文学者 / 元戦場医 各 10 スキル (= 40) 設計
- [x] 既存 C31 単一スキル 13 個 (招き猫の歌 / 夢渡り / 断章詠唱 / 妖精の閃光 / 解説詠唱 / 微分の刃 / 不発詠唱 / 無音呪文 / 古文の一節 / 二重詠唱 / 錬成の爆発 / 星辰連環 / 戦場療法) は seed `findFirst by name` skip で保持
- [x] 累計 260 unique skills (warrior 130 + mage 130)、Phase 2 残り 74 職 × 10 = 740 スキル

### Cycle 43 (2026-05-03) — Phase 2 warrior 13 職 × 10 スキル = 130
- [x] **43-a**: 巨漢 / 隻腕 / 双子 戦士 各 10 スキル (= 30) 設計
- [x] **43-b**: 元踊り子 / 元医者 / 元囚人 戦士 各 10 スキル (= 30) 設計
- [x] **43-c**: 雪国 / 海賊崩れ / 元騎士団長 各 10 スキル (= 30) 設計
- [x] **43-d**: 退役老兵 / 元獣狩り / 元密漁者 各 10 スキル (= 30) 設計
- [x] 各職 baseStats.mp を 18 (一般) / 22 (legendary) に底上げ (10 スキル運用に必要)
- [x] SKILL_DESIGN.md §1 の 10 役割枠 (基本攻撃/必殺技/自バフ/敵デバフ/仲間援護/AOE/持続バフ/連携/究極/signature) を全職で網羅
- [x] 既存 C31 単一スキル 12 個 (地響き / 片刃の覚悟 / 鏡像連携 / 舞剣の旋 / 急所突き / 鎖鳴り / 凍刃の一撃 / 船揺れ斬り / 総攻撃の号令 / 退き際の一撃 / 獣狩りの一閃 / 投網の妨害) は seed `findFirst by name` skip で保持、新規 108 skill のみ create

### Cycle 41 (2026-05-03) — 体験ホットスポット即時改善 (Day1)
- [x] **41-1**: Lv1-10 敵 HP 底上げ (`generation/service.ts` の HP multiplier: Lv1-5 ×1.5 / Lv6-10 ×1.3 / Lv11+ ×1.0) — 1 ターン即終了問題の解消
- [x] **41-2**: クエスト掲示板から受注済み + 完了済み quest を除外 (`town/page.tsx` で acceptedQuestIds 別 query)
- [x] **41-3**: HUD に「次の解放」予告 (`Hud.tsx` で nextLockedTown と NEXT_FEATURE_GATES の最小値を 🔒/🔓 で 1 行同時表示)
- [x] **41-4**: オンボーディング 5 連鎖クエスト (`src/lib/onboarding.ts` 新設、ONBOARDING_CHAIN 定義 + acceptFirstOnboardingQuest / advanceOnboardingChain / getActiveOnboardingQuest / seed.ts に upsert ロジック / `town/page.tsx` 最上部に専用バナー表示 + 受注中セクションから除外)

### Cycle 40 (2026-05-03) — Phase 1 リセット (段階開放 + 機能封印)
- [x] **40-2,3**: `HudMenu` に hiddenInPhase1 フラグ追加 (auction/mastery/boss/pvp/siege/abyss/ascension/canon を Phase 1 中は非表示) + 転職候補を curated only に
- [x] **40-4**: `Town.unlockLevel` schema 追加 + 5 主要都市 Lv 1/5/10/25/40 で段階開放 + `town/page.tsx` で filter + `move/route.ts` でサーバ側 guard + procedural 110 街は default 999 で封印
- [x] **40-5**: `src/middleware.ts` 新設で封印 route の直 URL POST を /town に redirect

### Cycle 39 (2026-05-03) — Phase 0 体験設計図
- [x] `docs/team/PLAYER_JOURNEY.md` (Day1/Week1/Month1/Endgame の感情曲線)
- [x] `docs/team/CORE_LOOP.md` (1 ターン決断 / 30s 決算 / 街選択肢)
- [x] `docs/team/SKILL_DESIGN.md` (10 ロール × 1000 職 = 10,000 スキル設計)
- [x] `docs/team/FEATURE_FREEZE_LIST.md` (4 階層 🟢🟡🔵🔴 機能判定)
- [x] CLAUDE.md §10 「自律型開発規律」採用 (10 サブ節、完了条件 / 報告フォーマット / 禁止事項)
- [x] 眼鏡戦士 10 スキル先行サンプル (`prisma/curatedJobs.ts`)

### Cycle 38 (2026-05-02) — a11y + UX 細部
- [x] `:focus-visible` ring (#f0c860) + body color #f8eed0 (コントラスト 5.2:1 で WCAG AA 余裕クリア)
- [x] battle Client にキーボードホットキー [1]攻撃 [2]スキル [3]防御 + ヒント表示
- [x] `<380px` モバイル `.panel` padding 0.75rem → 0.5rem
- [x] `prefers-reduced-motion` で button transition を停止

### Cycle 37 (2026-05-02) — 運用基盤 (基盤のみ)
- [x] `src/lib/rateLimit.ts` 新規 (in-memory sliding window、5 named presets、1000 ops 毎 GC)
- [x] `src/lib/audit.ts` 新規 (`AuditLog` モデルへの薄ラッパ、best-effort、auditBattleEnd / auditTrade / auditEquip / auditAscend ヘルパ)
- [x] `docs/team/PRODUCTION_OPS.md` 新規 (Postgres / Redis / Stripe / backup / 監視 / 公開前チェックリスト 8 セクション)
- [ ] phase 2: 各 endpoint への `checkRateLimit` / `recordAudit` 配備（routine 作業）

### Cycle 36 (2026-05-02) — 経済バランス
- [x] `src/lib/arenaSeason.ts` 新規 (ISO 週マーカー singleton、duelRating 50% regress、idempotent)
- [x] mystery 初解明者に +20 maxHp / +10 maxMp 永続ボーナス追加
- [x] スコープ調整: forge 失敗補填は forge エンジンに失敗概念がないため除外、boss tier 別 affix プールは既存 weeklyBoss で実装済

### Cycle 35 (2026-05-02) — アイコンアセット (将来ピクセル差替可能基盤)
- [x] **C35-a**: アイコン抽象基盤 — `src/lib/icons.ts`（`IconSource` union svg/pixel + `ICON_REGISTRY`）+ `src/components/GameIcon.tsx`（backend-agnostic）+ サンプル 5 SVG（sword/shield/crown/wand/skull）
- [x] **C35-b**: SVG カタログ 27 個追加 = 計 32 ファイル / 37 slug（武器 12 / 防具 6 / 装飾 2 / 職業 9 / 敵 5 / 状態 3）
- [x] **C35-c**: HUD（現職 archetype）/ `/characters`（選択カード）/ `/jobs`（過去職）/ `/inventory`（slot/weaponClass）に GameIcon 組み込み + `iconSlugForItem` ヘルパ
- [x] **C35-d**: `IconsToggle.tsx`（localStorage persist + `<html>.no-icons` クラス + `globals.css` で全アイコン非表示）+ HUD 右下に常時設置 + `pixel_samples.html` を `docs/archive/` に退避 + ROADMAP_MAX 軸 H 更新

### Cycle 34 (2026-05-02) — 真のエンドゲーム + 無限階ダンジョン
- [x] **C34-a**: `AbyssRun` / `AbyssWeeklyRecord` モデル + `Battle.abyssRunId` リレーション + `src/lib/abyss.ts`（1.15^floor 指数報酬、+1 level/floor 難度、各 10 階固有ボス、`onAbyssBattleEnded` で勝利→累積 / 敗北→半減+死亡、`retreatAbyss` 全額持ち帰り、ISO 週ランキング）+ `battle.ts` フック
- [x] **C34-b**: `/abyss` UI + HTTP API 3 本（enter / advance / retreat、Lv50+ ゲート）+ HUD 「奈落」リンク / 状態別 CTA / ボス階予告 / 週次ランキング Top20
- [x] **C34-c**: アセンション（`Character.generation` + `/ascension` Lv→1 リセット + 永久ボーナス + 2 段階確認 + Announcement）+ 称号コンプ「歩く伝承」（mythic hidden auto-grant）+ `/canon` 季節カノン年表 + HUD 「転生」「年表」リンク
- [x] **C34-d**: ROADMAP_MAX 軸 F ★★★★ → ★★★★★

### Cycle 33 (2026-05-02) — 世界観の手作り厚み (curated NPC + lore docs)
- [x] **C33-a**: `Npc.curated` / `bio` / `relationsJson` 拡張 + `prisma/curatedNpcs.ts` 新規（5 主要都市 × 6 NPC = 30 体、各 60-120 字 bio + 関係グラフ JSON）+ curated towns 2 つ（鐘塔の都ベルクラート / 古王国の都ヴェスペル）+ `src/lib/curatedNpc.ts` ヘルパ + seed 投入
- [x] **C33-b**: `/town` で curated NPC を紫枠 `<details>` 展開（bio + 関係マップ表示、procedural NPC は従来表示）
- [x] **C33-c**: `docs/lore/{world,seasons,towns,curated_npcs}.md` 4 ファイル新規（14 地方 + 5 都市 + 暦 + 宗教 + 古王朝 / S1-3 中心の謎・内部設定 + S4-S6 forward-look / 5 都市の歴史 / 関係グラフ ASCII 図 + クロスタウン隠し関係 + 命名規則）
- [x] **C33-d**: `SEASON_NPC_TEMPLATES` 12 種に拡充（旧 1 種）+ `generateNpcDialogue` に `baseLine` 引数（curated dialogue を保ちつつ季節キーワード上乗せ）+ ROADMAP_MAX 軸 D ★★★★ → ★★★★★

### Cycle 32 (2026-05-02) — 攻城戦に本物の戦闘 UI
- [x] **C32-a**: `SiegeBattle` / `SiegeBattleGuildState` / `SiegeBattleAction` モデル + `SiegeEvent.battle` 一対一 + `src/lib/siegeBattle.ts` 新規（startSiegeBattle / submitSiegeAction / resolveSiegeTurn / endSiegeBattle / getSiegeBattleView、HP = sum(level + wins/2)、30s ターン、6 アクション attack/aoe/heavy/support/rally/cure）
- [x] **C32-b**: HTTP API 2 本（`GET /api/siege/[id]/battle` lazy-create / `POST /api/siege/[id]/battle/action` engine エラーコード surfacing）
- [x] **C32-c**: 戦闘 UI `/siege/[id]/battle`（1.5s ポーリング + 4Hz クロック、ギルドカード HP バー、アクションパネル、戦闘ログ、観戦モード）+ `/siege` 一覧から「戦闘画面へ」リンク
- [x] **C32-d**: `siege:[id]` 応援チャット（`canAccess` 全員許可、既存 Chat 流用）+ ROADMAP_MAX 軸 A/E ★★★★ → ★★★★★

### Cycle 31 (2026-04-29) — 手作り固有職 (Phase 1 + 2 = 100 体)
- [x] **C31-a**: `Job` に `curated` / `quirk` / `signatureOutfit` / `signatureBio` / `pixelArtId` 追加 + `prisma/curatedJobs.ts` (12 体: 眼鏡戦士・巨漢戦士・猫好き魔導師・不眠魔導師・甘党盗賊・影語り・老師・歌う司祭・鍛冶娘・旅芸人・禁書館の番人・星詠み) + `src/lib/curatedJob.ts` ヘルパ + seed 投入
- [x] **C31-a fix**: 個体名は採用せず職業名のみに統一、bio を複数形 voice に書き直し、stale cleanup ロジックを seed に追加
- [x] **C31-b**: `POST /api/characters/curated-suggestions` 新規 + `POST /api/characters` で `jobName` 明示時 curated 優先 + `signatureBio` 上書き + キャラ作成 UI に紫枠「あなたに似た固有職」セクション + 「○○ で始める」指名選択
- [x] **C31-c**: HUD・`/jobs`・`/characters` に `★固有` バッジ + `《signatureOutfit》` 紫イタリック表示
- [x] **C31-d**: `docs/team/CURATED_JOB_BULK.md` 新規（JSON スキーマ / プロンプトテンプレ / カテゴリ分布表 / 受け入れ検証 / 投入手順）+ ROADMAP_MAX 軸 B 更新
- [x] **C31-d.b1〜b8 (Phase 2)**: 8 バッチで合計 88 体追加（warrior +11 / mage +11 / rogue +11 / cleric +10 / craft +12 / support +11 / heretic +11 / rare +11）→ 計 100 体、各 1 unique skill = 100 unique skill

### Cycle 30 (2026-04-29) — スキル継承システム
- [x] **C30-a**: `Character.inheritedSkillIds` (JSON) + `SkillProficiency(characterId, skillId, usageCount)` モデル + `src/lib/skillInherit.ts` 新規（slot 算定 Lv1+:1/30+:2/50+:3、`getInheritableSkills` / `setInheritedSkills` / `tickSkillProficiency` / `getProficiencyBonusPct`）
- [x] **C30-b**: `/jobs` UI に継承スロット操作（職別グループのチェックボックス、編集モード、保存時バリデーション）+ `POST /api/jobs/inherit`
- [x] **C30-c**: 戦闘で継承スキル使用、MP コスト 1.5x、`tickSkillProficiency` で使用ごとに加算、UI で `★`/紫枠の色分け
- [x] **C30-d**: 熟練度 +5/+10/+15% (10/30/50 回、SAME-cast) + チェーンコンボ +10%（同ターン内で異なる type 連続）+ ログに `[熟練+N%]` `[連携+10%]` タグ

### Cycle 29 (2026-04-29) — ワールドレイドバトル + 横断フック
- [x] `src/lib/raid.ts` 新規: 非同期 DPS race エンジン (攻撃 5s / 特技 15s / 回復 10s, KO + 90s 遅延復活, ボス AOE 遅延ティック)
- [x] HTTP API 7 本: `/api/raids/{active,[id],join,start,attack,skill,heal}` (BigInt は Number 化)
- [x] `src/app/raid/[id]/{page.tsx,Client.tsx}`: 1.5s ポーリング + 4Hz 局所クロック, 貢献度サイドバー, 結果画面
- [x] `/town` 出現バナー: `spawnRaidIfDue` を冒頭で呼ぶ (10% 湧き / 60min CD)
- [x] `battle.ts` パーティ多様性シナジー: alive jobCategory ユニーク 3 で def/mdf+10%, 5 で +20%
- [x] アチーブ 4 種: `raid_first` / `raid_top_dmg` / `raid_5_kills` / `raid_legend`
- [x] デイリーチャレンジ `raid_join` テンプレ追加 (EXP 300-500 / G 200-400)

### Cycle 28 (2026-04-29) — 中盤密度: テーマ別ダンジョン + Mastery + Daily
- [x] `src/lib/themedDungeon.ts` 新規: 5 種 (忘却の図書館 / 霜帝の塔 / 鏡映の湖底 / 灰の唄の祭壇 / 鐘塔の地下、Lv25-50、固有ボス、伝説確定タイプあり)
- [x] `src/lib/mastery.ts` 新規: 27 クエスト (9 archetype × 3 tier), Lv15/30/45 順次開放, T3 で専用称号
- [x] `src/lib/dailyChallenge.ts` 新規: 7 テンプレから毎日 3 抽選, 全クリ EXP+600 / G+500 + 隠し achievement
- [x] `/dungeon` にテーマ選択, `/mastery` ページ追加

### Cycle 27 (2026-04-29) — TOP5 オンボーディング致命的修正
- [x] スキル説明ツールチップ追加
- [x] 職業適性表を `/inventory` に常設
- [x] HUD ナビにレベル & 解放ゲート表示
- [x] クイズやり直し導線, モバイル HUD 縦積み崩れ修正
- [x] `docs/team/ROADMAP_MAX.md` 新規: 8 軸評価 + C27-C38 計画

### Cycle 26 (2026-04-29) — 戦闘・コンテンツ深度の総合拡張
- [x] 状態異常 6 種化: 沈黙 / 出血 / 呪い化追加, 敵→プレイヤー付与
- [x] 週末ボス T1〜T3 開放制 (T1→T2→T3 開放, T2+ で 2 個ドロップ, T3 伝説確定)
- [x] 攻城戦に narrative 戦況ログ (ラウンド別 champion 攻撃描写)
- [x] インベントリ ソート・フィルタ, forge プレビュー
- [x] レート上位 1/5/10 自動称号, 呪い解除 5 回称号

### Cycle 24+25 (2026-04-29) — ギルド倉庫 + DM UI
- [x] **C24**: `GuildStorageItem` テーブル追加, `/guild` に倉庫セクション (装備中以外/取引可を affix 含めて預け入れ・引き出し)
- [x] **C25**: `/messages` ページ (スレッド一覧・履歴・送信), HUD 未読バッジ, socket 受信通知 (メタデータのみ)

### Cycle 23 (2026-04-29) — 戦闘の途中参加・離脱
- [x] 同パーティ員は active な通常戦に参戦可能, 離脱時は HP/MP を維持して街に戻る (以降の報酬失効)
- [x] ボス戦・ダンジョン戦は対象外

### Cycle 21 (2026-04-29) — テンプレ大量生成路線
- [x] **C21A**: テンプレプール拡張 (jobs 653→4957, rumors 14→39, roles 8→20)
- [x] **C21B**: 大量シード (115 towns / 564 NPCs / 1720 jobs / 5039 skills / 848 items / 14 castles)
- [x] **C21C/D**: 76 achievements / 96 affixes / 拡張ボス・ダンジョンプール
- [x] 元 C21 案 (AI プロバイダ実装) は DROPPED — テンプレ大量生成路線へ方針変更

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
