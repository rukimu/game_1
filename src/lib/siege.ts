// Castle siege orchestration. MVP scope:
//
// - One ongoing SiegeEvent per Castle. Lazily ensure one exists when a player
//   visits /siege so we don't need a real cron daemon.
// - Three lifecycle states: pending (24h registration window), active (3h
//   combat window), ended (settled).
// - Guilds register one-shot via /api/siege/register. Their score is the
//   sum of their members' (level + 0.5 × duel wins) snapshotted at resolution.
// - On resolve: highest score wins; CastleOwnership gains a new row, the
//   previous one is closed, and an Announcement broadcasts the change.
//
// Combat is intentionally abstract — no real bracket. The whole point is to
// show that "your guild is part of weekly castle politics" and for the
// announcement to land. Future cycles can swap the score formula for actual
// arena-style fights.

import { prisma } from "@/lib/prisma";
import { getIO } from "@/lib/socket";

const REGISTRATION_HOURS = 24;
const ACTIVE_HOURS = 3;

export type SiegeView = {
  id: string;
  castleId: string;
  castleName: string;
  region: string;
  status: "pending" | "active" | "ended";
  startsAt: Date;
  endsAt: Date | null;
  registrations: Array<{ guildId: string; guildName: string; memberCount: number; score: number }>;
  winningGuildName: string | null;
  currentOwnerName: string | null;
};

// Make sure every Castle has an upcoming or ongoing siege. Returns the active
// one for that castle (creating it if missing or if the previous one ended).
export async function getOrCreateUpcomingSiege(castleId: string) {
  const existing = await prisma.siegeEvent.findFirst({
    where: { castleId, status: { in: ["pending", "active"] } },
    orderBy: { startsAt: "desc" },
  });
  if (existing) return await maybeAdvancePhase(existing.id);
  // Create a fresh one starting now (pending -> active in 24h).
  const startsAt = new Date();
  const created = await prisma.siegeEvent.create({
    data: { castleId, status: "pending", startsAt },
  });
  return created;
}

// Move a siege through phases based on wall-clock time. Idempotent.
export async function maybeAdvancePhase(siegeId: string) {
  const siege = await prisma.siegeEvent.findUnique({ where: { id: siegeId } });
  if (!siege) return null;
  const now = Date.now();
  const startMs = siege.startsAt.getTime();
  const activeAt = startMs + REGISTRATION_HOURS * 3600_000;
  const endAt = activeAt + ACTIVE_HOURS * 3600_000;
  if (siege.status === "pending" && now >= activeAt) {
    await prisma.siegeEvent.update({
      where: { id: siege.id },
      data: { status: "active" },
    });
  }
  const reread = await prisma.siegeEvent.findUnique({ where: { id: siege.id } });
  if (!reread) return null;
  if (reread.status === "active" && now >= endAt) {
    await resolveSiege(reread.id);
  }
  return prisma.siegeEvent.findUnique({ where: { id: siege.id } });
}

