# ROADMAP_MAX — カバー状況を全軸 MAX に押し上げる総合計画

> 監査結果（前回レビュー）で得た 8 軸（A〜H）すべてを ★★★★★ にするための総合ロードマップ。
> 既存 ROADMAP.md は完了履歴と運用前提を扱う。本ドキュメントは「神ゲー化」のための未着手戦略を扱う。

---

## 評価軸と現状 → 目標

| 軸 | 現状 | 目標 | 主担当サイクル |
| --- | --- | --- | --- |
| A. コアループ | ★★★★★ | ★★★★★ | C29 ✅, C32 ✅ |
| B. キャラビルド | ★★★★★ | ★★★★★ | C30 ✅ (skill inherit), C31 ✅ (curated jobs Phase 1) |
| C. ハクスラ偶発性 | ★★★★★ | ★★★★★ (維持) | — |
| D. 物語・世界観 | ★★★★★ | ★★★★★ | C33 ✅ (curated NPC + lore docs) |
| E. 協調プレイ | ★★★★★ | ★★★★★ | C29 ✅ (raid), C32 ✅ (siege ops) |
| F. やりこみ・エンドゲーム | ★★★★★ | ★★★★★ | C28 ✅, C30 ✅, C34 ✅ (abyss + ascension + canon) |
| G. 公平・経済 | ★★★★☆ | ★★★★★ | C37 (rate-limit, monitoring) |
| H. UX・プレゼン | ★★★★☆ | ★★★★★ | C27 ✅, C35 ✅ (icon abstraction + 32 SVGs), C38 (a11y) |

---

## サイクル一覧（C27 〜 C38）

新規プレイヤーの離脱を止める順 → 中盤の摩擦を消す順 → 神ゲー化要素を積む順 で並べた。

---

### Cycle 27 — TOP 5 致命的修正（オンボーディングの壁を壊す）

**狙い**: 最初の 30 分で離脱されない状態にする。

1. **スキルのツールチップ / 説明文表示**（battle UI）
   - 既存 `Skill.description` を Battle Client に表示
   - select option に `title=` 属性、選択中スキルは下に詳細パネル
2. **職業適性表を `/inventory` に常設**
   - プレイヤーの archetype が扱う武器クラスを一覧表示（剣/大剣/槍/...）
   - 「この武器は適性◯/×」を装備候補に表示済 → 適性の理由を可視化
3. **HUD ナビをレベル/解放状態でゲート**
   - `/forge` Lv5+、`/siege` ギルド加入後、`/jobs` Lv10+、`/curse` 常時、`/dungeon` Lv3+
   - 未開放はグレーアウト + 「Lv X で開放」バッジ
4. **クイズの「やり直す」ボタン**
   - 確定前にもう一度回答を選び直せる
   - 「結果が気に入らないなら戻る」を許す
5. **モバイル HUD ステ表示の縦積み**
   - `<sm` で HP/MP/EXP を縦並びに、bar 幅を w-full に伸ばす

**指標**: 新規ユーザー離脱率 50% 減（想定）

---

### Cycle 28 — 中盤の離脱要因を全消し（Lv30-45 の密度を上げる）✅ DONE

**実装結果**:

1. ✅ **中盤限定の専用ダンジョン 5 種** — `src/lib/themedDungeon.ts`
   - 忘却の図書館 (Lv25-40, 5階, 魔属性)
   - 霜帝の塔 (Lv30-45, 6階, 構造体)
   - 鏡映の湖底 (Lv28-42, 5階, 獣)
   - 灰の唄の祭壇 (Lv32-45, 5階, 不死, 伝説確定)
   - 鐘塔の地下 (Lv38-50, 7階, 人型, 伝説確定)
   - `/dungeon` から選択可、最終階は固有ボス
2. ✅ **Mastery クエスト** — `src/lib/mastery.ts`
   - 9 archetype × 3 tier = 27 クエスト
   - Lv15/30/45 で順次開放
   - 報酬: 永続 stat 強化 + 専用称号 (T3)
   - `/mastery` ページ + HUD ナビ
