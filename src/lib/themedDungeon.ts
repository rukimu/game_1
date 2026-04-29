// Themed mid-game dungeons. Five hand-crafted variants designed to plug the
// "Lv30-45 にやることがない" gap. Each theme has its own enemy bias,
// floor count, final boss, and loot tendency so they feel distinct from
// the procedural runs.

import { prisma } from "@/lib/prisma";
import { startBattleForParty } from "@/lib/battle";
import type { EnemyState } from "@/lib/battle";

export type ThemedDungeonKey = "library" | "tower" | "lake" | "altar" | "bell";

export type ThemedDungeon = {
  key: ThemedDungeonKey;
  name: string;
  flavor: string;
  recommendedLevel: { min: number; max: number };
  totalFloors: number;
  enemyTypeBias: EnemyState["creatureType"];
  enemyElement: string;
  boss: {
    name: string;
    creatureType: EnemyState["creatureType"];
    level: number;
    hp: number;
    atk: number;
    def: number;
    spd: number;
    element: string;
    weakness: string;
    expReward: number;
    goldReward: number;
  };
  bossDropTier: "epic" | "legendary";
  recommendedParty: string;
};

export const THEMED_DUNGEONS: Record<ThemedDungeonKey, ThemedDungeon> = {
  library: {
    key: "library",
    name: "忘却の図書館",
    flavor: "誰が読んだのかも忘れられた書庫。羽ばたくような頁の音と、囁き続ける禁書の声が満ちている。",
    recommendedLevel: { min: 25, max: 40 },
    totalFloors: 5,
    enemyTypeBias: "magic",
    enemyElement: "dark",
    boss: {
      name: "禁書を読み終えた者",
      creatureType: "magic",
      level: 38,
      hp: 1800, atk: 78, def: 60, spd: 16,
      element: "dark", weakness: "light",
      expReward: 1800, goldReward: 1400,
    },
    bossDropTier: "epic",
    recommendedParty: "魔導系・神官系を含む 3-5 人",
  },
  tower: {
    key: "tower",
    name: "霜帝の塔",
    flavor: "永遠の冬に閉ざされた巨大塔。最上階には霜帝の冷気が満ち、息ですら凍る。",
    recommendedLevel: { min: 30, max: 45 },
    totalFloors: 6,
    enemyTypeBias: "construct",
    enemyElement: "water",
    boss: {
      name: "霜帝・第八代",
      creatureType: "construct",
      level: 42,
      hp: 2400, atk: 96, def: 88, spd: 12,
      element: "water", weakness: "fire",
      expReward: 2400, goldReward: 1800,
    },
    bossDropTier: "epic",
    recommendedParty: "戦士系・魔導系の混成 3-6 人",
  },
  lake: {
    key: "lake",
    name: "鏡映の湖底",
    flavor: "湖の底に沈んだもう一つの世界。水は鏡となり、覗き込んだ者の影を奪うという。",
    recommendedLevel: { min: 28, max: 42 },
    totalFloors: 5,
    enemyTypeBias: "beast",
    enemyElement: "water",
    boss: {
      name: "影を盗んだ双子魚",
      creatureType: "beast",
      level: 40,
      hp: 2100, atk: 92, def: 64, spd: 22,
      element: "water", weakness: "wind",
      expReward: 2100, goldReward: 1600,
    },
    bossDropTier: "epic",
    recommendedParty: "盗賊系・支援系を含む 3-4 人",
  },
  altar: {
    key: "altar",
    name: "灰の唄の祭壇",
    flavor: "灰の唄が祈り続ける古い祭壇。歌い手は誰も覚えていない言葉を紡いでいる。",
    recommendedLevel: { min: 32, max: 45 },
    totalFloors: 5,
    enemyTypeBias: "undead",
    enemyElement: "dark",
    boss: {
      name: "灰の唄の最後の歌い手",
      creatureType: "undead",
      level: 44,
      hp: 2600, atk: 102, def: 70, spd: 18,
      element: "dark", weakness: "light",
      expReward: 2700, goldReward: 2000,
    },
    bossDropTier: "legendary",
    recommendedParty: "神官系必須・最低 4 人推奨",
  },
  bell: {
    key: "bell",
    name: "鐘塔の地下",
    flavor: "鐘塔の真下、誰も降りたことのない地下迷宮。鳴り続ける鐘の振動が壁を震わせている。",
    recommendedLevel: { min: 38, max: 50 },
    totalFloors: 7,
    enemyTypeBias: "humanoid",
    enemyElement: "light",
    boss: {
      name: "七つ目の鐘番",
      creatureType: "humanoid",
      level: 50,
      hp: 3400, atk: 124, def: 92, spd: 20,
      element: "light", weakness: "dark",
      expReward: 4000, goldReward: 3000,
    },
    bossDropTier: "legendary",
    recommendedParty: "Lv45+ × 5-10 人推奨",
  },
};

