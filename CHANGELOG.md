# Changelog

本リポジトリの主要な変更履歴。CLAUDE.md §4 の Definition of Done に従い、サイクル完了時に追記する。

形式: `## Cycle N — <題> (YYYY-MM-DD)` 配下に主要変更 3〜6 行 + 触ったファイル代表 1〜3 個。
新しい順に並べる。

---

## Cycle 32 — 攻城戦に本物の戦闘 UI (2026-05-02)

narrative log だけだったシージにプレイヤーの操作介入を導入。a〜d の 4 サブサイクルで実装。軸 A（コアループ）★★★★ → ★★★★★、軸 E（協調プレイ）★★★★ → ★★★★★。

- **C32-a**: スキーマ + エンジン基盤 — `SiegeBattle` / `SiegeBattleGuildState` / `SiegeBattleAction` 3 モデル + `SiegeEvent.battle` 一対一 / `src/lib/siegeBattle.ts` 新規（startSiegeBattle / submitSiegeAction / resolveSiegeTurn / endSiegeBattle / getSiegeBattleView）/ HP = `sum(level + wins/2)` を damage budget に / 30s ターン、lazy advance（C29 raid パターン）/ 6 アクション: attack(1×) / aoe(0.5× 全敵) / heavy(1.5×) / support(自陣 +5%) / rally(master、味方 +20%、1 回限り) / cure(sub、自陣 +30%、1 回限り)
- **C32-b**: HTTP API 2 本 — `GET /api/siege/[id]/battle`（lazy-create 込み）/ `POST /api/siege/[id]/battle/action`（engine の explicit エラーコードを 400 で surfacing）
- **C32-c**: 戦闘 UI `/siege/[id]/battle` — 1.5s ポーリング + 4Hz クロック / ギルドカード（HP バー緑/黄/赤、自陣ハイライト、rally/cure 使用済バッジ）/ アクションパネル（参戦者 + 自陣 alive のみ、target 選択、master/sub 限定特殊行動）/ 戦闘ログ末尾 30 + アクション一覧サイドバー / 観戦モード（未参加 / 陣形崩壊で read-only）/ `/siege` 一覧から「戦闘画面へ」リンク追加
- **C32-d**: 応援チャット — `siege:[id]` チャンネルで `canAccess` 全員許可（参戦者・観戦者ともに投稿可、既存 Chat コンポーネント流用、rate limit + 禁止語フィルタ継承）+ ROADMAP_MAX 軸 A/E 更新
- 触ったファイル: `prisma/schema.prisma`, `src/lib/siegeBattle.ts` (新規), `src/app/api/siege/[id]/battle/{route.ts,action/route.ts}` (新規), `src/app/siege/[id]/battle/{page.tsx,Client.tsx}` (新規), `src/app/siege/Client.tsx`, `src/app/api/chat/[channel]/route.ts`

## Cycle 31 — 手作り固有職 (Phase 1 + 2 = 100 体到達) (2026-04-29)

curated job 量産の枠組みを a〜d で構築し、Phase 1 で 12 体、Phase 2 で 88 体を追加して **計 100 体** 到達。軸 B（キャラビルド）★★★★ → ★★★★★。

