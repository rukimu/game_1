# 機能処遇判定リスト

> Cycle 39 (Phase 0) 設計図。既存 60+ ページ・1720 procedural job・5039 procedural skill の **処遇** を体験設計に基づいて判定する。
>
> 監督方針 Q1.C: 「思い切ってリセット」を技術的には「**legacy/c38-snapshot ブランチで凍結 + main で機能封印**」と解釈。本ドキュメントは封印・残存の境界を定義。
>
> 関連: [`PLAYER_JOURNEY.md`](./PLAYER_JOURNEY.md) (時系列) / [`CORE_LOOP.md`](./CORE_LOOP.md) (戦闘) / [`SKILL_DESIGN.md`](./SKILL_DESIGN.md) (スキル)。

---

## 判定の 4 区分

| 区分 | 意味 | 露出 |
|---|---|---|
| **🟢 Day1 露出** | 登録直後から HUD / town に表示、Lv1 から触れる | 常時 |
| **🟡 段階開放** | Lv 到達 or 条件達成で露出 | 条件付き |
| **🔵 Endgame** | Lv50+ で露出 | 条件付き |
| **🔴 封印 (Phase 1)** | route 削除 or HUD ナビから外す。コードは残置、後で復活可 | 非表示 |

封印理由の典型:
- 過剰な選択肢が新規プレイヤーを混乱させる
- 機能数 = 楽しさ ではない
- 体験の中心 (戦闘 → 装備 → 強化) に集中させる
- 後続フェーズでの体験設計に従って復活する余地を残す

---

## 機能別判定表

### 認証・キャラ管理

| 機能 | 判定 | 開放条件 / 備考 |
|---|---|---|
| `/register` | 🟢 | 常時 |
| `/login` | 🟢 | 常時 |
| `/characters` (選択・作成) | 🟢 | ログイン後 |
| クイズ → curated 候補提示 | 🟢 | 作成時 |

### 街・基本ループ

| 機能 | 判定 | 開放条件 / 備考 |
|---|---|---|
| `/town` (街表示) | 🟢 | 常時 |
| `/town` クエスト掲示板 | 🟢 | 受注済みは別セクション (Phase 1 修正) |
| `/town` 噂 (rumors) | 🟢 | 常時 |
| `/town` NPC 表示 | 🟢 | curated NPC 紫枠展開 |
| `/town` チャット | 🟡 | Lv2 で開放 (チュートリアル後) |
| 街の段階開放 | 🟡 | `Town.unlockLevel` 追加、Lv5/10/15/25/40/50 で順次 |
| `/battle/[id]` (戦闘) | 🟢 | 常時 |
| `/inventory` (装備) | 🟢 | 常時、アイコン付き |
| 宿屋 (HP/MP 回復) | 🟢 | town 内 |
| `/shop` (道具屋) | 🟡 | Lv3 で開放 |

### キャラビルド

| 機能 | 判定 | 開放条件 / 備考 |
|---|---|---|
| `/jobs` (転職) | 🟡 | Lv10 で開放 |
| 継承スキル (C30) | 🟡 | Lv10 開放、UI は `/jobs` 内 |
| 熟練度 +5/+10/+15% (C30) | 🟡 | スキル使用回数で自動発動 |
| チェーンコンボ +10% (C30) | 🟡 | 戦闘ログタグ表示 |
| `/forge` (鍛冶) | 🟡 | Lv5 で開放 |
| `/mastery` | 🔴 → 🟡 | **Phase 1 で封印 → Phase 3 で復活** (Month1 用) |
| `/curse` (呪い職一覧) | 🟡 | Lv10 で開放 (転職時に curse 関連で発見) |

### 物語・世界観

| 機能 | 判定 | 開放条件 / 備考 |
|---|---|---|
| curated NPC 30 体 (5 主要都市) | 🟢 | 街訪問で接触 |
| curated NPC bio + 関係グラフ | 🟢 | town 内紫枠展開 |
| シーズン 1-3 (灯の年 / 鏡の森 / 灰の唄) | 🟢 | seasonRotation.ts で常時 |
| `/mystery` (手がかり収集) | 🟡 | Lv4 で開放 |
| `/canon` (季節カノン年表) | 🔴 → 🔵 | **Phase 1 で封印 → Endgame で復活** |
| 物語クエスト (Phase 3 新設予定) | 🔴 → 🟡 | 現状なし、Phase 3 で curated NPC が発行する型を実装 |

### マルチプレイ

| 機能 | 判定 | 開放条件 / 備考 |
|---|---|---|
| パーティ (`/party`) | 🟡 | Lv4 で開放 |
| `/guild` (ギルド) | 🟡 | Lv5 で開放、200G で設立 |
| ギルド倉庫 | 🟡 | ギルド加入で表示 |
| `/messages` (DM) | 🟡 | Lv4 で開放 |
| `/pvp` (闘技場) | 🔴 → 🟡 | **Phase 1 で封印 → Phase 3 で復活** (Week1 後半 / Month1 で挑戦相手) |
| 闘技場 ELO レート | 🔴 | C16 機能、Phase 3 で復活時に再有効化 |
| `/auction` (オークション) | 🔴 → 🔵 | **Phase 1 で封印 → Endgame で復活** (経済の根幹に関わるため慎重に) |

### ボス・レイド・シージ

