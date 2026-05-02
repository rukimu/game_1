// Cycle 32: real-time interactive siege battle engine.
//
// Replaces the score-only narrative resolution in src/lib/siege.ts with a
// turn-based fight where every guild member can submit one action per turn.
//
// Lifecycle:
//   1. SiegeEvent enters "active" phase (existing src/lib/siege.ts logic).
//   2. startSiegeBattle(siegeId) creates a SiegeBattle row plus one
//      SiegeBattleGuildState per registered guild. HP = sum of member
//      (level + wins/2) — same formula previously used for the resolution
//      score, now consumed as a damage budget.
//   3. Each turn (TURN_SECONDS) every alive participant can submit one of:
//        attack (single target)        — base swing
//        aoe (no target)               — 50% to every other alive guild
//        heavy (single target)         — 1.5× swing
//        support (self)                — heal 5% of own maxHp
//        rally (master, once)          — +20% to ally damage this turn
//        cure (sub, once)              — heal 30% of own maxHp
//   4. resolveSiegeTurn rolls all submitted attack/aoe/heavy actions,
//      logs the blow-by-blow, and advances the turn or ends the battle
//      when only one guild is left standing.
//   5. endSiegeBattle promotes the result to SiegeEvent.status="ended" +
//      CastleOwnership swap + Announcement broadcast (same flow as the
//      original resolveSiege).

import { prisma } from "@/lib/prisma";
import { getIO } from "@/lib/socket";
import { awardAchievement } from "@/lib/achievements";

export const TURN_SECONDS = 30;

export type SiegeAction = "attack" | "aoe" | "heavy" | "support" | "rally" | "cure";

type LogEntry = { turn: number; kind: string; line: string };

async function appendLog(battleId: string, entries: LogEntry[]) {
  if (entries.length === 0) return;
  const b = await prisma.siegeBattle.findUnique({ where: { id: battleId } });
  if (!b) return;
  let cur: LogEntry[] = [];
  try { cur = JSON.parse(b.logJson || "[]"); } catch { cur = []; }
  const next = [...cur, ...entries].slice(-100);
  await prisma.siegeBattle.update({
    where: { id: battleId },
    data: { logJson: JSON.stringify(next) },
  });
}