- **C31-a**: スキーマ拡張（`Job.curated` / `quirk` / `signatureOutfit` / `signatureBio` / `pixelArtId`）+ `prisma/curatedJobs.ts` 新規（8 カテゴリ × 12 体: 眼鏡戦士・巨漢戦士・猫好き魔導師・不眠魔導師・甘党盗賊・影語り・老師・歌う司祭・鍛冶娘・旅芸人・禁書館の番人・星詠み）+ `src/lib/curatedJob.ts` ヘルパ + seed 投入
- **C31-a fix**: 個体名は採用せず職業名のみに（「眼鏡戦士・パセリ」→「眼鏡戦士」）、signature bio も複数形 voice に書き直し、stale cleanup ロジックを seed に追加
- **C31-b**: `POST /api/characters/curated-suggestions` 新規（クイズ回答 → top archetype の curated 候補）+ `POST /api/characters` で `jobName` 明示時に curated 優先 + `signatureBio` 上書き + キャラ作成 UI に紫枠「あなたに似た固有職」セクション + 「○○ で始める」指名選択ボタン
- **C31-c**: HUD・`/jobs` 過去職カード・`/characters` 選択カードに `★固有` バッジ + `《signatureOutfit》` 紫イタリック表示
- **C31-d**: `docs/team/CURATED_JOB_BULK.md` 新規（JSON スキーマ / プロンプトテンプレ / カテゴリ分布表 / 受け入れ検証 / 投入手順）+ ROADMAP_MAX 軸 B 更新
- **C31-d.b1〜b8 (Phase 2)**: 8 バッチで合計 88 体追加（warrior +11 / mage +11 / rogue +11 / cleric +10 / craft +12 / support +11 / heretic +11 / rare +11）→ 計 100 体、各 1 unique skill
- 触ったファイル: `prisma/{schema.prisma,curatedJobs.ts,seed.ts}`, `src/lib/curatedJob.ts` (新規), `src/app/api/characters/{route.ts,curated-suggestions/route.ts (新規)}`, `src/app/characters/{page.tsx,Client.tsx}`, `src/app/jobs/{page.tsx,Client.tsx}`, `src/components/Hud.tsx`, `docs/team/CURATED_JOB_BULK.md` (新規)

## Cycle 30 — スキル継承システム (2026-04-29)

過去職スキルを現職スロットに持ち込めるビルド独自性システムを a〜d の 4 サブサイクルで実装。軸 B（キャラビルド）★★★ → ★★★★。

- **C30-a**: スキーマ + ライブラリ — `Character.inheritedSkillIds` (JSON) + `SkillProficiency(characterId, skillId, usageCount)` + `src/lib/skillInherit.ts`（slot 算定 Lv1+:1 / Lv30+:2 / Lv50+:3、`getInheritableSkills`、`setInheritedSkills`、`tickSkillProficiency`、`getProficiencyBonusPct`）
- **C30-b**: `/jobs` UI に継承スロット操作（職別グループのチェックボックス、編集モード）+ `POST /api/jobs/inherit`（スロット上限・継承可能セットでバリデーション）
- **C30-c**: 戦闘統合 — 継承スキルを `getAvailableSkills` に合流、MP コスト 1.5x、`tickSkillProficiency` で使用ごとに加算、戦闘 UI で `★`/紫枠の色分け + `【継承】` ログタグ
- **C30-d**: 熟練度ボーナス +5/+10/+15%（10/30/50 回、SAME-cast）+ チェーンコンボ +10%（同ターン内で異なる type の連続）+ ログに `[熟練+N%]` `[連携+10%]` タグ
- 触ったファイル: `src/lib/skillInherit.ts` (新規), `src/lib/battle.ts`, `src/app/jobs/{page.tsx,Client.tsx}`, `src/app/api/jobs/inherit/route.ts` (新規), `src/app/battle/[id]/{page.tsx,Client.tsx}`

## Cycle 29 — ワールドレイドバトル + 横断フック (2026-04-29)

街湧きの非同期 DPS race 型レイドを a〜d の 4 サブサイクルで実装。

- **C29-a**: レイドエンジン本体。攻撃 5s / 特技 15s / 回復 10s の個別 CD、KO + 90s 遅延復活、ボス AOE は遅延ティック適用、貢献度ランキング決算（Top1 legendary / Top2-5 epic / 残り rare）。10 種テンプレ
- **C29-b**: HTTP API 7 エンドポイント (`active` / `[id]` / `join` / `start` / `attack` / `skill` / `heal`)。`force-dynamic` + `requireActiveCharacter` 経由で BigInt は `Number` 化
- **C29-c**: レイド UI（1.5s ポーリング + 4Hz 局所クロック、ボス HP バー、貢献度サイドバー、ログ末尾追従）+ `/town` 出現バナー
- **C29-d**: パーティ多様性シナジー（alive jobCategory ユニーク 3 で防御 +10% / 5 で +20%）、レイド系アチーブメント 4 種（`raid_first` / `raid_top_dmg` / `raid_5_kills` / `raid_legend`）、デイリーチャレンジ `raid_join` 追加
- 触ったファイル: `src/lib/raid.ts` (新規), `src/app/raid/[id]/{page.tsx,Client.tsx}` (新規), `src/lib/battle.ts` / `achievements.ts` / `dailyChallenge.ts`

