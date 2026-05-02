// Cycle 34: 無限階ダンジョン「奈落」.
//
// Endgame loop sitting on top of the existing battle engine. Difficulty
// and reward scale exponentially with floor. Player advances or retreats
// each floor; death halves the accumulated reward. Each 10th floor
// spawns a deterministic boss whose name comes from ABYSS_BOSSES.
//
// Lifecycle:
//   1. enterAbyss(characterId) creates an active AbyssRun, ensures the
//      character has a (solo) party.
//   2. advanceAbyssFloor(runId) starts the next-floor battle, tags it
//      with abyssRunId so onAbyssBattleEnded picks it up later.
//   3. battle.ts -> resolveTurn -> end-of-battle hook calls
//      onAbyssBattleEnded(battleId, victorious) which either banks the
//      floor's reward or halves accumulated and ends the run as "dead".
//   4. retreat(runId) ends the run as "aborted", paying out the full
//      accumulated reward.
//   5. Whichever way the run ends, the weekly record (max floor + total
//      gold/exp + attempts) is upserted.

import { prisma } from "@/lib/prisma";
import { startBattleForParty } from "@/lib/battle";
import { awardExpAndGold } from "@/lib/leveling";

const BASE_FLOOR_GOLD = 30;
const BASE_FLOOR_EXP = 50;
// 1.15 ^ floor compounds roughly to 4× by floor 10, 16× by floor 20.
const REWARD_GROWTH = 1.15;
const ENEMY_LEVEL_GROWTH = 1.0; // 1 level per floor on top of character level
const BOSS_FLOOR_INTERVAL = 10;

// Boss roster for the milestone floors. floor=10 → ABYSS_BOSSES[0],
// floor=20 → [1], etc. Loops back at the end so deep dives stay flavored.
const ABYSS_BOSSES = [
  { name: "深淵の門番", element: "dark" },
  { name: "鎖を握る巨腕", element: "earth" },
  { name: "凍てつく眠り姫", element: "water" },
  { name: "灰塵を喰らう蛇", element: "fire" },
  { name: "影絵の指揮者", element: "dark" },
  { name: "光を盗む天秤", element: "light" },
  { name: "千の声を持つ人形", element: null },
  { name: "鏡映の自我", element: null },
  { name: "終末を歌う鐘", element: "wind" },
  { name: "奈落の真の主", element: "dark" },
];

export function getCurrentWeekKey(d: Date = new Date()): string {
  // ISO week. Year of week may differ from calendar year at boundaries;
  // we just use the calendar year for simplicity here — close enough for
  // a weekly leaderboard reset.
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(
    ((target.getTime() - firstThursday.getTime()) / 86400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
  );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function getActiveAbyssRun(characterId: string) {
  return prisma.abyssRun.findFirst({
    where: { characterId, status: "active" },
    orderBy: { startedAt: "desc" },
  });
}

export async function enterAbyss(characterId: string) {
  const existing = await getActiveAbyssRun(characterId);
  if (existing) return existing;
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { partyMembers: true },
  });
  if (!character) throw new Error("character_not_found");
  let partyId = character.partyMembers[0]?.partyId ?? null;
  if (!partyId) {
    const party = await prisma.party.create({
      data: {
        name: `${character.name}の奈落`,
        leaderCharacterId: character.id,
        isOpen: false,
        members: { create: [{ characterId: character.id }] },
      },
    });
    partyId = party.id;
  }
  return prisma.abyssRun.create({
    data: { characterId, partyId, currentFloor: 0, status: "active" },
  });
}

export async function advanceAbyssFloor(runId: string) {
  const run = await prisma.abyssRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("run_not_found");
  if (run.status !== "active") throw new Error("run_not_active");
  if (run.currentBattleId) {
    const cur = await prisma.battle.findUnique({ where: { id: run.currentBattleId } });
    if (cur && cur.status === "active") return cur;
  }
  const nextFloor = run.currentFloor + 1;
  const character = await prisma.character.findUnique({ where: { id: run.characterId } });
  if (!character) throw new Error("character_missing");
  const isBossFloor = nextFloor % BOSS_FLOOR_INTERVAL === 0;
  // Boss floors: 1 strong enemy. Regular floors: 1-3 scaling with floor.
  const enemyCount = isBossFloor ? 1 : Math.min(5, Math.max(1, Math.ceil(nextFloor / 5)));
  const enemyLevel = Math.max(1, Math.floor(character.level + nextFloor * ENEMY_LEVEL_GROWTH));
  const battleId = await startBattleForParty(run.partyId!, {
    enemyCount,
    level: enemyLevel,
    townId: character.currentTownId,
    // We don't currently surface the boss flag through startBattleForParty,
    // so the battle engine treats this as a normal fight. The boss flavor
    // shows up in the abyss UI via the floor number; reward bumps come
    // from the floor multiplier itself.
  });
  await prisma.battle.update({
    where: { id: battleId },
    data: { abyssRunId: run.id },
  });
  await prisma.abyssRun.update({
    where: { id: run.id },
    data: { currentFloor: nextFloor, currentBattleId: battleId },
  });
  return prisma.battle.findUnique({ where: { id: battleId } });
}

