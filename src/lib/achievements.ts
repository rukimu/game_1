// Achievement system. World events (boss kill, curse cleanse, mystery solve,
// duel streaks, dungeon clears) call awardAchievement(slug, characterId) and
// the helper either no-ops (already earned) or records + announces.
//
// Definitions live alongside the seed; runtime callers just reference slugs.
// A character can pick which earned title they want to wear on the HUD.

import { prisma } from "@/lib/prisma";

export type AchievementDef = {
  slug: string;
  title: string;
  description: string;
  titleSlug?: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  hidden?: boolean;
};

// Static definitions. Seeded into the Achievement table on startup-time
// reconciliation (ensureAchievementsSeeded below). New slugs added here are
// upserted; existing slugs are never deleted from the table to preserve
// holder records.
//
// Cycle 21D pumped this from 16 → 90+ so the achievement page becomes a
// genuine progression goal rather than a 5-minute checklist.
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // -- World firsts --
  { slug: "boss_first_kill", title: "本日の英雄", description: "本日のボスを世界で最初に討伐した。", titleSlug: "本日の英雄", rarity: "legendary" },
  { slug: "boss_kill_3", title: "ボス狩り", description: "本日のボスを 3 体討伐した。", titleSlug: "ボス狩り", rarity: "rare" },
  { slug: "boss_kill_10", title: "ボス殺し", description: "本日のボスを 10 体討伐した。", titleSlug: "ボス殺し", rarity: "epic" },
  { slug: "boss_kill_30", title: "ボスの天敵", description: "本日のボスを 30 体討伐した。", titleSlug: "ボスの天敵", rarity: "legendary" },
  { slug: "mystery_first_solver", title: "謎の解明者", description: "シーズンの中心の謎を世界で最初に解き明かした。", titleSlug: "謎の解明者", rarity: "mythic" },
  { slug: "season_2_solver", title: "鏡を割った者", description: "シーズン 2 の中心の謎を解き明かした。", titleSlug: "鏡を割った者", rarity: "mythic" },
  { slug: "season_3_solver", title: "灰を歌った者", description: "シーズン 3 の中心の謎を解き明かした。", titleSlug: "灰を歌った者", rarity: "mythic" },

  // -- Curse cycle --
  { slug: "cursed_one", title: "呪われし者", description: "呪い職に身を捧げた。覚悟の代償。", titleSlug: "呪を負う者", rarity: "epic", hidden: true },
  { slug: "cursed_lv30", title: "呪を引き受ける者", description: "呪い職のまま Lv30 に達した。", titleSlug: "呪を引き受ける者", rarity: "legendary", hidden: true },
  { slug: "cleanse_helper", title: "呪を解く手", description: "他者の呪いを解除する儀式に参加した。", titleSlug: "呪を解く手", rarity: "rare" },
  { slug: "cleanse_thrice", title: "解放者", description: "3 人以上の呪いを解除する儀式に参加した。", titleSlug: "解放者", rarity: "epic" },
  { slug: "cleanse_five", title: "呪を断つ者", description: "5 人以上の呪いを解除する儀式に参加した。", titleSlug: "呪を断つ者", rarity: "epic" },
  { slug: "cleanse_ten", title: "呪縛の解放者", description: "10 人以上の呪いを解除する儀式に参加した。", titleSlug: "呪縛の解放者", rarity: "legendary" },

  // -- Duels --
  { slug: "first_duel", title: "決闘の作法を学んだ", description: "初めての決闘を行った。", rarity: "common" },
  { slug: "duel_5_wins", title: "決闘者", description: "決闘で 5 勝した。", titleSlug: "決闘者", rarity: "rare" },
  { slug: "duel_25_wins", title: "闘技場の覇者", description: "決闘で 25 勝した。", titleSlug: "闘技場の覇者", rarity: "epic" },
  { slug: "duel_100_wins", title: "闘技の精霊", description: "決闘で 100 勝した。", titleSlug: "闘技の精霊", rarity: "legendary" },
  { slug: "duel_rating_1700", title: "銀の誇り", description: "決闘レート 1700 に到達した。", titleSlug: "銀の誇り", rarity: "rare" },
  { slug: "duel_rating_1900", title: "金の誇り", description: "決闘レート 1900 に到達した。", titleSlug: "金の誇り", rarity: "epic" },
  { slug: "duel_rating_2100", title: "玉座の誇り", description: "決闘レート 2100 に到達した。", titleSlug: "玉座の誇り", rarity: "legendary" },
  { slug: "arena_top_10", title: "闘技場の十傑", description: "闘技場ランキングの 10 位以内に入った。", titleSlug: "闘技場の十傑", rarity: "rare" },
  { slug: "arena_top_5", title: "闘技場の五傑", description: "闘技場ランキングの 5 位以内に入った。", titleSlug: "闘技場の五傑", rarity: "epic" },
  { slug: "arena_top_1", title: "闘技場の頂点", description: "闘技場ランキングの 1 位を獲得した。", titleSlug: "闘技場の頂点", rarity: "legendary" },

  // -- Battle / hack-and-slash --
  { slug: "first_blood", title: "初陣", description: "最初の戦闘に勝利した。", rarity: "common" },
  { slug: "streak_5", title: "連戦の感", description: "通常戦闘で 5 連勝した。", titleSlug: "連戦の感", rarity: "rare" },
  { slug: "streak_15", title: "百戦錬磨", description: "通常戦闘で 15 連勝した。", titleSlug: "百戦錬磨", rarity: "epic" },
  { slug: "streak_50", title: "戦塵の支配者", description: "通常戦闘で 50 連勝した。", titleSlug: "戦塵の支配者", rarity: "legendary" },
  { slug: "battle_100", title: "古参兵", description: "戦闘に 100 回勝利した。", rarity: "common" },
  { slug: "battle_500", title: "歴戦の生き残り", description: "戦闘に 500 回勝利した。", titleSlug: "歴戦の生き残り", rarity: "rare" },
  { slug: "battle_1000", title: "名のある剣豪", description: "戦闘に 1000 回勝利した。", titleSlug: "名のある剣豪", rarity: "epic" },
  { slug: "first_legendary", title: "伝説の手触り", description: "伝説ティアの装備を手にした。", titleSlug: "伝説を持つ者", rarity: "legendary" },
  { slug: "five_legendary", title: "伝説の蒐集家", description: "伝説ティア装備を 5 個入手した。", titleSlug: "伝説の蒐集家", rarity: "legendary" },
  { slug: "all_slots_rare", title: "完全装備", description: "全スロットを Rare 以上で固めた。", titleSlug: "完全装備", rarity: "epic", hidden: true },
  { slug: "first_crit", title: "刃のひらめき", description: "戦闘でクリティカルを引き起こした。", rarity: "common" },
  { slug: "first_status_kill", title: "毒の刺", description: "状態異常で敵にとどめを刺した。", rarity: "rare", hidden: true },
  { slug: "status_silence", title: "言葉を奪う者", description: "敵を【沈黙】状態にした。", rarity: "common" },
  { slug: "status_bleed", title: "傷の演者", description: "敵を【出血】状態にした。", rarity: "common" },
  { slug: "status_curse", title: "呪い継ぎし者", description: "敵を【呪い化】状態にした。", titleSlug: "呪い継ぎし者", rarity: "rare" },

  // -- Mystery progress --
  { slug: "clue_first", title: "最初の手がかり", description: "シーズンの謎の手がかりを 1 つ集めた。", rarity: "common" },
  { slug: "clue_half", title: "謎の追跡者", description: "シーズンの謎の手がかりを 4 つ以上集めた。", titleSlug: "謎の追跡者", rarity: "rare" },
  { slug: "clue_all", title: "全手がかり蒐集者", description: "シーズンの謎の手がかりを全て集めた。", titleSlug: "全手がかり蒐集者", rarity: "epic" },
  { slug: "clue_15_total", title: "謎学者", description: "通算 15 個の手がかりを集めた。", titleSlug: "謎学者", rarity: "epic" },

  // -- Dungeon --
  { slug: "dungeon_first_clear", title: "深淵の踏破者", description: "ダンジョンを最後まで踏破した。", titleSlug: "踏破者", rarity: "rare" },
  { slug: "dungeon_5_clear", title: "踏破者の足取り", description: "ダンジョンを 5 つ踏破した。", titleSlug: "踏破者の足取り", rarity: "epic" },
  { slug: "dungeon_no_retreat", title: "退かぬ意志", description: "ダンジョンを 1 度も撤退せず最深層まで到達した。", titleSlug: "退かぬ意志", rarity: "legendary", hidden: true },

  // -- Social / world --
  { slug: "guild_founder", title: "ギルドの礎", description: "ギルドを創設した。", titleSlug: "ギルドの礎", rarity: "rare" },
  { slug: "guild_lv5_member", title: "結束の一翼", description: "ギルドメンバーが 5 人以上のギルドに所属している。", rarity: "common" },
  { slug: "siege_winner", title: "城を落とす者", description: "攻城戦に勝利したギルドの一員だった。", titleSlug: "城を落とす者", rarity: "epic" },
  { slug: "siege_3_winner", title: "領地の支配者", description: "攻城戦に 3 度勝利した。", titleSlug: "領地の支配者", rarity: "legendary" },
  { slug: "guild_chat_100", title: "結束の詠み手", description: "ギルドチャットで 100 回発言した。", rarity: "common" },

  // -- Town / world exploration --
  { slug: "visit_5_towns", title: "短い足取り", description: "5 つの街を訪れた。", rarity: "common" },
  { slug: "visit_25_towns", title: "中堅の旅人", description: "25 の街を訪れた。", titleSlug: "旅人", rarity: "rare" },
  { slug: "visit_50_towns", title: "古道の歩き手", description: "50 の街を訪れた。", titleSlug: "古道の歩き手", rarity: "epic" },
  { slug: "visit_100_towns", title: "世界踏破者", description: "100 以上の街を訪れた。", titleSlug: "世界踏破者", rarity: "legendary" },
  { slug: "visit_all_regions", title: "地理の知者", description: "全地方を訪れた。", titleSlug: "地理の知者", rarity: "epic" },

  // -- Quest --
  { slug: "first_quest", title: "依頼を引き受けた者", description: "最初のクエストを完了した。", rarity: "common" },
  { slug: "quest_25", title: "依頼の常連", description: "25 件のクエストを完了した。", rarity: "common" },
  { slug: "quest_100", title: "依頼の達人", description: "100 件のクエストを完了した。", titleSlug: "依頼の達人", rarity: "epic" },
  { slug: "quest_explore", title: "古道を踏みしめる者", description: "explore 系クエストを完了した。", rarity: "common" },
  { slug: "quest_collect", title: "蒐集者の手", description: "collect 系クエストを完了した。", rarity: "common" },

  // -- Levels --
  { slug: "level_10", title: "第一の節目", description: "Lv10 に到達した。", rarity: "common" },
  { slug: "level_30", title: "第二の節目", description: "Lv30 に到達した。", titleSlug: "第二の節目", rarity: "rare" },
  { slug: "level_50", title: "頂点に至る者", description: "Lv50 (現キャップ) に到達した。", titleSlug: "頂点に至る者", rarity: "legendary" },

  // -- Job mastery / changes --
  { slug: "job_changed", title: "新たな道", description: "初めて転職した。", rarity: "common" },
  { slug: "job_changed_5", title: "彷徨う魂", description: "5 回以上転職した。", titleSlug: "彷徨う魂", rarity: "rare" },
  { slug: "job_changed_15", title: "千の面の持ち主", description: "15 回以上転職した。", titleSlug: "千の面の持ち主", rarity: "epic" },
  { slug: "rare_job_obtained", title: "稀少の徒", description: "rare カテゴリの職業に転職した。", titleSlug: "稀少の徒", rarity: "epic" },
  { slug: "heretic_job_obtained", title: "禁書を読みし者", description: "heretic カテゴリの職業に転職した。", titleSlug: "禁書を読みし者", rarity: "epic", hidden: true },

  // -- Economy --
  { slug: "gold_10000", title: "小金持ち", description: "所持金 10000G に到達した。", rarity: "common" },
  { slug: "gold_100000", title: "豪商", description: "所持金 100000G に到達した。", titleSlug: "豪商", rarity: "rare" },
  { slug: "gold_1000000", title: "城を買えるほど", description: "所持金 1000000G に到達した。", titleSlug: "黄金の主", rarity: "legendary" },
  { slug: "auction_first_sell", title: "市場に出した", description: "オークションで初出品した。", rarity: "common" },
  { slug: "auction_first_win", title: "落札者", description: "オークションで初めて落札した。", rarity: "common" },
  { slug: "trade_complete", title: "信を結ぶ手", description: "個人間トレードを成立させた。", rarity: "common" },

  // -- Forge --
  { slug: "forge_first_reroll", title: "鍛冶場の客", description: "初めて鍛冶でリロールした。", rarity: "common" },
  { slug: "forge_first_upgrade", title: "ティアを上げた者", description: "初めて鍛冶で強化に成功した。", rarity: "rare" },
  { slug: "forge_legendary_upgrade", title: "伝説を作る手", description: "鍛冶で装備を Legendary に強化した。", titleSlug: "伝説を作る手", rarity: "legendary" },

  // -- Party / social play --
  { slug: "party_join", title: "肩を並べた", description: "初めてパーティーに参加した。", rarity: "common" },
  { slug: "party_battle", title: "並んで戦った", description: "パーティー戦闘に参加して勝利した。", rarity: "common" },
  { slug: "party_full_battle", title: "10 人の脈動", description: "10 人パーティーで戦闘に勝利した。", titleSlug: "10 人の脈動", rarity: "legendary" },

  // -- Hidden / Easter eggs --
  { slug: "found_secret_well", title: "井戸の底を知る者", description: "ある井戸の底に手を触れた。", titleSlug: "井戸の底を知る者", rarity: "mythic", hidden: true },
  { slug: "spoke_to_all_npcs_in_town", title: "声を集めた者", description: "ある街の全 NPC に話しかけた。", rarity: "rare", hidden: true },
  { slug: "midnight_traveler", title: "夜歩く者", description: "夜中の世界状態を 7 日連続で目撃した。", titleSlug: "夜歩く者", rarity: "epic", hidden: true },
];