3. ✅ **Daily チャレンジ** — `src/lib/dailyChallenge.ts`
   - 6 種テンプレ（敵討伐/戦勝/装備入手/ダンジョン踏破/G消費/街巡り）
   - 毎日 3 つランダム選出、進捗追跡
   - 全クリでボーナス（EXP+600 / G+500 + 隠し achievement）
   - `/town` 右サイドバーに常設
4. ✅ **進捗フック**: battle.ts / dungeon.ts / shop / forge / town に tick 配線

**未実装（C28.5 で別途）**:
- 週次レイドダンジョン → C29 と統合（ワールドレイドで代替）
- クエスト多様化フェーズ 2（「護衛」「奪還」「謎掛け」）

---

### Cycle 29 — 強制協調プレイ：レイド＋ワールドイベント ✅ DONE

**実装結果（C29-a/b/c/d 4 サブサイクル）**:

1. ✅ **ワールドレイドバトル（偶発遭遇型）** — `src/lib/raid.ts`
   - `prisma/schema.prisma`: `Raid` + `RaidParticipant` モデル
   - `/town` 訪問時に 10% で湧き、60min 再湧きクールダウン
   - 同じ街のプレイヤーが「参戦する」ボタンで合流（10 分集合 → 30 分戦闘）
   - 非同期 DPS race: 個別 CD（攻撃 5s / 特技 15s / 回復 10s）+ ボス HP 共有
   - KO + 90s 遅延復活、撃沈中は次アクションでレイジー復活
   - 既存の `computeCombatStats` / `computeCombatEffects` / `applyDamage` を流用 — crit/slay/lifesteal がそのまま乗る
   - 撃破時の貢献度ランキングで個別ドロップ tier 確定（Top1 legendary / Top2-5 epic / 残り rare）+ 与ダメに比例した EXP/Gold
   - 出現・決算で `Announcement` ブロードキャスト
   - 10 種のテンプレ（灰の唄を喰らう者 / 塔陰の長腕鬼 / 霜帝の落とし子 等）
2. ✅ **HTTP API 7 本** — `src/app/api/raids/...`
   - `GET /api/raids/active` / `GET /api/raids/[id]` / `POST /api/raids/[id]/{join,start,attack,skill,heal}`
3. ✅ **UI** — `src/app/raid/[id]/page.tsx` + `Client.tsx` + `/town` バナー
   - サーバコンポで初期 view、Client は 1.5s ポーリング + 4Hz ローカル時計
   - ボス HP バー / ランキング / 自分 HP/MP/CD / 攻撃・特技・回復ボタン / 戦闘ログ
   - 観戦は同じ街のプレイヤー or 参戦者のみ
4. ✅ **パーティ多様性シナジー** — `src/lib/battle.ts`
   - 通常戦闘の `resolveTurn` で aliveメンバーの jobCategory ユニーク数を集計
   - 3 系統で防御 +10%、5 系統で +20%（ログに表示）
5. ✅ **アチーブメント 4 種** — `src/lib/achievements.ts`
   - `raid_first` (common) / `raid_top_dmg` (rare title) / `raid_5_kills` (epic title) / `raid_legend` (legendary title, 5000 ダメ条件)
6. ✅ **デイリーチャレンジ `raid_join`** — `src/lib/dailyChallenge.ts`
   - 「今日 ワールドレイドに 1 回参戦する」テンプレ追加
   - `joinRaid` から自動 tick

**C29.5 にデファー**:
- ギルド討伐依頼（週次固有ボス）
- 戦闘中の救援システム（同パーティ外）
- シーズンの謎の協調ヒント
- AOE 化（`Raid.lastBossTickMs` 列追加とともに次回）

---

### Cycle 30 — スキル継承システム ✅ DONE

**狙い**: 転職時にキャラ独自性を作れる「自分だけのビルド」を許す。

**実装結果（C30-a/b/c/d 4 サブサイクル）**:

1. ✅ **継承スロットの基盤** — `prisma/schema.prisma`
   - `Character.inheritedSkillIds: String?` (JSON 配列)
   - `SkillProficiency(characterId, skillId, usageCount)` 新設、`@@unique([characterId, skillId])`
2. ✅ **スロット数 = レベル依存** — `src/lib/skillInherit.ts`
   - Lv1+: 1 / Lv30+: 2 / Lv50+: 3
   - `getInheritableSkills`: 過去職スキル − 現職 − 呪い職を返す
3. ✅ **`/jobs` UI に継承操作 + `POST /api/jobs/inherit`**
   - スロット数表示 + 職別グループのチェックボックス、編集モード
   - 保存時にスロット上限・継承可能セットでバリデーション
4. ✅ **戦闘統合** — `src/lib/battle.ts`
   - 継承スキルは MP コスト 1.5x（`Math.ceil(cost * 1.5)`）
   - スキル使用時に `tickSkillProficiency` で `(characterId, skillId)` の usageCount を加算
   - 戦闘 UI で `★`/紫枠の色分け、ログに `【継承】` タグ
5. ✅ **熟練度ボーナス +5/+10/+15%** — 同サイクル `battle.ts`
   - 10/30/50 回使用で発動（**SAME-cast**: 10 回目の使用そのものが +5%）
   - ログに `[熟練+N%]` タグ
6. ✅ **チェーンコンボ +10%** — 同サイクル `battle.ts`
   - 同ターン内で前者と異なる skill type を打つと +10% 威力
   - ログに `[連携+10%]` タグ

**スコープ調整**:
- 元プラン「異カテゴリは 1.5x、同カテゴリは等倍」→ 簡略化して「継承スキル全般 1.5x」に統一。職カテゴリ判定の追加 fetch を回避し、UX もシンプル
- 「同職カテゴリのみ継承可」制約は採用せず、過去職全部から選べる方が自由度高い

**指標**: 1 キャラあたりの平均ビルド数 +3（実プレイ評価待ち）

---

### Cycle 31 — 手作り固有職 (Phase 1 + 2 = 100 体達成) ✅ DONE

**狙い**: 「眼鏡戦士」「猫好き魔導師」のような、**愛着の湧く個性的な職**をテンプレ生成と分けて 100-300 体用意する。

**実装結果（C31-a/b/c/d 4 サブサイクル）**:

1. ✅ **スキーマ拡張** — `prisma/schema.prisma`
   - `Job` に `curated` / `quirk` / `signatureOutfit` / `signatureBio` / `pixelArtId` (C35 用) を追加
2. ✅ **`prisma/curatedJobs.ts`** — 8 カテゴリで Phase 1 として 12 体定義
   - 眼鏡戦士 / 巨漢戦士 / 猫好き魔導師 / 不眠魔導師 / 甘党盗賊 / 影語り / 老師 / 歌う司祭 / 鍛冶娘 / 旅芸人 / 禁書館の番人 / 星詠み
   - 各 80-150 字の signature bio（複数形 voice、職業 = クラス記述）+ signature outfit + 1 unique skill
3. ✅ **`src/lib/curatedJob.ts`** — getCuratedJobs / byName / byCategory / byQuirk / count
4. ✅ **`POST /api/characters/curated-suggestions`** — クイズ回答 → トップ archetype に合致する curated 職を返す
5. ✅ **キャラ作成 UI** — summary 画面に紫枠「あなたに似た固有職」セクション、各候補に「○○ で始める」ボタンで指名選択
6. ✅ **`POST /api/characters` 拡張** — `jobName` 明示時は curated 優先、`signatureBio` で quiz 由来 bio を上書き
7. ✅ **HUD / `/jobs` / `/characters` UI 統合** — `★固有` バッジ + 紫イタリック `《signatureOutfit》` 表示
8. ✅ **量産パイプライン定義** — `docs/team/CURATED_JOB_BULK.md`（JSON フォーマット / プロンプトテンプレ / 検証 / 投入手順）
9. ✅ **Phase 2 = 88 体 bulk 投入** — `prisma/curatedJobs.ts` を 8 バッチ (b1〜b8) に分けて拡張、計 100 体到達
   - warrior 2→13 / mage 2→13 / rogue 2→13 / cleric 2→12 / craft 1→13 / support 1→12 / heretic 1→12 / rare 1→12
   - 各 entry に 1 unique skill = 計 100 unique skill