// Called by battle.ts at end-of-battle. victorious=true bumps floor reward
// into the run's accumulator and frees the slot for the next floor.
// victorious=false halves the accumulated rewards, ends the run as dead.
export async function onAbyssBattleEnded(battleId: string, victorious: boolean) {
  const battle = await prisma.battle.findUnique({ where: { id: battleId } });
  if (!battle?.abyssRunId) return;
  const run = await prisma.abyssRun.findUnique({ where: { id: battle.abyssRunId } });
  if (!run || run.status !== "active") return;

  if (victorious) {
    const floorGold = Math.floor(BASE_FLOOR_GOLD * Math.pow(REWARD_GROWTH, run.currentFloor));
    const floorExp = Math.floor(BASE_FLOOR_EXP * Math.pow(REWARD_GROWTH, run.currentFloor));
    await prisma.abyssRun.update({
      where: { id: run.id },
      data: {
        accumulatedGold: { increment: floorGold },
        accumulatedExp: { increment: floorExp },
        currentBattleId: null,
      },
    });
    return;
  }
  // Defeat: halve accumulated, mark run dead, pay out half + record week.
  const halfGold = Math.floor(run.accumulatedGold / 2);
  const halfExp = Math.floor(run.accumulatedExp / 2);
  await prisma.abyssRun.update({
    where: { id: run.id },
    data: {
      status: "dead",
      endedAt: new Date(),
      accumulatedGold: halfGold,
      accumulatedExp: halfExp,
      currentBattleId: null,
    },
  });
  if (halfGold > 0 || halfExp > 0) {
    try { await awardExpAndGold(run.characterId, halfExp, halfGold); } catch { /* non-fatal */ }
  }
  await upsertWeeklyRecord(run.characterId, run.currentFloor, halfGold, halfExp);
}

export async function retreatAbyss(runId: string) {
  const run = await prisma.abyssRun.findUnique({ where: { id: runId } });
  if (!run) return { ok: false, error: "run_not_found" } as const;
  if (run.status !== "active") return { ok: false, error: "run_not_active" } as const;
  // If a battle is in progress, can't retreat — must finish it first.
  if (run.currentBattleId) {
    const cur = await prisma.battle.findUnique({ where: { id: run.currentBattleId } });
    if (cur && cur.status === "active") return { ok: false, error: "battle_in_progress" } as const;
  }
  await prisma.abyssRun.update({
    where: { id: run.id },
    data: { status: "aborted", endedAt: new Date() },
  });
  if (run.accumulatedGold > 0 || run.accumulatedExp > 0) {
    try { await awardExpAndGold(run.characterId, run.accumulatedExp, run.accumulatedGold); } catch { /* non-fatal */ }
  }
  await upsertWeeklyRecord(run.characterId, run.currentFloor, run.accumulatedGold, run.accumulatedExp);
  return { ok: true, paidGold: run.accumulatedGold, paidExp: run.accumulatedExp, floor: run.currentFloor } as const;
}

async function upsertWeeklyRecord(characterId: string, floor: number, gold: number, exp: number) {
  const weekKey = getCurrentWeekKey();
  const existing = await prisma.abyssWeeklyRecord.findUnique({
    where: { characterId_weekKey: { characterId, weekKey } },
  });
  if (existing) {
    await prisma.abyssWeeklyRecord.update({
      where: { id: existing.id },
      data: {
        maxFloor: Math.max(existing.maxFloor, floor),
        totalGold: existing.totalGold + gold,
        totalExp: existing.totalExp + exp,
        attempts: existing.attempts + 1,
      },
    });
  } else {
    await prisma.abyssWeeklyRecord.create({
      data: {
        characterId,
        weekKey,
        maxFloor: floor,
        totalGold: gold,
        totalExp: exp,
        attempts: 1,
      },
    });
  }
}

export type AbyssLeaderboardEntry = {
  characterId: string;
  characterName: string;
  maxFloor: number;
  totalGold: number;
  attempts: number;
};

export async function getWeeklyAbyssLeaderboard(limit = 20): Promise<AbyssLeaderboardEntry[]> {
  const weekKey = getCurrentWeekKey();
  const rows = await prisma.abyssWeeklyRecord.findMany({
    where: { weekKey },
    orderBy: { maxFloor: "desc" },
    take: limit,
    include: { character: { select: { name: true } } },
  });
  return rows.map((r) => ({
    characterId: r.characterId,
    characterName: r.character.name,
    maxFloor: r.maxFloor,
    totalGold: r.totalGold,
    attempts: r.attempts,
  }));
}

export function abyssBossNameForFloor(floor: number): string | null {
  if (floor <= 0 || floor % BOSS_FLOOR_INTERVAL !== 0) return null;
  const idx = Math.floor((floor - 1) / BOSS_FLOOR_INTERVAL) % ABYSS_BOSSES.length;
  return ABYSS_BOSSES[idx].name;
}
