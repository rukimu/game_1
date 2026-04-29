import { prisma } from "@/lib/prisma";
import { startBattleForParty } from "@/lib/battle";
import { awardExpAndGold } from "@/lib/leveling";
import { getContentGenerationService } from "@/lib/generation/service";
import { tickMasteryProgress } from "@/lib/mastery";
import { tickDailyChallenge } from "@/lib/dailyChallenge";

// Dungeons are short multi-floor adventures. Rewards from each cleared floor
// accumulate in DungeonRun and are only paid out when the player retreats
// safely. Death halves the accumulated rewards. Each floor multiplies the
// danger and the payout.

export async function createDungeonRun(characterId: string, opts?: { floors?: number }) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { partyMembers: true },
  });
  if (!character) throw new Error("character not found");
  const totalFloors = opts?.floors ?? 3 + Math.floor(Math.random() * 3); // 3-5
  const gen = getContentGenerationService();
  const name = await gen.generateDungeonName({ level: character.level });
  // ensure character is in some party (solo or existing)
  let partyId = character.partyMembers[0]?.partyId;
  if (!partyId) {
    const party = await prisma.party.create({
      data: {
        name: `${character.name}の探索`,
        leaderCharacterId: character.id,
        isOpen: false,
        members: { create: [{ characterId: character.id }] },
      },
    });
    partyId = party.id;
  }
  const run = await prisma.dungeonRun.create({
    data: { characterId, partyId, name, totalFloors, currentFloor: 0 },
  });
  return run;
}

export async function getDungeonRun(runId: string) {
  return prisma.dungeonRun.findUnique({
    where: { id: runId },
    include: { character: true },
  });
}

// Start the next floor. Returns the newly created battle.
export async function advanceDungeonFloor(runId: string) {
  const run = await prisma.dungeonRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("run not found");
  if (run.status !== "active") throw new Error("run is not active");
  if (run.currentBattleId) {
    const cur = await prisma.battle.findUnique({ where: { id: run.currentBattleId } });
    if (cur && cur.status === "active") {
      // already a battle in progress
      return cur;
    }
  }
  if (run.currentFloor >= run.totalFloors) throw new Error("already at last floor");
  const nextFloor = run.currentFloor + 1;
  const character = await prisma.character.findUnique({ where: { id: run.characterId } });
  if (!character) throw new Error("character missing");
  // Floor scaling: floor 1 = a normal solo-able encounter (1 enemy), floors
  // 2+ ramp up so the "advance vs retreat" decision becomes a real risk.
  // 1 → 1, 2 → 2, 3 → 3, 4 → 3, 5 → 4
  const enemyCount = Math.min(5, Math.max(1, Math.ceil(nextFloor * 0.7)));
  const levelShift = Math.max(0, nextFloor - 1);
  const battleId = await startBattleForParty(run.partyId!, {
    enemyCount,
    level: Math.max(1, character.level + levelShift),
    townId: character.currentTownId,
  });
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

// Called from battle resolve when a dungeon battle ends. Adds rewards to the
// run instead of awarding them directly to characters. On loss, the run dies.
export async function onDungeonBattleEnded(args: {
  runId: string;
  result: "win" | "lose";
  totalExp: number;
  totalGold: number;
}) {
  const run = await prisma.dungeonRun.findUnique({
    where: { id: args.runId },
    include: { character: true },
  });
  if (!run || run.status !== "active") return;
  if (args.result === "lose") {
    // Dead: settle with half rewards
    const exp = Math.floor(run.accumulatedExp / 2);
    const gold = Math.floor(run.accumulatedGold / 2);
    if (exp > 0 || gold > 0) {
      await awardExpAndGold(run.characterId, exp, gold);
    }
    await prisma.dungeonRun.update({
      where: { id: run.id },
      data: {
        status: "dead",
        endedAt: new Date(),
        currentBattleId: null,
      },
    });
    return;
  }
  // Win: accumulate (with small floor bonus)
  const floorBonus = 1 + run.currentFloor * 0.15;
  const expGain = Math.floor(args.totalExp * floorBonus);
  const goldGain = Math.floor(args.totalGold * floorBonus);
  const status = run.currentFloor >= run.totalFloors ? "cleared" : "active";
  const updates: any = {
    accumulatedExp: { increment: expGain },
    accumulatedGold: { increment: goldGain },
    currentBattleId: null,
  };
  if (status === "cleared") {
    updates.status = "cleared";
  }
  await prisma.dungeonRun.update({ where: { id: run.id }, data: updates });
  // Hook mastery / daily progress when the run is fully cleared.
  if (status === "cleared") {
    try {
      if (run.theme) {
        await tickMasteryProgress({
          characterId: run.characterId,
          goalType: "clear_themed_dungeon",
          goalParam: run.theme,
          delta: 1,
        });
      }
      await tickDailyChallenge({ characterId: run.characterId, goalType: "clear_dungeon", delta: 1 });
    } catch { /* non-fatal */ }
  }
}

// Retreat: settle accumulated rewards safely.
export async function retreatDungeonRun(runId: string) {
  const run = await prisma.dungeonRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("no run");
  if (run.status === "dead") throw new Error("already dead");
  if (run.currentBattleId) {
    const battle = await prisma.battle.findUnique({ where: { id: run.currentBattleId } });
    if (battle && battle.status === "active") throw new Error("戦闘中は撤退できません");
  }
  await awardExpAndGold(run.characterId, run.accumulatedExp, run.accumulatedGold);
  await prisma.dungeonRun.update({
    where: { id: run.id },
    data: {
      status: run.status === "cleared" ? "cleared" : "aborted",
      endedAt: new Date(),
      currentBattleId: null,
    },
  });
  // Daily challenge: clearing or retreating both count as "clear_dungeon" for
  // today's daily — the goal is "踏破する（撤退でも可）". Themed mastery only
  // ticks on a real clear (handled in onDungeonBattleEnded).
  try {
    await tickDailyChallenge({ characterId: run.characterId, goalType: "clear_dungeon", delta: 1 });
  } catch { /* non-fatal */ }
  return run;
}

// On final clear, settle automatically.
export async function settleClearedRun(runId: string) {
  const run = await prisma.dungeonRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "cleared") return null;
  await awardExpAndGold(run.characterId, run.accumulatedExp, run.accumulatedGold);
  await prisma.dungeonRun.update({
    where: { id: runId },
    data: { endedAt: new Date(), currentBattleId: null, status: "cleared" },
  });
  return run;
}