**スコープ調整**:
- 元プラン「Phase 1 で 100 体」→ 実際は Phase 1 = フレームワーク + 12 体、Phase 2 = 88 体 bulk 投入の 2 段階に分け、合計 100 体達成
- pixel art ID は schema にだけ追加、実際のドット絵は C35 で連携

**指標**: ユーザの「愛着のある自キャラ」割合 +50%（実プレイ評価待ち / Phase 2 完了後にも再評価）

---

### Cycle 32 — 攻城戦に本物の戦闘 UI ✅ DONE

**狙い**: narrative log だけのシージに、プレイヤーの操作介入を入れる。

**実装結果（C32-a/b/c/d 4 サブサイクル）**:

1. ✅ **エンジン基盤** — `prisma/schema.prisma` + `src/lib/siegeBattle.ts`
   - `SiegeBattle` / `SiegeBattleGuildState` / `SiegeBattleAction` 3 モデル + `SiegeEvent.battle` 一対一
   - HP = `sum(level + wins/2)` をギルド単位の damage budget に（既存 score 式を流用）
   - 30s/ターン、ターン切れで自動 resolve、`finalizeRaidIfDue` パターンの lazy advance
2. ✅ **6 アクション**
   - 通常: attack (1×) / aoe (0.5× × 全敵) / heavy (1.5×) / support (自陣 +5%)
   - 特殊: rally (master、味方攻撃 +20%、1 戦闘 1 回) / cure (sub、自陣 +30%、1 戦闘 1 回)
3. ✅ **HTTP API** — `src/app/api/siege/[id]/battle/{route.ts,action/route.ts}`
   - GET: lazy-create 込みで view 取得（pending → active 遷移も `maybeAdvancePhase` で）
   - POST action: 6 アクション送信、エラーは engine の explicit code（`rally_requires_master` 等）を 400 で
4. ✅ **戦闘 UI** — `src/app/siege/[id]/battle/{page.tsx,Client.tsx}`
   - 1.5s ポーリング + 4Hz 局所クロックでターンカウントダウン
   - ギルドカード: HP バー（緑/黄/赤）+ 自陣ハイライト + rally/cure 使用済バッジ
   - アクションパネル（参戦者 + 自陣 alive のみ）+ 戦闘ログ末尾 30 件 + アクション一覧サイドバー
   - 観戦モード: 未参加 / 自陣陣形崩壊で read-only
5. ✅ **応援チャット** — `siege:[id]` チャンネル、既存 `Chat` コンポーネントを流用
   - `canAccess` で誰でも投稿可、レート制限 + 禁止語フィルタは継承

**スコープ調整**:
- 「ギルド単位で全員行動」→ 全員が 1 ターンに 1 アクション、ターン切れで自動進行する形に。全員提出の同時 resolve は副タイマーが煩雑なのでパス
- narrative log は SiegeEvent 終結ロジックでそのまま残し、戦闘 UI 上では戦闘ログ（`SiegeBattle.logJson`）が主役

**指標**: シージ参加率 +3 倍（実プレイ評価待ち）

---

### Cycle 33 — 世界観の手作り厚み ✅ DONE

**狙い**: 街・NPC・季節がテンプレ感を脱する。

**実装結果（C33-a/b/c/d 4 サブサイクル）**:

1. ✅ **スキーマ拡張 + 30 体 curated NPC** — `prisma/schema.prisma` + `prisma/curatedNpcs.ts`
   - `Npc.curated` / `bio` / `relationsJson` 追加
   - 5 主要都市 (アルダ / ミルレ / ヴェルナ / 鐘塔の都ベルクラート / 古王国の都ヴェスペル) × 6 NPC = 30 体
   - 各 NPC に 60-120 字の固有 bio + 関係グラフ ([{name, relation, note?}] の JSON)
   - curated towns 2 つ (ベルクラート / ヴェスペル) を legacy に追加