// Compute scores and announce a winner. Runs once per siege.
export async function resolveSiege(siegeId: string) {
  const siege = await prisma.siegeEvent.findUnique({
    where: { id: siegeId },
    include: { castle: true, registrations: true },
  });
  if (!siege || siege.status === "ended") return;

  // Score = sum over members of (level + duel_wins / 2).
  const scores: Array<{ guildId: string; score: number }> = [];
  for (const reg of siege.registrations) {
    const members = await prisma.guildMember.findMany({
      where: { guildId: reg.guildId },
      include: {
        character: {
          select: {
            id: true, level: true,
            duelsA: { where: { status: "finished", winnerCharacterId: { equals: undefined } }, select: { id: true } },
          },
        },
      },
    });
    let score = 0;
    for (const m of members) {
      const wins = await prisma.duel.count({
        where: { status: "finished", winnerCharacterId: m.characterId },
      });
      score += m.character.level + Math.floor(wins / 2);
    }
    scores.push({ guildId: reg.guildId, score });
    await prisma.siegeRegistration.update({
      where: { id: reg.id },
      data: { score },
    });
  }

  scores.sort((a, b) => b.score - a.score);
  const winner = scores[0];
  let winningGuildName: string | null = null;
  if (winner) {
    const w = await prisma.guild.findUnique({ where: { id: winner.guildId } });
    winningGuildName = w?.name ?? null;
    // Close existing ownership.
    await prisma.castleOwnership.updateMany({
      where: { castleId: siege.castleId, endedAt: null },
      data: { endedAt: new Date() },
    });
    await prisma.castleOwnership.create({
      data: { castleId: siege.castleId, guildId: winner.guildId },
    });
  }
  await prisma.siegeEvent.update({
    where: { id: siegeId },
    data: {
      status: "ended",
      endedAt: new Date(),
      winningGuildId: winner?.guildId ?? null,
      result: winningGuildName ? `winner=${winningGuildName}` : "no_contest",
    },
  });

  try {
    if (winner && winningGuildName) {
      const a = await prisma.announcement.create({
        data: {
          title: `[攻城戦] ${siege.castle.name} の主は ${winningGuildName} となった`,
          body: `${siege.castle.name} の支配が ${winningGuildName} に渡った。世界は新たな旗を見上げる。`,
        },
      });
      getIO()?.emit("system:announcement", a);
    } else {
      const a = await prisma.announcement.create({
        data: {
          title: `[攻城戦] ${siege.castle.name} は無風だった`,
          body: `この週の攻城戦には誰も挑まなかった。城は沈黙の中にある。`,
        },
      });
      getIO()?.emit("system:announcement", a);
    }
  } catch { /* non-fatal */ }
}

// Convenience: build the view a UI page wants.
export async function getSiegeViewForAllCastles(): Promise<SiegeView[]> {
  const castles = await prisma.castle.findMany({
    orderBy: { name: "asc" },
  });
  const views: SiegeView[] = [];
  for (const castle of castles) {
    const siege = await getOrCreateUpcomingSiege(castle.id);
    if (!siege) continue;
    const regs = await prisma.siegeRegistration.findMany({
      where: { siegeId: siege.id },
      include: { siege: true },
    });
    const guildIds = regs.map((r) => r.guildId);
    const guilds = guildIds.length
      ? await prisma.guild.findMany({ where: { id: { in: guildIds } }, include: { members: true } })
      : [];
    const guildById = new Map(guilds.map((g) => [g.id, g]));
    const owner = await prisma.castleOwnership.findFirst({
      where: { castleId: castle.id, endedAt: null },
      include: { guild: true },
      orderBy: { startedAt: "desc" },
    });
    const winningGuild = siege.winningGuildId
      ? await prisma.guild.findUnique({ where: { id: siege.winningGuildId }, select: { name: true } })
      : null;
    const startsAt = siege.startsAt;
    const activeAt = new Date(startsAt.getTime() + REGISTRATION_HOURS * 3600_000);
    const endAt = new Date(activeAt.getTime() + ACTIVE_HOURS * 3600_000);
    views.push({
      id: siege.id,
      castleId: castle.id,
      castleName: castle.name,
      region: castle.region,
      status: siege.status as any,
      startsAt: siege.startsAt,
      endsAt: siege.status === "ended" ? siege.endedAt : endAt,
      registrations: regs.map((r) => {
        const g = guildById.get(r.guildId);
        return {
          guildId: r.guildId,
          guildName: g?.name ?? "不明",
          memberCount: g?.members.length ?? 0,
          score: r.score,
        };
      }),
      winningGuildName: winningGuild?.name ?? null,
      currentOwnerName: owner?.guild?.name ?? null,
    });
  }
  return views;
}

export async function registerGuildForSiege(siegeId: string, guildId: string): Promise<{ ok: boolean; error?: string }> {
  const siege = await maybeAdvancePhase(siegeId);
  if (!siege) return { ok: false, error: "攻城戦が見つかりません" };
  if (siege.status !== "pending") return { ok: false, error: "登録期間は終了しています" };
  try {
    await prisma.siegeRegistration.create({ data: { siegeId, guildId } });
    return { ok: true };
  } catch {
    return { ok: false, error: "既に登録済みです" };
  }
}
