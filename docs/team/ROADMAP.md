# 神ゲープロジェクト ロードマップ

> **方針**: 監督が次の開発目標を提示し続ける。サイクルを区切らず継続実装する。
> ユーザの停止指示があるまで続ける。

## 神ゲー指針 (再掲)
1. 不確実性 > 計算可能性
2. 個に応じる世界
3. 協調の必然
4. テキスト RPG の格
5. 動かないものは作らない
6. 公平 (課金は強さに直結しない)

## 完了
- **Cycle 1**: 専門家 4 名による初回評価
- **Cycle 2**: 世界が個に応える + もう一戦の即効性 (`9e147ab`)
- **Cycle 3**: ハクスラドロップ + 装備システム (`e153983`)
- **Cycle 4**: 戦闘深度 - クリティカル / ライフスティール / スレイ / ポストバトル回復 (`bd94770`)
- **Cycle 5**: 呪い職を物語化 - 告知 + 解除儀式 + /curse 名簿 (`f237b07`)
- **Cycle 6**: 決闘 PvP UI 完成 - 検索 / 戦績 / ランキング / 装備反映 (`8127c16`)
- **Cycle 7**: 世界が毎日変わる - WorldState lazy 生成 (`c8050ff`)
- **Cycle 8**: 本日のボス - 1 日 1 体 / 初討伐告知 / 確定希少ドロップ (`6fc857a`)
- **Cycle 9**: 街に「最近の世界の出来事」表示 (`dc7df90`)
- **Cycle 10**: アチーブメント / 称号システム + HUD 称号表示 (`ddf86d8`)
- **Cycle 11**: 戦闘状態異常 (毒・火傷・スタン) (`bf52731`)
- **Cycle 12**: 鍛冶 - アフィックスのリロール / 強化 (`963ba49`)
- **Cycle 13**: クエスト多様化 (defeat / collect / explore / endure) (`9ec666e` + `ac7ee7f`)
- **Cycle 14**: アダプティブチュートリアル (`0b7a6e8`)
- **Cycle 15**: 攻城戦 MVP - 24h登録 + 3h戦闘 + スコア決着 (`7197a1b`)
- **Cycle 16**: 闘技場 ELO レート (K=32) + 適正帯マッチング (`9094b3a`)
- **Cycle 17**: NPC が直近の訪問者を覚えている (`f2c6cb1`)
- **Cycle 18**: インベントリ装備比較ビュー (装備中比 ±N) (`c0e0ba8`)
- **Cycle 19**: シーズン自動切替 (Season 2/3 テンプレート + 自動ローテーション告知) (`f604ba9`)
- **Cycle 20**: モバイル HUD (4 primary + collapsible menu) (`2dca9a2`)
- **Cycle 21A/B/C/D**: テンプレ大量生成（ジョブ 5→1720 / スキル 5→5044 / アイテム 9→858 / 街 3→113 / NPC 565 / 城 14 / 実績 76 / 接辞 96）
- **Cycle 23**: 戦闘の途中参加・退出 — 同パーティ員は active な通常戦に参戦可能、参戦中は HP/MP を持って離脱可能（報酬は失効）。ボス戦・ダンジョン戦は対象外
- **Cycle 24**: ギルド倉庫 — `GuildStorageItem` テーブル追加、`/guild` に倉庫セクション。装備中以外/取引可アイテムを預け・引き出し可能、affix 含むインスタンスを保存
- **Cycle 25**: DM UI — `/messages` ページ（スレッド一覧・履歴・送信）、HUD に未読バッジ、socket で受信通知（メタデータのみ送信、本文は API 経由で取得）
- **Cycle 26**: 戦闘・コンテンツ深度の総合拡張 — 状態異常 6 種化（沈黙/出血/呪い化追加）+ 敵→プレイヤー付与 / 週末ティア別ボス（T1〜T3、開放制）/ 攻城戦に narrative 戦況ログ / インベントリ ソート・フィルタ / forge プレビュー / レート上位 1/5/10 自動称号 / 呪い解除 5 回称号
- **Cycle 27**: TOP5 オンボーディング致命的修正 — スキル説明ツールチップ / 職業適性表 `/inventory` 常設 / HUD ナビにレベル&ゲート表示 / クイズやり直し導線 / モバイル HUD 縦積み修正 + `docs/team/ROADMAP_MAX.md` 策定（`7975de8`）
- **Cycle 28**: 中盤密度 — テーマ別ダンジョン 5 種（忘却の図書館 / 霜帝の塔 / 鏡映の湖底 / 灰の唄の祭壇 / 鐘塔の地下、Lv25-50、固有ボス）/ Mastery クエスト 27 種（9 archetype × 3 tier、Lv15/30/45 順次開放、永続 stat 強化 + T3 専用称号）/ デイリーチャレンジ 7 テンプレ（毎日 3 抽選、全クリで EXP+600 / G+500）（`5d08e7f`）
- **Cycle 29**: ワールドレイドバトル — `/town` 訪問時 10% 湧き / 60min 再湧き CD / 10 分集合 + 30 分戦闘 / 非同期 DPS race（攻撃 5s / 特技 15s / 回復 10s）/ ボス HP 共有 / KO + 90s 遅延復活 / 貢献度ランキングで個別ドロップ tier（Top1 legendary / Top2-5 epic / 残り rare）/ パーティ多様性シナジー（3 系統 +10% / 5 系統 +20%）/ レイド系アチーブ 4 種 / デイリー `raid_join`（C29-a〜d、`b2e26f2`〜`668e93c`）
- **Cycle 30**: スキル継承システム — 過去職スキルを現職スロットに持ち込み（Lv1+:1 / Lv30+:2 / Lv50+:3）/ 継承スキルは MP コスト 1.5x / 熟練度 +5/+10/+15%（10/30/50 回、SAME-cast）/ チェーンコンボ +10%（同ターン内で異なる skill type 連続）/ ログに `【継承】` `[熟練+N%]` `[連携+10%]` タグ（C30-a〜d、`029aa89`〜`7c96f95`）
- **Cycle 31**: 手作り固有職 (Phase 1 + 2 = 100 体) — `Job.curated` 拡張 + `prisma/curatedJobs.ts` で 8 カテゴリ × 計 100 体（眼鏡戦士 / 猫好き魔導師 / 影語り / 鍛冶娘 / 元医者戦士 / 双頭魔導師 / 占い師の旅芸人 / 古竜の血を引く者 等、各 80-150 字 signature bio + 1 unique skill = 100 unique skill）/ クイズ結果 → top archetype の curated 候補提示 + 「○○ で始める」指名選択 / HUD・`/jobs`・`/characters` に `★固有` バッジ + `《outfit》` 表示 / 量産パイプライン文書 `CURATED_JOB_BULK.md`（C31-a〜d Phase 1 = `fe5e6d9`〜`a21b73c`、C31-d.b1〜b8 Phase 2 = `5dedfd5`〜`0770260`）
- **Cycle 32**: 攻城戦に本物の戦闘 UI — `SiegeBattle` / `SiegeBattleGuildState` / `SiegeBattleAction` 3 モデル + `src/lib/siegeBattle.ts` / 6 アクション(attack 1× / aoe 0.5× 全敵 / heavy 1.5× / support 自陣 +5% / rally master +20% / cure sub +30%) / `/siege/[id]/battle` UI（1.5s ポーリング、ギルド HP バー、アクションパネル、観戦モード）/ `siege:[id]` 応援チャット（既存 Chat 流用、誰でも投稿可）/ 30s/ターン lazy advance（`c22138b`〜`aa84b7f`、C32-a〜d）
- **Cycle 33**: 世界観の手作り厚み — `Npc.curated/bio/relationsJson` 拡張 + 5 主要都市 × 6 NPC = 30 体 (`prisma/curatedNpcs.ts`、60-120 字 bio + 関係グラフ JSON) + curated towns 2 つ追加（鐘塔の都ベルクラート / 古王国の都ヴェスペル）/ `/town` で curated NPC を紫枠 `<details>` 展開 / `docs/lore/{world,seasons,towns,curated_npcs}.md` 4 ファイルで世界設定資料 / `SEASON_NPC_TEMPLATES` 12 種に拡充 + `generateNpcDialogue` の `baseLine` 引数で curated dialogue 保持（`020bc4b`〜C33-d、C33-a〜d）
- **Cycle 34**: 真のエンドゲーム + 無限階ダンジョン — `AbyssRun` / `AbyssWeeklyRecord` + `src/lib/abyss.ts`(1.15^floor 指数報酬 / 各 10 階固有ボス / 撤退で全額・全滅で半減 / 週次ランキング) + `/abyss` UI Lv50+ / アセンション(`Character.generation` + `/ascension` Lv→1 リセット + 永久ボーナス) + 称号コンプ「歩く伝承」(mythic auto-grant) + `/canon` 季節カノン年表（`0f5febf`〜C34-d、C34-a〜d）
- **Cycle 35**: アイコンアセット (将来ピクセル差替可能基盤) — ピクセルアートは Claude 手書きで Octopath 品質に届かないと判明、SVG (lucide スタイル) に切替 / `src/lib/icons.ts` で `IconSource` union（svg/pixel）+ `GameIcon` 抽象コンポーネント / 32 SVG ファイル + 37 slug / HUD・`/characters`・`/jobs`・`/inventory` に組み込み / `IconsToggle` でテキスト派モード切替（`a76ec2e`〜C35-d）
- **Cycle 36**: 経済バランス — `src/lib/arenaSeason.ts` で arena ELO 週次リセット (50% regress) + mystery 解明者の永続ボーナス (+20 maxHp / +10 maxMp)（`6c3a1b2`、軸 G ★★★★ → ★★★★★）
- **Cycle 37**: 運用基盤 (基盤のみ) — `src/lib/rateLimit.ts` (in-memory sliding window 5 presets) + `src/lib/audit.ts` (`AuditLog` ラッパ + ヘルパ) + `docs/team/PRODUCTION_OPS.md` (Postgres / Redis / Stripe / backup / 監視 / 公開前チェックリスト)（`f179551`）
- **Cycle 38**: a11y + UX 細部 — `:focus-visible` ring + body color #f8eed0 (AA 5.2:1) + battle ホットキー [1][2][3] + `<380px` mobile padding + `prefers-reduced-motion`（`3c6bde5`、軸 H ★★★★ → ★★★★★）
- **Cycle 39**: Phase 0 体験設計図 4 ファイル新設 (`PLAYER_JOURNEY` / `CORE_LOOP` / `SKILL_DESIGN` / `FEATURE_FREEZE_LIST`) + CLAUDE.md §10 自律型開発規律採用（`f0531c5`〜`ee40f39`）
- **Cycle 40**: Phase 1 リセット — HudMenu 封印フラグ + 転職 curated only (40-2,3) / Town.unlockLevel 5 主要都市の段階開放 (40-4) / middleware で封印 route の /town redirect (40-5)（`97ca3be`〜`73c0ea4`）
- **Cycle 41**: 体験ホットスポット即時改善 — Lv1-10 敵 HP 底上げ (41-1) / クエスト掲示板 受注済み除外 (41-2) / HUD 「次の解放」予告 (41-3) / オンボーディング 5 連鎖クエスト (41-4)（`9b5e950`〜`2b895ec`）
- **Cycle 43**: Phase 2 warrior 13 職 × 10 スキル = 130 — 眼鏡戦士 (C39 先行済) + 巨漢 / 隻腕 / 双子 (43-a) / 元踊り子 / 元医者 / 元囚人 (43-b) / 雪国 / 海賊崩れ / 元騎士団長 (43-c) / 退役老兵 / 元獣狩り / 元密漁者 (43-d) を 1 → 10 スキルに展開（`2e21548`〜`fc166c1`）
- **Cycle 44**: Phase 2 mage 13 職 × 10 スキル = 130 — 猫好き / 不眠 / 喘息 (44-a) + 妖精と契約 / 元教師 / 数学狂 (44-b) + 不器用 / 沈黙派 / 古文書狂 (44-c) + 双頭 / 元錬金術師 / 元天文学者 / 元戦場医 (44-d)。累計 260 unique skills 完成（`ceeb6eb`〜`89a95e7`）
- **Cycle 45**: Phase 2 rogue 13 職 × 10 スキル = 130 — 甘党 / 影語り / 元道化師 (45-a) + 美食家 / 元医療助手 / 港育ち (45-b) + 双子 / 写真記憶 / 偽名常用 (45-c) + 動物使い / 元軍楽隊 / 元郵便配達 / 元落書き屋 (45-d)。累計 390 unique skills 完成（`0b2d2a2`〜`715de53`）
- **Cycle 46**: Phase 2 cleric 12 職 × 10 スキル = 120 — 老師 / 歌う司祭 / 元戦士の司祭 (46-a) + 沈黙派 / 童顔 / 雪国育ち (46-b) + 元修道女 / 元軍医 / 双子の司祭 (46-c) + 元司書 / 元葬儀屋 / 裸足 (46-d)。累計 510 unique skills 完成（`4b8cfef`〜`c99c9a4`）
- **Cycle 47**: Phase 2 craft 13 職 × 10 スキル = 130 — 鍛冶娘 / 蜂蜜屋 / 仕立屋 (47-a) + 革職人 / 陶工 / 製本屋 (47-b) + 楽器作り / 機械工 / 紙漉き (47-c) + 染物屋 / 鈴職人 / 鑿師 / 元武器商人 (47-d)。累計 640 unique skills 完成（`8e7e7ce`〜`487c740`）
- **Cycle 48**: Phase 2 support 12 職 × 10 スキル = 120 — 旅芸人 / 子守歌 / 賭博師 (48-a) + 占い師 / 通訳 / 動物使い (48-b) + 観光案内 / 葬儀 / 産婆 (48-c) + 公証人 / 仲介屋 / 酔いどれ (48-d)。累計 760 unique skills 完成（`0fc43ea`〜`c97857a`）