| 機能 | 判定 | 開放条件 / 備考 |
|---|---|---|
| `/boss` (本日のボス) | 🔴 → 🟡 | **Phase 1 で封印 → Phase 3 (Month1) で復活** (パーティ前提なので) |
| 週末ボス T1/T2/T3 | 🔴 → 🟡 | **Phase 1 で封印 → Phase 3 で復活** |
| `/dungeon` (ダンジョン) | 🟡 | Lv3 で開放、テーマ別 5 種は Lv25 |
| ワールドレイド (`/raid/[id]`) | 🔴 → 🔵 | **Phase 1 で封印 → Endgame で復活** |
| `/siege` (攻城戦) | 🔴 → 🔵 | **Phase 1 で封印 → Endgame で復活** (ギルド前提) |
| `/siege/[id]/battle` (siege battle) | 🔴 → 🔵 | 同上 |

### エンドゲーム

| 機能 | 判定 | 開放条件 / 備考 |
|---|---|---|
| `/abyss` (奈落) | 🔵 | Lv50+ |
| `/ascension` (転生) | 🔵 | Lv50+ |
| `/canon` (季節カノン) | 🔵 | Endgame |
| アチーブメント `/achievements` | 🟡 | Lv5 で開放 (Day1 で見せると圧倒される) |
| 称号コンプ「歩く伝承」 | 🔵 | 全 90+ 称号取得で auto-grant |

### システム

| 機能 | 判定 | 開放条件 / 備考 |
|---|---|---|
| HUD (Hud.tsx) | 🟢 | 常時 |
| HUD アイコントグル (IconsToggle) | 🟢 | 常時 |
| 称号表示 (HUD) | 🟡 | 何か称号取得後 |
| 未読 DM バッジ | 🟡 | DM 機能と連動 |
| `/admin` | 🟢 | 管理者のみ |

### 既存データ (procedural)

| 機能 | 判定 | 備考 |
|---|---|---|
| procedural job 1720 | 🔴 | **Phase 1 で封印**: `Job.curated = false` の job をクイズ候補・転職候補から除外。DB には残すが画面に出さない |
| procedural skill 5039 | 🔴 | 上記に伴い、procedural skill も画面に出さない (Skill.jobId が curated でないものは除外) |
| procedural NPC 564 (3 街以外の村) | 🔴 → 🟡 | **5 主要都市の curated 30 NPC のみ Day1 露出**。procedural NPC は Phase 3 で街解放と合わせて段階復活 |
| procedural town 110 (3 legacy + 2 curated 以外) | 🔴 → 🟡 | **5 都市のみ Day1 露出**。procedural town は Lv 解放で段階復活 |
| procedural item 858 | 🟡 | drop で出続ける、ただし量産品扱い (curated item は今後検討) |

---

## Phase 1 で具体的にやる「封印」作業

### Cycle 40 で実施

1. **legacy snapshot ブランチ作成**:
   ```bash
   git checkout -b legacy/c38-snapshot
   git push origin legacy/c38-snapshot
   git checkout claude/check-dev-status-Pmp0l
   ```

2. **HudMenu から封印対象リンクを除外**:
   - `/mastery`, `/canon`, `/pvp`, `/boss`, `/siege`, `/raid`, `/auction`, `/abyss`, `/ascension`
   - 表示条件 (level / guild) を厳格化、Phase 1 では到達不可な高 Lv に設定

3. **procedural job/NPC/town の filter**:
   - クイズ candidate 生成: `Job.curated = true` のみ
   - town list: 5 都市のみ表示 (Town.unlockLevel が high の他は表示しない)
   - 街の NPC: その街の curated NPC のみ表示

4. **route の guard**:
   - `/mastery`, `/canon`, `/abyss` 等を route から削除 or 「準備中」表示
   - 直 URL アクセス対策

### コードは残す

封印対象の lib (`src/lib/{mastery,abyss,ascension,canon,siege,siegeBattle,raid,...}.ts`) は **削除しない**。
Phase 3 / Endgame で復活時にそのまま使える状態を保つ。

---

## 「機能数 = 楽しさ」の罠を避ける

ここまで実装した結果:
- ページ数: 約 30 個
- 機能数: アチーブメント 76 / クエスト型 4 種 / 戦闘要素 (状態異常 6 / クリ / lifesteal / slay / regen / インヘリ / コンボ) / 道具屋 / 鍛冶 / オークション / ギルド / 倉庫 / DM / レイド / シージ / 奈落 / 転生 / 季節カノン / マスタリ / 闘技場 ...

**これは「機能カバレッジ」であって、「体験の質」ではない**。

新規プレイヤーが Day1 で**選択できる機能を絞ることで**、コアループに集中させる。
Lv が上がるにつれて段階開放することで「世界が広がる」感覚を作る。
Endgame で全機能が解禁されたとき、「これだけのコンテンツがある」と本物の達成感に繋がる。

---

## Phase 1 完了時の最終 menu (理想)

監督が Lv1 でログインした時、HUD に表示される機能:

```
[街] [所持品] [戦闘] [PT] [メニュー▼]
                              ├ 装備
                              ├ クエスト
                              ├ 設定
                              └ ログアウト
```

これだけ。

Lv5 で `/shop` `/forge` `/dungeon` がメニューに加わる。
Lv10 で `/jobs` `/curse` `/mystery` が加わる。
Lv15 で `/mastery` が加わる。
Lv25 で `/boss` が加わる。
Lv50 で `/abyss` `/ascension` `/canon` が加わる。
ギルド加入で `/guild` `/siege` が加わる。

---

**作成**: 2026-05-02 (Cycle 39 / Phase 0)
**著者**: Claude Code
**改訂タイミング**: Phase 1 Cycle 40 着手時に「封印作業の実装ガイド」として参照、Phase 3 での復活判断時に再確認