2. ✅ **`/town` 統合** — `src/app/town/page.tsx`
   - curated NPC は紫枠 `<details>` で展開、bio + 関係マップを表示
   - procedural NPC は従来表示、機能差は curated だけにバッジ
3. ✅ **シーズン 1-3 完成済（C19 で実装）+ lore docs** — `docs/lore/*.md`
   - `world.md`: 14 地方 + 5 都市 + 暦 + 宗教 + 古王朝の概説
   - `seasons.md`: シーズン 1-3 の中心の謎・7 手がかり・内部設定 + S4-S6 forward-look
   - `towns.md`: 5 主要都市の歴史 / 物語上の役割 / NPC 配属
   - `curated_npcs.md`: 関係グラフ ASCII 図 + クロスタウン隠し関係 + 命名規則
4. ✅ **NPC 季節ダイアログのバリエーション拡充** — `src/lib/generation/{templates.ts,service.ts}`
   - `SEASON_NPC_TEMPLATES` 12 種の追記文テンプレ（旧 1 種 → 12 種）
   - `generateNpcDialogue` に `baseLine` 引数追加 — curated NPC の固有 dialogue を保ちつつ季節キーワードを上乗せ

**スコープ調整**:
- 「シーズン 2/3 の謎セット」は C19 (seasonRotation.ts) で既出だったため、C33 では確認のみで再実装せず
- NPC 関係グラフは別テーブル化せず JSON 列で持つことで FK 整合のオーバーヘッドを回避

**指標**: 「世界に厚みがある」感想率向上 — 30 NPC × bio + lore 4 ファイル + 関係グラフで充足

---

### Cycle 34 — 真のエンドゲーム + 無限階ダンジョン ✅ DONE

**狙い**: Lv50 以降の「やる事がある」を作る。

**実装結果（C34-a/b/c/d 4 サブサイクル）**:

1. ✅ **無限階ダンジョン「奈落」** — `prisma/schema.prisma` + `src/lib/abyss.ts`
   - `AbyssRun` + `AbyssWeeklyRecord` モデル + `Battle.abyssRunId` リレーション
   - 1.15^floor の指数報酬曲線、+1 level/floor の難度曲線
   - 各 10 階で固有ボス（`ABYSS_BOSSES` 10 体ローテーション）
   - `battle.ts` の win 経路で `onAbyssBattleEnded(true)` → 報酬累積、defeat で `(false)` → 累積半減 + 死亡
   - `retreatAbyss`: 全額持ち帰り、battle 中はブロック
   - ISO 週ごとの `AbyssWeeklyRecord` で max floor / total gold / attempts を記録
2. ✅ **`/abyss` UI + HTTP API** — `src/app/{api/abyss/{enter,advance,retreat}/route.ts,abyss/{page.tsx,Client.tsx}}`
   - 3 状態（no run / active / battle live）に応じた CTA
   - 「★ボス階」予告、累積表示、後退戻り、週次ランキング Top20
   - HUD 「奈落」リンク Lv50+ ゲート
3. ✅ **アセンション（転生）** — `src/lib/ascension.ts`
   - `Character.generation` + `ascensionBonusJson` 拡張
   - Lv50 から「世代を進める」選択、Lv→1 リセット + 永久ボーナス（+5 HP/+2 atk/+2 mat 等 × 世代数）
   - 称号 / アチーブ / インベントリ / ギルドは引継ぎ、呪い職中は不可
   - `/ascension` UI（2 段階確認）+ `POST /api/character/ascend` + Announcement broadcast
4. ✅ **称号コンプ報酬「歩く伝承」** — `src/lib/achievements.ts`
   - mythic + hidden の `title_collector` 追加
   - `awardAchievement` 末尾で「全非メタ称号取得済」を check して auto-grant