## Cycle 28 — 中盤密度: テーマ別ダンジョン + Mastery + Daily (2026-04-29)

Lv25-50 の中盤コンテンツを一気に増量。

- テーマ別ダンジョン 5 種（忘却の図書館 / 霜帝の塔 / 鏡映の湖底 / 灰の唄の祭壇 / 鐘塔の地下）。固有ボス・伝説確定タイプあり
- Mastery クエスト 27 種（9 archetype × 3 tier）。Lv15/30/45 で順次開放、報酬は永続 stat 強化 + T3 専用称号
- デイリーチャレンジ 7 種テンプレから毎日 3 つ抽選。全クリで EXP+600 / G+500 + 隠し achievement
- 触ったファイル: `src/lib/themedDungeon.ts` (新規), `src/lib/mastery.ts` (新規), `src/lib/dailyChallenge.ts` (新規)

## Cycle 27 — TOP5 オンボーディング致命的修正 (2026-04-29)

新規プレイヤー摩擦の上位 5 件を解消。

- スキル説明ツールチップ追加 / 職業適性表を `/inventory` に常設
- HUD ナビにレベル / 解放ゲート表示
- クイズやり直し導線、モバイル HUD の縦積み崩れ修正
- `docs/team/ROADMAP_MAX.md` を新規作成、評価軸 8 軸 + Cycle 27-38 計画を策定

## Cycle 26 — 戦闘・コンテンツ深度の総合拡張 (2026-04-29)

- 状態異常 6 種化（沈黙 / 出血 / 呪い化を追加）+ 敵 → プレイヤー付与
- 週末ボス T1〜T3 の開放制（T1 撃破で T2、T2 で T3 開放、T2+ で 2 個ドロップ、T3 伝説確定）
- 攻城戦の narrative 戦況ログ、インベントリのソート・フィルタ、forge プレビュー、レート上位 1/5/10 自動称号、呪い解除 5 回称号
- 触ったファイル: `src/lib/battle.ts`, `src/lib/weeklyBoss.ts`, `src/lib/siege.ts`

## Cycle 24+25 — ギルド倉庫 + DM UI (2026-04-29)

- **C24**: `GuildStorageItem` テーブル追加。`/guild` に倉庫セクション、装備中以外 / 取引可アイテムを affix 含めて預け・引き出し
- **C25**: `/messages` ページ（スレッド一覧・履歴・送信）、HUD に未読バッジ、socket 受信通知（メタデータのみ送信、本文は API 経由）
- 触ったファイル: `src/lib/dm.ts` (新規), `src/app/messages/page.tsx` (新規), `prisma/schema.prisma`

## Cycle 23 — 戦闘の途中参加・離脱 (2026-04-29)

- 同パーティ員は active な通常戦に参戦可能、参戦中は HP/MP を持って離脱可能（以降の報酬は失効）
- ボス戦・ダンジョン戦は対象外
- 触ったファイル: `src/lib/battle.ts`, `src/app/api/battles/[id]/join/route.ts`

## Cycle 21 — テンプレ大量生成路線 (2026-04-29)

C21 当初の AI プロバイダ実装方針を **DROPPED**、テンプレ事前大量生成へ切替（A〜D の 4 サブサイクル）。

- **C21A**: テンプレプール拡張（jobs 653→4957、rumors 14→39、roles 8→20）
- **C21B**: 大量シード（115 towns / 564 NPCs / 1720 jobs / 5039 skills / 848 items / 14 castles）
- **C21C/D**: 76 achievements / 96 affixes / 拡張ボス・ダンジョンプール
- 触ったファイル: `prisma/seed.ts`, `src/lib/generation/templates.ts`, `src/lib/affixes.ts`

