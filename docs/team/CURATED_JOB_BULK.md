# Curated Job Bulk Generation — AI Pipeline (Cycle 31-d)

C31-a で 12 体の curated job (`prisma/curatedJobs.ts`) を手書きで投入した。
本ドキュメントは **残り 90〜290 体を AI に bulk 生成させる** ための設計書である。

> **目的**: 「眼鏡戦士」「猫好き魔導師」のように愛着が湧く curated job を最終的に 100〜300 体まで増量し、評価軸 B（キャラビルド）と D（物語・世界観）の両方を底上げする。

---

## 1. 出力 JSON フォーマット

`prisma/curatedJobs.ts` の `CuratedJob` 型と完全一致する。AI には JSON 配列のみを返させ、TS ファイル化は手作業 / スクリプトで行う。

```jsonc
[
  {
    "name": "眼鏡戦士",                       // 職業名のみ（個体名NG）
    "category": "warrior",                   // warrior/mage/rogue/cleric/craft/support/heretic/rare のいずれか
    "rank": "intermediate",                  // beginner/intermediate/advanced/special/legendary のいずれか
    "description": "丸眼鏡で敵の挙動を読み解く、知性派の戦士。",  // 30-50 字
    "quirk": "眼鏡",                         // 1 単語フック（重複可、ただし 8 個までに分散）
    "signatureOutfit": "丸眼鏡 + 革鎧 + 革表紙の戦術手帳",  // 装飾文字列、20-40 字
    "signatureBio": "本屋育ち。剣士には向かないと家族に...",   // 80-150 字、複数形 voice ("〜の者たち")
    "baseStats": {
      "hp": 56, "mp": 12,
      "atk": 12, "def": 8,
      "mat": 4,  "mdf": 6,
      "spd": 8
    },
    "uniqueSkills": [
      {
        "name": "観察眼",
        "description": "敵を 1 ターン凝視し、弱点属性とおおよその HP を露わにする。",
        "type": "buff",                       // attack/heal/buff/debuff/special
        "element": null,                      // fire/water/earth/wind/light/dark/null
        "power": 0,                           // 0-30
        "cost": 6,                            // MP cost、5-20
        "cooldown": 2,                        // 0-6
        "targetType": "enemy"                 // enemy/ally/self/all_enemies/all_allies
      }
    ]
  }
]
```

### 必須制約

- **`name` は職業名のみ**: 「眼鏡戦士」OK / 「眼鏡戦士・パセリ」NG。個体名は付けない。
- **`name` は既存 Job と重複しないこと**: seed 時 upsert で衝突しないよう、生成側で既存名一覧を渡す or 後処理で重複チェック。
- **`signatureBio` は複数形 voice**: 「〜の者たち」「〜の連中」「〜と呼ばれる者」など。個体名や「私」「彼」「彼女」を避ける。職業 = クラス記述。
- **`baseStats` の合計範囲**: 各カテゴリの相場に合わせる（下記分布表参照）。
- **`uniqueSkills` は 1 つ**: Phase 2 では 1 体 1 スキルで揃える。複雑な複数スキル組み合わせは将来のサブサイクル。

---

## 2. カテゴリ分布計画

Phase 1 (C31-a 既出) + Phase 2 (本ドキュメント) で 100 体到達を目指す。