5. ✅ **季節カノン `/canon`** — `src/app/canon/page.tsx`
   - 過去〜現在の全シーズンを年表表示（中心の謎 / 解明者名 / 解明日）
   - 状態別 border カラー（amber=current / green=solved / gray=unsolved past）

**スコープ調整**:
- 「シーズン総決算 Top10 殿堂入り」は schema 未追加で C34 では除外。`/canon` の枠組みだけ用意し、Hall of Fame モデルは将来 (C36+) で導入予定
- 奈落のボス階は battle.ts の boss-tag を流用せず、難度 + reward 曲線の指数化のみで「ボス感」を出す簡略化

**指標**: Lv50 後継続プレイ率 +30%（実プレイ評価待ち）

---

### Cycle 35 — アイコンアセット (将来ピクセル差替可能基盤) ✅ DONE

**狙い**: 「テキストだけ」の視覚的単調さを破る。Cycle 35 で挑戦したピクセルアートはユーザー判断 (2026-05-02) で「Claude 手書きでは Octopath Traveler 系の品質に届かない」と認め、SVG アイコン (lucide スタイル) に切替。**将来ピクセル化に差し替え可能な抽象基盤**だけは残し、当面は SVG で H 軸を押し上げる方針へ。

**実装結果（C35-a/b/c/d 4 サブサイクル）**:

1. ✅ **アイコン抽象基盤** — `src/lib/icons.ts` + `src/components/GameIcon.tsx`
   - `IconSource` union: `{ kind: "svg"; src }` / `{ kind: "pixel"; gridId }`
   - `ICON_REGISTRY` で slug → IconSource を map
   - 将来 1 slug をピクセル化したい場合、Registry の 1 行を `kind: "pixel"` に書き換えるだけで全画面差し替え可能（消費側無変更）
2. ✅ **SVG カタログ 32 ファイル / 37 slug** — `public/icons/`
   - 武器 12 (sword/greatsword/spear/dagger/bow/staff/rod/wand/drum/flute/hammer/flail)
   - 防具 6 + 装飾 2 (helmet/chest/arms/legs/boots/shield + ring/amulet)
   - 職業 9 (warrior/mage/rogue/cleric/craft/support/heretic/rare/cursed)
   - 敵 5 (humanoid/beast/undead/magic/construct)
   - 状態 3 (boss/curse/legendary)
   - lucide スタイル 24×24 線画、palette は既存 UI 色味と整合
3. ✅ **UI 統合** — HUD / `/characters` / `/jobs` / `/inventory`
   - 現職 archetype アイコン、過去職アイコン、装備の slot/weaponClass アイコン
   - `iconSlugForItem(slot, weaponClass)` で slot → slug マッピング
4. ✅ **テキスト派トグル** — `src/components/IconsToggle.tsx`
   - localStorage で persist、`<html>` に `.no-icons` クラス
   - `globals.css` で `.no-icons .game-icon { display: none }` で全アイコン非表示
   - HUD 右下に常時設置

**スコープ調整**:
- 「ボス固有ドット絵 30+ 体」は手書き品質の壁により撤回。将来 (P3) で itch.io 等の素材購入 or プロ発注で実現
- 「サイズ階層 16/32/48/64」は SVG なら scale free のため不要、size prop だけで対応
- 検証用 `docs/pixel_samples.html` は判断材料として作成、最終的に `docs/archive/` に退避

**指標**: 配信映え / SNS 拡散性 ↑（将来ピクセル化で再評価）

---

### Cycle 36 — エンドゲーム経済バランス

**狙い**: forge / arena / mystery / boss の報酬曲線を平坦化。

1. **forge 強化失敗時の補填**
2. **arena ELO シーズンリセット + 上位報酬装備**
3. **boss tier ごとの装備 affix プール分離**
4. **mystery 解明者専用ボーナス**

---

### Cycle 37 — 運用基盤（公開直前必須）

**狙い**: 公開前に潰さねばならないインフラ。