// Idempotent. Creates the battle when the parent SiegeEvent is in "active"
// phase and at least one guild has registered. Returns the existing row if
// already created.
export async function startSiegeBattle(siegeId: string) {
  const existing = await prisma.siegeBattle.findUnique({ where: { siegeId } });
  if (existing) return existing;
  const siege = await prisma.siegeEvent.findUnique({
    where: { id: siegeId },
    include: { registrations: true },
  });
  if (!siege || siege.status !== "active") return null;
  if (siege.registrations.length === 0) return null;

  const battle = await prisma.siegeBattle.create({
    data: {
      siegeId,
      status: "active",
      turn: 1,
      turnEndsAt: new Date(Date.now() + TURN_SECONDS * 1000),
    },
  });

  for (const reg of siege.registrations) {
    const members = await prisma.guildMember.findMany({
      where: { guildId: reg.guildId },
      include: { character: { select: { id: true, name: true, level: true } } },
    });
    let total = 0;
    const memberSnap: Array<{ characterId: string; name: string; level: number; wins: number; role: string }> = [];
    for (const m of members) {
      const wins = await prisma.duel.count({
        where: { status: "finished", winnerCharacterId: m.characterId },
      });
      total += m.character.level + Math.floor(wins / 2);
      memberSnap.push({
        characterId: m.characterId,
        name: m.character.name,
        level: m.character.level,
        wins,
        role: m.role,
      });
    }
    const hp = Math.max(10, total);
    await prisma.siegeBattleGuildState.create({
      data: {
        siegeBattleId: battle.id,
        guildId: reg.guildId,
        hp,
        maxHp: hp,
        membersJson: JSON.stringify(memberSnap),
      },
    });
  }

  await appendLog(battle.id, [
    { turn: 0, kind: "intro", line: "攻城戦の戦闘が始まる。各ギルドは行動を選択せよ。" },
  ]);
  return battle;
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitSiegeAction(
  siegeBattleId: string,
  characterId: string,
  action: SiegeAction,
  targetGuildId?: string,
): Promise<SubmitResult> {
  const battle = await prisma.siegeBattle.findUnique({
    where: { id: siegeBattleId },
    include: { states: true },
  });
  if (!battle) return { ok: false, error: "battle_not_found" };
  if (battle.status !== "active") return { ok: false, error: "battle_not_active" };

  const member = await prisma.guildMember.findUnique({ where: { characterId } });
  if (!member) return { ok: false, error: "not_in_guild" };
  const myState = battle.states.find((s) => s.guildId === member.guildId);
  if (!myState) return { ok: false, error: "guild_not_participating" };
  if (!myState.alive) return { ok: false, error: "guild_eliminated" };

  if (action === "rally" && member.role !== "master") return { ok: false, error: "rally_requires_master" };
  if (action === "cure" && member.role !== "sub") return { ok: false, error: "cure_requires_sub" };

  const rallyUsed = parseJsonObj(battle.rallyUsedJson);
  const cureUsed = parseJsonObj(battle.cureUsedJson);
  if (action === "rally" && rallyUsed[member.guildId]) return { ok: false, error: "rally_already_used" };
  if (action === "cure" && cureUsed[member.guildId]) return { ok: false, error: "cure_already_used" };

  if (action === "attack" || action === "heavy") {
    if (!targetGuildId) return { ok: false, error: "target_required" };
    if (targetGuildId === member.guildId) return { ok: false, error: "cannot_self_target" };
    const target = battle.states.find((s) => s.guildId === targetGuildId);
    if (!target || !target.alive) return { ok: false, error: "invalid_target" };
  }

  try {
    await prisma.siegeBattleAction.create({
      data: {
        siegeBattleId,
        characterId,
        guildId: member.guildId,
        turn: battle.turn,
        actionType: action,
        targetGuildId: targetGuildId ?? null,
      },
    });
  } catch {
    return { ok: false, error: "already_acted_this_turn" };
  }

  // Rally and cure resolve immediately so other casters this turn benefit.
  if (action === "rally") {
    rallyUsed[member.guildId] = true;
    const buffs = parseJsonObj(battle.buffsJson);
    buffs[member.guildId] = { ...(buffs[member.guildId] ?? {}), rallyBoost: 0.2 };
    await prisma.siegeBattle.update({
      where: { id: siegeBattleId },
      data: {
        rallyUsedJson: JSON.stringify(rallyUsed),
        buffsJson: JSON.stringify(buffs),
      },
    });
    await appendLog(siegeBattleId, [
      { turn: battle.turn, kind: "rally", line: `[T${battle.turn}] 号令 — このターン ${member.guildId} の攻撃 +20%` },
    ]);
  }
  if (action === "cure") {
    cureUsed[member.guildId] = true;
    const heal = Math.max(1, Math.floor(myState.maxHp * 0.3));
    await prisma.siegeBattleGuildState.update({
      where: { id: myState.id },
      data: { hp: Math.min(myState.maxHp, myState.hp + heal) },
    });
    await prisma.siegeBattle.update({
      where: { id: siegeBattleId },
      data: { cureUsedJson: JSON.stringify(cureUsed) },
    });
    await appendLog(siegeBattleId, [
      { turn: battle.turn, kind: "cure", line: `[T${battle.turn}] 治療 — ${member.guildId} の HP ${heal} 回復` },
    ]);
  }

  return { ok: true };
}

// Resolve the in-flight turn: roll damage from every attack/aoe/heavy/support
// submitted, log it, advance to the next turn or end the battle. Idempotent
// — early-returns when called before turnEndsAt.
export async function resolveSiegeTurn(siegeBattleId: string) {
  const battle = await prisma.siegeBattle.findUnique({
    where: { id: siegeBattleId },
    include: { states: true, actions: true },
  });
  if (!battle || battle.status !== "active") return;
  if (battle.turnEndsAt && Date.now() < battle.turnEndsAt.getTime()) return;

  const turn = battle.turn;
  const turnActions = battle.actions.filter((a) => a.turn === turn);
  const buffs = parseJsonObj(battle.buffsJson);

  const stateMap = new Map(battle.states.map((s) => [s.guildId, { ...s }]));
  const log: LogEntry[] = [];

  for (const a of turnActions) {
    const actor = stateMap.get(a.guildId);
    if (!actor || !actor.alive) continue;
    let members: Array<{ characterId: string; name: string; level: number; wins: number; role: string }> = [];
    try { members = JSON.parse(actor.membersJson || "[]"); } catch { members = []; }
    const me = members.find((m) => m.characterId === a.characterId);
    if (!me) continue;
    const baseSwing = Math.max(1, me.level + Math.floor(me.wins / 2));
    const rallyBoost = buffs[a.guildId]?.rallyBoost ?? 0;

    if (a.actionType === "attack" && a.targetGuildId) {
      const target = stateMap.get(a.targetGuildId);
      if (!target || !target.alive) continue;
      const dmg = Math.max(1, Math.floor(baseSwing * (1 + rallyBoost)));
      target.hp -= dmg;
      log.push({
        turn,
        kind: "attack",
        line: `[T${turn}] ${actor.guildId} の ${me.name}(Lv${me.level}) → ${target.guildId}: ${dmg}`,
      });
    } else if (a.actionType === "aoe") {
      const dmgEach = Math.max(1, Math.floor(baseSwing * 0.5 * (1 + rallyBoost)));
      for (const [gid, st] of stateMap.entries()) {
        if (gid === a.guildId || !st.alive) continue;
        st.hp -= dmgEach;
      }
      log.push({
        turn,
        kind: "aoe",
        line: `[T${turn}] ${actor.guildId} の ${me.name} 全体攻撃 → 各 ${dmgEach}`,
      });
    } else if (a.actionType === "heavy" && a.targetGuildId) {
      const target = stateMap.get(a.targetGuildId);
      if (!target || !target.alive) continue;
      const dmg = Math.max(1, Math.floor(baseSwing * 1.5 * (1 + rallyBoost)));
      target.hp -= dmg;
      log.push({
        turn,
        kind: "heavy",
        line: `[T${turn}] ${actor.guildId} の ${me.name} 渾身の一撃 → ${target.guildId}: ${dmg}`,
      });
    } else if (a.actionType === "support") {
      const heal = Math.max(1, Math.floor(actor.maxHp * 0.05));
      actor.hp = Math.min(actor.maxHp, actor.hp + heal);
      log.push({
        turn,
        kind: "support",
        line: `[T${turn}] ${actor.guildId} の ${me.name} 陣形立て直し +${heal}`,
      });
    }
  }

  for (const st of stateMap.values()) {
    const wasAlive = st.alive;
    if (st.hp <= 0) {
      st.hp = 0;
      st.alive = false;
    }
    await prisma.siegeBattleGuildState.update({
      where: { id: st.id },
      data: { hp: st.hp, alive: st.alive },
    });
    if (wasAlive && !st.alive) {
      log.push({ turn, kind: "fall", line: `[T${turn}] ${st.guildId} は陣形を崩し退却した。` });
    }
  }

  await prisma.siegeBattle.update({
    where: { id: siegeBattleId },
    data: { buffsJson: "{}" },
  });
  await appendLog(siegeBattleId, log);

  const aliveGuilds = [...stateMap.values()].filter((s) => s.alive);
  if (aliveGuilds.length <= 1) {
    const winnerGuildId = aliveGuilds[0]?.guildId ?? null;
    await endSiegeBattle(siegeBattleId, winnerGuildId);
    return;
  }

  await prisma.siegeBattle.update({
    where: { id: siegeBattleId },
    data: {
      turn: turn + 1,
      turnEndsAt: new Date(Date.now() + TURN_SECONDS * 1000),
    },
  });
}

export async function endSiegeBattle(siegeBattleId: string, winnerGuildId: string | null) {
  const battle = await prisma.siegeBattle.findUnique({ where: { id: siegeBattleId } });
  if (!battle) return;
  if (battle.status === "resolved") return;
  await prisma.siegeBattle.update({
    where: { id: siegeBattleId },
    data: { status: "resolved", winningGuildId: winnerGuildId, turnEndsAt: null },
  });

  const siege = await prisma.siegeEvent.findUnique({ where: { id: battle.siegeId } });
  if (!siege) return;
  if (siege.status !== "ended") {
    await prisma.siegeEvent.update({
      where: { id: siege.id },
      data: {
        status: "ended",
        endedAt: new Date(),
        winningGuildId: winnerGuildId,
        result: winnerGuildId ? "battle_won" : "no_contest",
      },
    });
    if (winnerGuildId) {
      await prisma.castleOwnership.updateMany({
        where: { castleId: siege.castleId, endedAt: null },
        data: { endedAt: new Date() },
      });
      await prisma.castleOwnership.create({
        data: { castleId: siege.castleId, guildId: winnerGuildId },
      });
    }
    try {
      const castle = await prisma.castle.findUnique({ where: { id: siege.castleId } });
      const winnerName = winnerGuildId
        ? (await prisma.guild.findUnique({ where: { id: winnerGuildId } }))?.name ?? null
        : null;
      const a = await prisma.announcement.create({
        data: {
          title: winnerName
            ? `[攻城戦] ${castle?.name ?? "?"} の主は ${winnerName} となった`
            : `[攻城戦] ${castle?.name ?? "?"} は決着を見なかった`,
          body: winnerName
            ? `${castle?.name ?? "?"} の支配が ${winnerName} に渡った。`
            : `${castle?.name ?? "?"} の戦いは引き分けに終わった。`,
        },
      });
      getIO()?.emit("system:announcement", a);
      if (winnerGuildId) {
        const winningMembers = await prisma.guildMember.findMany({
          where: { guildId: winnerGuildId },
          select: { characterId: true },
        });
        for (const m of winningMembers) {
          try {
            await awardAchievement("siege_winner", m.characterId);
            const ownerships = await prisma.castleOwnership.count({ where: { guildId: winnerGuildId } });
            if (ownerships >= 3) await awardAchievement("siege_3_winner", m.characterId);
          } catch { /* non-fatal */ }
        }
      }
    } catch { /* non-fatal */ }
  }
}

export type SiegeBattleView = {
  id: string;
  siegeId: string;
  status: "lobby" | "active" | "resolved";
  turn: number;
  turnEndsAt: Date | null;
  winningGuildName: string | null;
  guilds: Array<{
    guildId: string;
    guildName: string;
    hp: number;
    maxHp: number;
    alive: boolean;
    members: Array<{ characterId: string; name: string; level: number; role: string }>;
    rallyUsed: boolean;
    cureUsed: boolean;
  }>;
  log: LogEntry[];
};

// Lazy-advance the turn, then return the read view. Mirrors the
// finalizeRaidIfDue pattern from C29 — read endpoints don't need a separate
// cron tick, the next reader does the work.
export async function getSiegeBattleView(siegeId: string): Promise<SiegeBattleView | null> {
  const battle = await prisma.siegeBattle.findUnique({ where: { siegeId } });
  if (!battle) return null;
  if (battle.status === "active" && battle.turnEndsAt && Date.now() >= battle.turnEndsAt.getTime()) {
    await resolveSiegeTurn(battle.id);
  }
  const reread = await prisma.siegeBattle.findUnique({
    where: { siegeId },
    include: { states: true },
  });
  if (!reread) return null;
  const guildIds = reread.states.map((s) => s.guildId);
  const guilds = guildIds.length
    ? await prisma.guild.findMany({ where: { id: { in: guildIds } } })
    : [];
  const guildById = new Map(guilds.map((g) => [g.id, g]));
  const winningGuildName = reread.winningGuildId
    ? (guildById.get(reread.winningGuildId)?.name ?? null)
    : null;
  const rallyUsed = parseJsonObj(reread.rallyUsedJson);
  const cureUsed = parseJsonObj(reread.cureUsedJson);
  return {
    id: reread.id,
    siegeId: reread.siegeId,
    status: reread.status as any,
    turn: reread.turn,
    turnEndsAt: reread.turnEndsAt ?? null,
    winningGuildName,
    guilds: reread.states.map((s) => {
      let members: Array<{ characterId: string; name: string; level: number; wins: number; role: string }> = [];
      try { members = JSON.parse(s.membersJson || "[]"); } catch { members = []; }
      return {
        guildId: s.guildId,
        guildName: guildById.get(s.guildId)?.name ?? "?",
        hp: s.hp,
        maxHp: s.maxHp,
        alive: s.alive,
        members: members.map((m) => ({ characterId: m.characterId, name: m.name, level: m.level, role: m.role })),
        rallyUsed: !!rallyUsed[s.guildId],
        cureUsed: !!cureUsed[s.guildId],
      };
    }),
    log: (() => {
      try { return JSON.parse(reread.logJson || "[]"); } catch { return []; }
    })(),
  };
}

function parseJsonObj(s: string | null | undefined): Record<string, any> {
  if (!s) return {};
  try {
    const parsed = JSON.parse(s);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