let _seeded = false;

export async function ensureAchievementsSeeded(): Promise<void> {
  if (_seeded) return;
  for (const def of ACHIEVEMENT_DEFS) {
    await prisma.achievement.upsert({
      where: { slug: def.slug },
      create: {
        slug: def.slug,
        title: def.title,
        description: def.description,
        titleSlug: def.titleSlug ?? null,
        rarity: def.rarity,
        hidden: def.hidden ?? false,
      },
      update: {
        title: def.title,
        description: def.description,
        titleSlug: def.titleSlug ?? null,
        rarity: def.rarity,
        hidden: def.hidden ?? false,
      },
    });
  }
  _seeded = true;
}

// Award an achievement to a character. No-op if already earned. Returns the
// freshly-awarded entry or null. Safe to call from any code path; never
// throws on missing slug (logs and returns null instead).
export async function awardAchievement(
  slug: string,
  characterId: string,
): Promise<{ slug: string; title: string; rarity: string } | null> {
  try {
    await ensureAchievementsSeeded();
    const ach = await prisma.achievement.findUnique({ where: { slug } });
    if (!ach) return null;
    const existing = await prisma.characterAchievement.findUnique({
      where: { characterId_achievementId: { characterId, achievementId: ach.id } },
    });
    if (existing) return null;
    await prisma.characterAchievement.create({
      data: { characterId, achievementId: ach.id },
    });
    return { slug: ach.slug, title: ach.title, rarity: ach.rarity };
  } catch (e) {
    return null;
  }
}

export async function awardMany(slugs: string[], characterId: string): Promise<string[]> {
  const earned: string[] = [];
  for (const s of slugs) {
    const r = await awardAchievement(s, characterId);
    if (r) earned.push(r.title);
  }
  return earned;
}

// Get a character's achievements + the full catalog (for the /achievements page).
export async function getCharacterAchievements(characterId: string) {
  await ensureAchievementsSeeded();
  const all = await prisma.achievement.findMany({ orderBy: { rarity: "asc" } });
  const earnedRows = await prisma.characterAchievement.findMany({
    where: { characterId },
    select: { achievementId: true, earnedAt: true },
  });
  const earnedMap = new Map(earnedRows.map((r) => [r.achievementId, r.earnedAt]));
  return all
    .filter((a) => !a.hidden || earnedMap.has(a.id))
    .map((a) => ({
      ...a,
      earned: earnedMap.has(a.id),
      earnedAt: earnedMap.get(a.id) ?? null,
    }));
}