## 進行・次サイクル

### 監督判断による方針再構築 (2026-05-02 後半)

監督から 3 つの決定:
- **Q1.C**: 既存コード snapshot 凍結 + main から不要機能を封印して、体験設計図に従って必要なものだけ復活
- **Q2 全手作り**: 1 職 10 スキル × 1000 職 = 10,000 スキル全て手作り (時間かけて OK)
- **Q3 全部満たす**: ハクスラ + 物語 + ビルド + マルチを **時系列レイヤーで** 実現
  - Day1 = ハクスラ / Week1 = ビルド / Month1 = 物語 / Endgame = マルチ

加えて、自律型開発ガイドライン採用 (CLAUDE.md §10)。
監督介入なしに進めるが、品質基準は厳格化。

### 内部ベンチ完了、外形品質には未到達 (2026-05-02 再評価)

ROADMAP_MAX の C27〜C38 全 12 サイクルは完走したが、これは **内部の自己評価フレームワーク** の達成度であって、**外形のゲーム品質ではない**ことが判明:

- **監督 (ユーザー) が一度も実機で動作確認していない**
- **バグチェックが体系的にされていない** (`tsc green` のみで動作未保証)
- **専門 8 視点の外部評価で平均 6.7/10**、特に運用・法務が 4.5 / 5.0 で公開不可