| カテゴリ | Phase 1 | Phase 2 目標 | 合計 | 備考 |
| --- | ---: | ---: | ---: | --- |
| warrior | 2 | 11 | 13 | quirk 例: 眼鏡 / 巨漢 / 隻腕 / 双子 / 元踊り子 / 元医者 / 元囚人 / 雪国育ち / 海賊崩れ / 元騎士団長 / 退役老兵 |
| mage | 2 | 11 | 13 | quirk 例: 猫好き / 不眠 / 喘息 / 双子 / 妖精と契約 / 元教師 / 数学狂 / 不器用 / 沈黙派 / 双子 / 古文書狂 |
| rogue | 2 | 11 | 13 | quirk 例: 甘党 / 影 / 元道化師 / 美食家 / 元医療助手 / 港育ち / 双子 / 写真記憶 / 偽名常用 / 動物使い / 元軍楽隊 |
| cleric | 2 | 10 | 12 | quirk 例: 老齢 / 歌好き / 元戦士 / 沈黙派 / 童顔 / 雪国育ち / 元修道女 / 元軍医 / 双子 / 元司書 |
| craft | 1 | 12 | 13 | quirk 例: 頑固 / 蜂蜜屋 / 仕立屋 / 革職人 / 陶工 / 製本屋 / 楽器作り / 機械工 / 紙漉き / 染物屋 / 鈴職人 / 鑿師 |
| support | 1 | 11 | 12 | quirk 例: 風来坊 / 子守歌 / 賭博師 / 占い師 / 通訳 / 動物使い / 観光案内 / 葬儀屋 / 産婆 / 公証人 / 仲介屋 |
| heretic | 1 | 11 | 12 | quirk 例: 無口 / 元神官 / 双頭 / 不死研究 / 言語学者 / 解剖学者 / 元盗賊王 / 言葉狂い / 異界帰還 / 影使い / 自閉派 |
| rare | 1 | 11 | 12 | quirk 例: 夜行性 / 半妖精 / 龍の子 / 古竜の血 / 月光 / 星詠み2世 / 風使い / 水脈読み / 竜眼 / 妖精郷育ち / 不死者 |
| **計** | **12** | **88** | **100** | |

Phase 3 (300 体) で更に各カテゴリ +25 体 = 88 → +200。

---

## 3. プロンプトテンプレ

Claude API / Anthropic Console / Claude Code 経由のいずれでも使える。1 リクエストで 8〜12 体ずつ生成し、複数バッチで合計 88 体に到達させる方針（コンテキストとレスポンス品質のバランス）。

### システムメッセージ

```
あなたは王道ファンタジーのテキスト RPG の curated job (固有職) 設計を担当する。
出力は厳密な JSON 配列のみ。説明文・コードフェンス・コメント禁止。
各エントリは下記スキーマに従い、すでに登録済みの名前と重複してはならない。

スキーマ:
- name: 職業名のみ。個体名禁止 (「眼鏡戦士」OK / 「眼鏡戦士・パセリ」NG)
- category: warrior | mage | rogue | cleric | craft | support | heretic | rare
- rank: beginner | intermediate | advanced | special | legendary
- description: 30-50 字、職業の核を一文で
- quirk: 1 単語の特徴フック (例: 眼鏡 / 双子 / 甘党)
- signatureOutfit: 20-40 字、装備とは別軸の cosmetic 文字列
- signatureBio: 80-150 字、複数形 voice ("〜の者たち" / "〜の連中")。個体名・「私」「彼」「彼女」禁止
- baseStats: hp/mp/atk/def/mat/mdf/spd の整数 7 値。カテゴリ平均から大きく外れない
- uniqueSkills: 1 個。name/description/type/element/power/cost/cooldown/targetType
  - type は attack/heal/buff/debuff/special のいずれか
  - element は fire/water/earth/wind/light/dark/null
  - power は 0-30、cost は 5-20、cooldown は 0-6

baseStats 平均参考:
- warrior: hp 56-80 / mp 8-14 / atk 12-16 / def 8-12 / mat 2-4 / mdf 4-6 / spd 4-8
- mage: hp 32-42 / mp 28-38 / atk 3-5 / def 3-5 / mat 16-20 / mdf 8-12 / spd 7-10
- rogue: hp 36-44 / mp 14-20 / atk 11-14 / def 5-7 / mat 6-8 / mdf 5-6 / spd 14-17
- cleric: hp 42-52 / mp 24-30 / atk 4-6 / def 6-8 / mat 13-16 / mdf 12-15 / spd 5-9
- craft: hp 50-56 / mp 10-14 / atk 13-15 / def 9-11 / mat 4-6 / mdf 5-7 / spd 6-8
- support: hp 34-40 / mp 20-26 / atk 5-7 / def 4-6 / mat 8-10 / mdf 7-9 / spd 12-14
- heretic: hp 36-42 / mp 28-34 / atk 4-6 / def 5-7 / mat 15-18 / mdf 11-14 / spd 6-9
- rare: hp 38-44 / mp 32-38 / atk 4-6 / def 5-7 / mat 17-20 / mdf 13-15 / spd 8-11
```

### ユーザーメッセージ（バッチごとに調整）

```
カテゴリ {category} の curated job を {N} 体生成してほしい。
quirk のバリエーションは以下の候補から散らばらせる: {quirk1, quirk2, ...}
既存名と重複してはならない: ["眼鏡戦士", "巨漢戦士", ..., (既存全名)]
JSON 配列のみ。
```

