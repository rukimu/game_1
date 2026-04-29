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
import { awardAchievement } from "@/lib/achievements";

// Narrative siege log shape. Each entry is { round, kind, line }.
// kind=attack means a champion landed a hit; kind=summary closes the log.
export type SiegeLogEntry = {
  round: number;
  kind: "intro" | "attack" | "rally" | "summary";
  line: string;
};

// Build the blow-by-blow log without changing scores. The actual outcome is
// already decided by score; this just dramatizes how the points were earned.
function generateSiegeBattleLog(
  castleName: string,
  blocks: Array<{ guildName: string; score: number; champions: Array<{ name: string; level: number; wins: number }> }>,
): SiegeLogEntry[] {
  const log: SiegeLogEntry[] = [];
  if (blocks.length === 0) {
    log.push({ round: 0, kind: "intro", line: `${castleName} の城門は閉ざされたまま、登録ギルドが現れなかった。` });
    log.push({ round: 0, kind: "summary", line: "城は沈黙のうちに今週を終える。" });
    return log;
  }
  const intro = blocks.length === 1
    ? `${castleName} の城下に ${blocks[0].guildName} の旗が立った。誰も対抗者は現れない。`
    : `${castleName} の城門前に ${blocks.length} ギルドが集結。鐘が鳴り、攻城戦が始まる。`;
  log.push({ round: 0, kind: "intro", line: intro });

  // Track per-guild "remaining damage budget" derived from score. Each round
  // chips away at the budget until somebody runs out — which determines the
  // narrative defeat order, even though the final winner is already chosen
  // by total score.
  const tracks = blocks.map((b) => ({
    name: b.guildName,
    remaining: Math.max(1, b.score),
    champions: b.champions.length > 0 ? b.champions : [{ name: "無名兵", level: 1, wins: 0 }],
    fallen: false,
  }));
  // 6 rounds tend to be enough to feel like a battle without dragging.
  const ROUNDS = 6;
  for (let r = 1; r <= ROUNDS; r++) {
    const standing = tracks.filter((t) => !t.fallen);
    if (standing.length <= 1) break;
    // Each standing track narrates one champion swing this round.
    for (const t of standing) {
      const champ = t.champions[(r - 1) % t.champions.length];
      const targets = standing.filter((x) => x !== t);
      const target = targets[Math.floor(Math.random() * targets.length)];
      if (!target) continue;
      const swing = Math.max(1, Math.floor((champ.level + champ.wins / 2) * 0.6));
      target.remaining -= swing;
      log.push({
        round: r,
        kind: "attack",
        line: `[R${r}] ${t.name} の ${champ.name}(Lv${champ.level}) が ${target.name} 陣に踏み込み ${swing} を削る。`,
      });
      if (target.remaining <= 0 && !target.fallen) {
        target.fallen = true;
        log.push({
          round: r,
          kind: "rally",
          line: `   └ ${target.name} は陣形を崩し、城門前から退いた。`,
        });
      }
    }
  }
  // Closing line uses the actual winner (highest original score).
  const winner = [...blocks].sort((a, b) => b.score - a.score)[0];
  log.push({
    round: ROUNDS + 1,
    kind: "summary",
    line: `★ ${castleName} は ${winner.guildName} の旗の下に降った。総スコア ${winner.score}。`,
  });
  return log;
}

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
  battleLog: SiegeLogEntry[];
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

  // Per-guild aggregate score AND a per-guild "champion" pool (top 3 members
  // by Lv + wins) so we can dramatize the resolution turn-by-turn.
  type GuildBlock = {
    guildId: string;
    guildName: string;
    score: number;
    champions: Array<{ name: string; level: number; wins: number }>;
  };
  const blocks: GuildBlock[] = [];
  for (const reg of siege.registrations) {
    const members = await prisma.guildMember.findMany({
      where: { guildId: reg.guildId },
      include: { character: { select: { id: true, name: true, level: true } } },
    });
    let score = 0;
    const champions: GuildBlock["champions"] = [];
    for (const m of members) {
      const wins = await prisma.duel.count({
        where: { status: "finished", winnerCharacterId: m.characterId },
      });
      score += m.character.level + Math.floor(wins / 2);
      champions.push({ name: m.character.name, level: m.character.level, wins });
    }
    champions.sort((a, b) => (b.level + b.wins / 2) - (a.level + a.wins / 2));
    const guild = await prisma.guild.findUnique({ where: { id: reg.guildId } });
    blocks.push({
      guildId: reg.guildId,
      guildName: guild?.name ?? "不明",
      score,
      champions: champions.slice(0, 3),
    });
    await prisma.siegeRegistration.update({
      where: { id: reg.id },
      data: { score },
    });
  }

  blocks.sort((a, b) => b.score - a.score);
  const winner = blocks[0];
  const winningGuildName = winner?.guildName ?? null;

  // Generate a narrative blow-by-blow log so the siege page can show what
  // actually happened. Each round each side's strongest still-standing
  // champion contributes a portion of their score, narrated as an attack.
  const logLines = generateSiegeBattleLog(siege.castle.name, blocks);

  if (winner) {
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
      battleLogJson: JSON.stringify(logLines),
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
      // Award siege victory achievements to every member of the winning guild.
      const winningMembers = await prisma.guildMember.findMany({
        where: { guildId: winner.guildId },
        select: { characterId: true },
      });
      for (const m of winningMembers) {
        try {
          await awardAchievement("siege_winner", m.characterId);
          // siege_3_winner: count distinct castles owned by this character's guild over time.
          const ownerships = await prisma.castleOwnership.count({
            where: { guildId: winner.guildId },
          });
          if (ownerships >= 3) await awardAchievement("siege_3_winner", m.characterId);
        } catch { /* non-fatal */ }
      }
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
    let battleLog: SiegeLogEntry[] = [];
    try { battleLog = JSON.parse(siege.battleLogJson || "[]"); } catch { battleLog = []; }
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
      battleLog,
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