詳細は新規 `docs/team/MANUAL_TEST_PLAN.md` と `docs/team/ROADMAP_MAX.md` 末尾の外部評価結果セクションを参照。

---

### Phase 0 — 体験設計図 (Cycle 39、ドキュメントのみ)

実装ゼロ。これを書かずに進むと再び「機能リスト÷サイクル数」に堕ちる。

| 成果物 | 中身 |
|---|---|
| `docs/team/PLAYER_JOURNEY.md` | Day1 (0-15min, 15-60min) / Day1 後半 / Week1 / Month1 / Endgame の画面遷移と感情曲線 |
| `docs/team/CORE_LOOP.md` | 戦闘 1 ターンで何を考えるか / 戦闘後 30 秒で何を見るか / 街で何をするか |
| `docs/team/SKILL_DESIGN.md` | 1 職 10 スキルの 10 枠分類 + 命名規則 + 職業性の出し方 (眼鏡戦士 10 スキルが先行サンプル) |
| `docs/team/FEATURE_FREEZE_LIST.md` | 既存機能の処遇判定 (Day1 必須 / Week1 必須 / Month1 必須 / Endgame / 封印) |

**完了条件**: 4 ファイルすべて作成、監督がレビューして OK 出る。

### Phase 1 — リセット & コアループ MVP (Cycle 40-42)