`{N}` は 8〜12、`{category}` は warrior/mage/... のいずれか、`{quirk1, ...}` は §2 の表から該当カテゴリの分。

### 期待される 1 バッチの応答例

```json
[
  { "name": "隻腕戦士", "category": "warrior", "rank": "advanced", ... },
  { "name": "双子戦士", "category": "warrior", "rank": "intermediate", ... },
  ...
]
```

---

## 4. 受け入れ検証

生成 JSON を `curatedJobs.ts` に追記する前に、以下をスクリプトで自動検証することを推奨する（C31-d 時点では手動でも可）。

| 検査項目 | 内容 | 対処 |
| --- | --- | --- |
| name unique | 既存 + 新規バッチ内で衝突無し | 衝突発見 → 個別差し替え or 再生成 |
| name 個体名混入 | `・[カナ]` パターンが出ていないか | 該当行を再生成 |
| category 列挙 | 8 種類のいずれか | enum 外 → 修正 |
| baseStats 範囲 | カテゴリ平均から ±50% 以内 | 大幅逸脱 → 値修正 |
| signatureBio 文字数 | 80-150 字 | 大幅短文 / 長文 → 再生成 |
| signatureBio voice | 個体名 / 私 / 彼 / 彼女 が出ていない | 出てれば 1 行差し替え |
| uniqueSkills | 厳密に 1 個 | 0 or 2+ → 再生成 |
| Skill cost / power | 範囲内 (cost 5-20, power 0-30) | 逸脱 → 値修正 |

将来 `scripts/validate_curated.ts` を作るのが望ましい (P2)。

---

## 5. 投入手順

1. AI で 1 カテゴリ × 1 バッチ生成し、JSON を取得。
2. §4 の検証を通す（手動 or 将来のスクリプト）。
3. JSON エントリを `prisma/curatedJobs.ts` の `CURATED_JOBS` 配列末尾に追記。
4. `npm run seed` を実行。`Curated jobs: N upserted, M unique skills created` のログで件数を確認。
5. `/jobs` のキャラ作成フローで新規 curated 職が候補に出ることを目視確認。
6. `npx tsc --noEmit` を回して型エラーがないこと（基本通るはず、TS 型は Phase 1 で固定済み）。
7. コミットメッセージは `feat(cycle 31-d.batch{N}): bulk-add {category} curated jobs (+{N} entries)` のような形にして、進捗を追えるようにする。

---

## 6. 進捗トラッキング

- **2026-04-29**: Phase 2 完了。`prisma/curatedJobs.ts` に 8 バッチ (b1〜b8) で合計 88 体追加し、Phase 1 の 12 体と合わせて **計 100 体**到達。各 entry に 1 unique skill = 100 unique skill。`npm run seed` で `Curated jobs: 100 upserted` を確認済み。
- 投入数の確認: `await countCuratedJobs()` (`src/lib/curatedJob.ts`) を `scripts/smoke_curated.ts` あたりで呼ぶ smoke を将来作る (P3)。
- 100 体到達で評価軸 B（キャラビルド）★★★★★ 確定（C30 + C31）✅。
- 300 体到達 (Phase 3、任意) で C33（lore docs）と合流して軸 D（物語・世界観）★★★★★ を狙える。

---

## 7. 既存 12 体一覧（Phase 1 = C31-a）

| name | category | quirk |
| --- | --- | --- |
| 眼鏡戦士 | warrior | 眼鏡 |
| 巨漢戦士 | warrior | 巨漢 |
| 猫好き魔導師 | mage | 猫好き |
| 不眠魔導師 | mage | 不眠 |
| 甘党盗賊 | rogue | 甘党 |
| 影語り | rogue | 影 |
| 老師 | cleric | 老齢 |
| 歌う司祭 | cleric | 歌好き |
| 鍛冶娘 | craft | 頑固 |
| 旅芸人 | support | 風来坊 |
| 禁書館の番人 | heretic | 無口 |
| 星詠み | rare | 夜行性 |

これらは Phase 2 のプロンプトに「既存名」として渡し、重複生成を防ぐ。

---

**作成**: 2026-04-29 (Cycle 31-d)
**著者**: Claude Code
**次の更新**: Phase 2 バッチ実行時にこのドキュメントの §6 進捗を追記。