## Cycle 20 — モバイル対応 HUD (2026-04-29)

- 小画面で「街・所持品・戦闘・PT」の 4 つのみ常時表示、それ以外は collapsible メニューに収納
- 触ったファイル: `src/components/HudMenu.tsx` (新規), `src/components/Hud.tsx`

## Cycle 19 — シーズン自動切替 (2026-04-29)

- `Season.expectedDurationDays` 追加、30 日経過 / 謎解明 +7 日で次シーズンへロールオーバー
- Season 2 (鏡の森) / Season 3 (灰の唄) のテンプレート同梱
- 触ったファイル: `src/lib/seasonRotation.ts` (新規), `src/lib/worldstate.ts`, `src/lib/mystery.ts`

## Cycle 18 — インベントリ装備比較 (2026-04-29)

- 各装備の下に「装備中比 攻 +3 防 -1 魔攻 +2」を緑/赤で表示
- 適性ペナルティを反映した実効ボーナスでの diff
- 触ったファイル: `src/app/inventory/page.tsx`

## Cycle 17 — NPC が訪問者を覚えている (2026-04-29)

- `Npc.lastSpokenName` / `lastSpokenAt` / `visitCount` 追加
- 30 分以内の他訪問者を NPC 台詞末尾に追記
- 触ったファイル: `prisma/schema.prisma`, `src/app/town/page.tsx`

## Cycle 16 — 闘技場 ELO レート (2026-04-29)

- `Character.duelRating` (default 1500) 追加、`/api/pvp/duels/[id]/accept` で K=32 ELO 更新（transaction）
- ランキング・1 クリック挑戦相手は ±200 rating の適正帯マッチング
- 触ったファイル: `prisma/schema.prisma`, `src/app/pvp/page.tsx`

## Cycle 15 — 攻城戦 MVP (2026-04-29)

- `SiegeEvent` に status / winningGuildId / `SiegeRegistration` を追加
- 24h 登録窓 + 3h 戦闘窓 + 自動決着（lazy advance）、勝利ギルドはサーバー全体告知 + `CastleOwnership` 更新
- 触ったファイル: `src/lib/siege.ts` (新規), `src/app/siege/page.tsx` (新規)

## Cycle 14 — アダプティブチュートリアル (2026-04-29)

- `Character.tutorialState` 追加、6 段階のヒントを行動履歴から自動選択
- 触ったファイル: `src/lib/tutorial.ts` (新規), `src/app/town/page.tsx`

## Cycle 13 — クエスト多様化 (2026-04-29)

- `QUEST_TEMPLATES` を 3 → 10（defeat / collect / explore / endure）
- `battle.ts` で `win_battles` / `collect_drop` / `defeat_enemy` を tick、`towns/[id]/move` で `visit_town` を tick
- 触ったファイル: `src/lib/quest.ts`, `src/lib/generation/service.ts`

## Cycle 12 — 鍛冶 (アフィックス加工) (2026-04-29)

- Reroll / Upgrade、5 素材消費、ティア別ゴールド
- 触ったファイル: `src/lib/forge.ts` (新規), `src/app/forge/page.tsx` (新規)

## Cycle 11 — 戦闘状態異常 (2026-04-29)

- `EnemyState` に `statuses[]` を追加（poison / burn / stun）
- debuff スキルは必中、attack スキルのクリ時 50% 確率付与
- 触ったファイル: `src/lib/battle.ts`

## Cycle 10 — アチーブメント / 称号 (2026-04-29)

- `Achievement` / `CharacterAchievement` モデル + 15 種シード
- battle / curse / duel / mystery / guild / dungeon にフック、HUD 称号表示
- 触ったファイル: `src/lib/achievements.ts` (新規), `src/components/Hud.tsx`

## Cycle 9 — 街に「最近の世界の出来事」(2026-04-29)

- `/town` に最新 5 件の `Announcement` を表示
- 触ったファイル: `src/app/town/page.tsx`

## Cycle 8 — 本日のボス (2026-04-29)