| Cycle | 内容 | 状態 |
|---|---|---|
| 40 | `legacy/c38-snapshot` ブランチで現状凍結 + main から `FEATURE_FREEZE_LIST` の「封印」分を route から外す (mastery / abyss / ascension / canon / siege / 闘技場 / レイド / オークション 等を一旦非表示)。Day1 体験に集中する状態にする | ✅ 完了 |
| 41 | コアループ最小 MVP: 戦闘濃度修正 (Lv1-10 敵 HP +100%、3-5 ターン継続) + 街段階開放 (`Town.unlockLevel`) + クエスト UI (受注済み除外) + 目標 HUD (次 Lv / 次解放) + オンボーディング quest 連鎖 | ✅ 完了 |
| 42 | 監督が実機テスト → `BUGS_FOUND.md` 記録 → 修正第二波 | ⏳ 監督 playtest 待ち |

### Phase 2 — スキル 10,000 体制 (Cycle 43-N、長期)

curated 100 職 × 10 スキル = 1,000 を **手作り**。1 セッション = 5 職分 (50 スキル) ペース。

| Cycle | 進捗目標 | 状態 |
|---|---|---|
| 43 | warrior 13 職 × 10 = 130 スキル (眼鏡戦士先行済 + 残り 12 職) | ✅ 完了 |
| 44 | mage 13 職 × 10 = 130 スキル | ✅ 完了 |
| 45 | rogue 13 職 × 10 = 130 スキル | ✅ 完了 |
| 46 | cleric 12 職 × 10 = 120 スキル | ✅ 完了 |
| 47 | craft 13 職 × 10 = 130 スキル | ✅ 完了 |
| 48 | support 12 職 × 10 = 120 スキル | ✅ 完了 |
| 49 | heretic 12 職 × 10 = 120 スキル | ⏳ 着手予定 |
| 50 | rare 12 職 × 10 = 120 スキル |