1. **Postgres 移行検証** (DEFERRED 解除)
2. **Redis adapter for Socket.io**
3. **Rate limiting 全 endpoint** (per-character/IP)
4. **AuditLog 完全化** (全戦闘・取引・装備変更)
5. **Backup / DR 計画**
6. **Stripe 本決済（モック差し替え）**

---

### Cycle 38 — アクセシビリティ + UX 細部

**狙い**: H 軸を ★★★★★ に。

1. **WCAG AA 準拠**：コントラスト・フォーカスリング
2. **キーボードナビ**：戦闘画面のホットキー (1=攻撃, 2=スキル, 3=防御)
3. **モバイル 375px 完全対応**：全パネル個別調整
4. **多言語対応の素地**：i18n フックだけ用意
5. **SE / BGM**（任意トグル、軽量 OGG）

---

## 優先順位（緊急度 × 効果）

| 優先 | サイクル | 理由 |
| --- | --- | --- |
| **P0** | C27 | 新規離脱を止めないと他施策が無意味 |
| **P0** | C28 | 中盤離脱を止めないと 1 週間で過疎化 |
| **P1** | C29 | 強制協調がコミュニティの粘着剤 |
| **P1** | C30 | やりこみの代表機能、ビルド遊び |
| **P1** | C31 | 「自分だけの職」が愛着の核 |
| **P2** | C32 | シージ盛り上げ、エンドゲーム要素 |
| **P2** | C34 | Lv50 後の vertical 進行 |
| **P2** | C35 | 視覚刺激、配信映え |
| **P3** | C33 | 世界の厚み |
| **P3** | C36 | バランス調整 |
| **P0+** | C37 | リリース前必須 |
| **P3** | C38 | 仕上げ |

---

## ドット絵パイプライン詳細メモ（C35）

```
public/sprites/
├── jobs/warrior_01.svg       (16x16)
├── enemies/beast_01.svg      (32x32)
├── equipment/sword_01.svg    (24x24)
└── ...
```

`src/lib/pixel.ts`:
```ts
export function pixelMapToSvg(pixels: string[][], scale = 4): string {
  // 2D 配列の色コードを <rect> で描画
}
```

Claude プロンプト形式（Phase 1, 100 体生成）:
```
出力: JSON 配列。各要素は { id, name, category, baseStats, bio, palette: ["#fff","#000",...], pixelMap: [[0,0,1,...],...] }
特徴: 個性的な名前と背景。例「眼鏡戦士・パセリ」「猫好き魔導師・ミナ」
制約: 16x16、palette は最大 8 色。
```

---

## 進行管理

- 各サイクルは独立してリリース可能な単位
- 完了したらこのドキュメント先頭の表を更新
- 旧 `docs/team/ROADMAP.md` の Cycle 1-26 履歴は維持

---

## 受け入れ基準（神ゲー化の MAX 判定）

全 8 軸が以下を満たすまで継続:

- A: 戦闘で「もう一戦」のループが 30 分以上維持できる
- B: 同 Lv50 のキャラ 10 体集めて、ビルドが全部違う
- C: 装備の所持品リストを見て「これ俺だけだろ」と思えるアイテムが 3 個以上
- D: ログインしただけで世界が変わったと感じる（NPC・噂・告知）
- E: ソロでは到達できないコンテンツが「呪い解除＋レイド＋シージ」の最低 3 種
- F: Lv50 後 10 時間以上、明確な目標がある
- G: 課金で強くならない＋全 endpoint に rate-limit
- H: 375px モバイルで親指だけで遊べる + ドット絵で誰の職か一目で分かる

---

**作成**: 2026-04-29
**著者**: Claude Code（前回監査の結論を踏まえて）
**現状の最新コミット**: Cycle 35 完了 (C35-a/b/c/d、icon abstraction + 32 SVGs + UI 統合 + text toggle)
**次の着手**: Cycle 36 (経済バランス) を実装。Cycle 37 (運用基盤) は公開直前。Cycle 38 (a11y) で軸 H ★★★★★。