export function listThemedDungeons(): ThemedDungeon[] {
  return Object.values(THEMED_DUNGEONS);
}

export async function createThemedDungeonRun(characterId: string, theme: ThemedDungeonKey) {
  const cfg = THEMED_DUNGEONS[theme];
  if (!cfg) throw new Error("unknown theme");
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { partyMembers: true },
  });
  if (!character) throw new Error("character not found");
  if (character.level < cfg.recommendedLevel.min) {
    throw new Error(`このダンジョンは Lv${cfg.recommendedLevel.min} 以上の冒険者向けです`);
  }
  let partyId = character.partyMembers[0]?.partyId;
  if (!partyId) {
    const party = await prisma.party.create({
      data: {
        name: `${character.name}の${cfg.name}探索`,
        leaderCharacterId: character.id,
        isOpen: false,
        members: { create: [{ characterId: character.id }] },
      },
    });
    partyId = party.id;
  }
  const run = await prisma.dungeonRun.create({
    data: {
      characterId,
      partyId,
      name: cfg.name,
      theme: cfg.key,
      totalFloors: cfg.totalFloors,
      currentFloor: 0,
    },
  });
  return run;
}

// Start the next floor of a themed run. Final floor uses the theme boss.
export async function advanceThemedDungeonFloor(runId: string) {
  const run = await prisma.dungeonRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("run not found");
  if (!run.theme) throw new Error("not a themed run");
  const cfg = THEMED_DUNGEONS[run.theme as ThemedDungeonKey];
  if (!cfg) throw new Error("unknown theme on run");
  if (run.status !== "active") throw new Error("run is not active");
  if (run.currentBattleId) {
    const cur = await prisma.battle.findUnique({ where: { id: run.currentBattleId } });
    if (cur && cur.status === "active") return cur;
  }
  if (run.currentFloor >= run.totalFloors) throw new Error("already at last floor");
  const nextFloor = run.currentFloor + 1;
  const character = await prisma.character.findUnique({ where: { id: run.characterId } });
  if (!character) throw new Error("character missing");

  let battleId: string;
  const isFinalFloor = nextFloor === run.totalFloors;
  if (isFinalFloor) {
    battleId = await startBattleForParty(run.partyId!, {
      boss: {
        slug: `themed-${cfg.key}-${run.id}`,
        name: cfg.boss.name,
        level: cfg.boss.level,
        hp: cfg.boss.hp,
        atk: cfg.boss.atk,
        def: cfg.boss.def,
        spd: cfg.boss.spd,
        element: cfg.boss.element,
        weakness: cfg.boss.weakness,
        expReward: cfg.boss.expReward,
        goldReward: cfg.boss.goldReward,
        creatureType: cfg.boss.creatureType,
        kind: "boss",
        tier: cfg.bossDropTier === "legendary" ? 3 : 2,
      },
    });
  } else {
    const enemyCount = Math.min(5, Math.max(1, Math.ceil(nextFloor * 0.7)));
    const levelShift = Math.max(0, nextFloor - 1);
    battleId = await startBattleForParty(run.partyId!, {
      enemyCount,
      level: Math.max(cfg.recommendedLevel.min, character.level + levelShift),
      townId: character.currentTownId,
    });
  }
  await prisma.battle.update({
    where: { id: battleId },
    data: { dungeonRunId: run.id },
  });
  await prisma.dungeonRun.update({
    where: { id: run.id },
    data: { currentFloor: nextFloor, currentBattleId: battleId },
  });
  return prisma.battle.findUnique({ where: { id: battleId } });
}