- `Battle` に `kind` / `bossSlug` 追加、日付決定論的なボス生成
- パーティ単位 1 日 1 回、初討伐告知 + 確定 epic/legendary
- 触ったファイル: `src/lib/boss.ts` (新規), `src/app/boss/page.tsx` (新規)

## Cycle 7 — 日次 WorldState (2026-04-29)

- 日付ごとの WorldState を lazy 生成（静穏 / 不穏 / 祝祭 / 凶兆 + 弱点属性 + ヘッドライン）
- 触ったファイル: `src/lib/worldstate.ts` (新規)

## Cycle 6 — 決闘 PvP UI 完成 (2026-04-29)

- `/pvp` 全面リライト（受信中 / 送信中 / 最近の決闘の分離、近レベル相手のサジェスト、戦績カード、勝利数ランキング）
- 装備 + アフィックス効果（crit / lifesteal）が決闘シミュにも反映
- 触ったファイル: `src/app/pvp/page.tsx`

## Cycle 5 — 呪い職を物語化 (2026-04-29)

- 呪い就任 / 解除のサーバー告知、解除協力者全員に 200G、`/curse` で名簿
- 触ったファイル: `src/app/curse/page.tsx` (新規), `src/lib/jobs.ts`

## Cycle 4 — 戦闘深度 (crit / lifesteal / slay / regen) (2026-04-29)

- アフィックスに structured `SpecialEffect[]` (crit_rate / crit_damage / lifesteal / post_battle_regen / speed_aura / slay)
- 敵に `creatureType` を推論付与、`applyEffects` で crit + slay + lifesteal を適用
- 触ったファイル: `src/lib/battle.ts`, `src/lib/affixes.ts`

## Cycle 3 — ハクスラドロップ + 装備システム (2026-04-29)

- `InventoryItem` に per-instance フィールド（`displayName` / `instanceJson`）
- 武器カタログ拡張 35+、職業適性、4 ティア affix（Common/Rare/Epic/Legendary）、特殊効果フレーバー 18 種
- Equip/Unequip API、`/inventory` UI、`computeCombatStats` で装備込みステータス計算
- 触ったファイル: `src/lib/affixes.ts` (新規), `src/lib/equipment.ts` (新規), `src/app/inventory/page.tsx` (新規)

## Cycle 2 — 世界が個に応える + 戦闘ループ (2026-04-29)

- EXP 曲線平準化（`expForLevel` を `15·level^1.6 + 30·level`）、敵報酬の超線形スケール
- 連戦ボーナス（3 連勝以上で EXP+20% / Gold+10%）、装備ドロップ最小実装
- 噂 / NPC 台詞への季節キーワード染み込み、3 街 × 3 NPC をシード
- 触ったファイル: `src/lib/leveling.ts`, `src/lib/battle.ts`, `src/lib/mystery.ts`

## Cycle 1 — 専門家 4 名による初回評価 (2026-04-29)

- 企画 / 数値 / 物語 / 技術の 4 視点で MVP を評価、戦略結論「世界が個に応える」を策定
- `docs/team/MISSION.md` / `ROADMAP.md` / `BACKLOG.md` を新設

## 初期実装 — Text RPG MVP end-to-end (2026-04-28)

- アカウント / キャラ / 街 / 戦闘 / パーティ / ギルド / オークション / PvP / ダンジョン / 管理者 一式
- 職業診断クイズ / シーズン謎 / ダンジョン / 自動戦闘
- Next.js 14 (App Router) + Socket.io + Prisma (SQLite 既定)

---

## Deferred / Dropped

- **Cycle 22 — Postgres + Redis 移行検証** (DEFERRED): リリース直前まで保留
- **Cycle 21 当初案 — AI プロバイダ実装** (DROPPED): API 課金 + レイテンシのコストがテンプレ方式の体験価値を超えると判断、テンプレ大量生成路線に方針変更
- **本決済 Stripe 差し替え** (DEFERRED): 公開直前
- **法務（年齢レーティング 15+ / 利用規約）** (DEFERRED): 公開直前