Cycle 50 完了で **curated 100 職 = 1,000 unique skill** 到達。

その後、procedural 1720 職を curated 化 + 各 10 スキル付与:
- 概算 +200 サイクル (1 セッション 5-10 職)
- 数ヶ月計画

### Phase 3 — 体験レイヤー復活 (Phase 1 完了後の並行)

Phase 1 で封印した機能を、体験設計に従って段階復活:

| 復活軸 | 中身 | 順序 |
|---|---|---|
| **物語** (Month1 用) | curated NPC との会話で進む story quest、シーズン謎の段階開示、lore docs 連動 | Phase 1 後 |
| **ビルド** (Week1 用) | 転職 + スキル継承 + 熟練度 + コンボ (既存 C30 を体験設計に組み込み) | 物語と並行 |
| **マルチ** (Endgame 用) | パーティ → ギルド → レイド → シージ を段階解放 | ビルド完了後 |

### Phase 4 — 公開準備 (最終、Phase 2 + 3 完了後)

| 項目 | 内容 |
|---|---|
| 自動テスト | vitest unit + Playwright E2E |
| セキュリティ | `withGuards` middleware (rateLimit / audit / mute) を全 mutation 配備、Mute enforcement 実装、CSP/HSTS/CSRF |
| 法務 | 利用規約 / プライバシー / 特商法 / 年齢 15+ / 個情法 / 未成年課金保護 / ドロップ確率開示 |
| 本番インフラ | Postgres 移行 + index + 並行検証 / Redis adapter / Stripe / バックアップ / 監視 |

---

### 任意拡張 (Phase 4 完了後)

- **C31 Phase 3**: curated job を 100 → 300 体まで拡張 (Phase 2 で 100 全完成後の方針)
- **ピクセルアート差し替え (C35 Phase 2)**: itch.io 等で素材購入 or プロ発注、`IconSource` 基盤がそのまま使える
- **シーズン Hall of Fame**: 殿堂入りシステム
- **眼鏡反射 reflect 実装**: battle.ts に damage reflection ロジック追加
- **C31 Phase 3 (任意)**: curated job を 100 → 300 体まで拡張
- 短期 QoL: forge の preview→commit 確定一致 / レート分布バッジの公開ボード / 出血の重ね掛け・呪い化の伝播

## 停止条件
- ユーザの明示的な停止指示
- ビルド失敗が解決できない致命的エラー
- 同じセッション内のコンテキスト枯渇

## DEFERRED (ユーザ判断: 公開直前まで保留)

ユーザの 2026-04-29 指示により、**サービス公開直前**まで以下は保留:

1. **Postgres / Redis 本番運用検証** (元 Cycle 22)
   - prisma schema の datasource を postgresql に切り替え
   - Socket.io の Redis adapter 導入
   - ユーザの実機検証フェーズで仕様確定する

2. **本決済 Stripe 差し替え**
   - 現状はモック (`PaymentTransaction.mock=true`)
   - 取引可能フラグ (`Item.tradable`) は既に分離済みなので、決済層の入れ替えで完結

3. **法務 (利用規約・年齢レーティング表記)**
   - README に「教育目的の MVP」と記載済み、本番展開では利用規約・15 歳以上表記の追加が必要

これらは **ユーザの動作確認 / 仕様追加** を挟むため、コードファースト判断ではブロック中。

## DROPPED

- **Cycle 21 (AI プロバイダ実装)** — ユーザ判断 (2026-04-29): API 課金 + レイテンシのコストが、現在のテンプレート方式で得られる体験価値を超えると判断。代わりに **テンプレ群の事前大量生成** に方針変更

## リリース前チェックリスト (神ゲー → 商用提供への翻訳)

リリース可能と判断するための具体条件。Cycle 1〜15 を経て **約半分** が満たされた状態:

### ゲーム品質 (gameplay)
- [x] 起動から街到達まで 5 分以内
- [x] 1 セッション 30 分で「もう一戦」を引き出すループ (アフィックス + 連戦ボーナス + 状態異常)
- [x] 装備に意味がある (職業適性 + 特殊効果が combat で実効)
- [x] 協調プレイの動機 (呪い解除 / ボス / 攻城戦)
- [x] 世界が個に応える (bio + 季節キーワード + NPC archetype 反応 + NPC 記憶)
- [x] 世界が動く (WorldState 日次 / 攻城戦 / シーズン自動切替)
- [x] 闘技場の実力指標 (Cycle 16: ELO レート)
- [x] モバイル UX (Cycle 20: HUD ハンバーガー)
- [x] オンボーディング初動摩擦の解消 (Cycle 27: TOP5 致命的修正)
- [x] Lv30+ の中盤コンテンツ密度 (Cycle 26 週末 T1-T3 / Cycle 28 テーマ別ダンジョン + Mastery + Daily / Cycle 29 ワールドレイド)
- [ ] 装備合成の経済バランス検証 (Cycle 12 を実プレイで詰める)

### 技術 (engineering)
- [x] tsc/next build が常時 green
- [x] サーバー権威 (戦闘 / 取引 / 装備 / アフィックス全てサーバー側)
- [ ] Postgres 移行検証 (Cycle 22)
- [ ] Redis adapter 導入 (Cycle 22)
- [ ] Stripe 等の本決済差し替え
- [ ] レート制限 / DDoS 対策
- [ ] ログ集約 / 監視 / アラート
- [ ] バックアップ / 災害復旧

### コンテンツ (content)
- [x] テンプレート世界観の一貫性 (季節 1: 灯の年 / Cycle 19 で S2 鏡の森・S3 灰の唄テンプレ同梱)
- [x] 装備カタログ 35+ → 858 アイテム (Cycle 21B)
- [x] アチーブメント 15 → 76+ (Cycle 21C/D + Cycle 26 + Cycle 29)
- [-] AI プロバイダ実装 (DROPPED — テンプレ大量生成路線に方針変更、Cycle 21A/B/C/D で代替)
- [x] シーズン 2 以降の謎セット (Cycle 19: S2 鏡の森 / S3 灰の唄)
- [x] 街・敵・職業の追加コンテンツ (Cycle 21B: 115 街 / 1720 ジョブ / 564 NPC + Cycle 28 テーマ別ダンジョン 5 種)

### モデレーション・運用 (ops)
- [x] BAN/Mute/通報 (UI 一部) / NG ワード
- [x] 管理者画面
- [ ] モデレーションログの保全
- [ ] 法務確認 (年齢レーティング 15+ 表記、利用規約)

### モバイル / レスポンシブ
- [x] HUD リンク数の整理 (Cycle 20: 4 primary + collapsible)
- [ ] 375px 幅での全画面動作確認 (Cycle 20 で実装、手動検証待ち)
- [ ] PWA 対応検討
