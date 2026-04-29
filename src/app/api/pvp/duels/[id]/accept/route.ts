import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { computeCombatStats, computeCombatEffects } from "@/lib/equipment";
import type { AggregatedEffects } from "@/lib/affixes";
import { awardAchievement } from "@/lib/achievements";

type Combatant = {
  id: string;
  name: string;
  hp: number; maxHp: number;
  atk: number; def: number; spd: number;
  effects: AggregatedEffects;
};

// MVP simulate now reads the same equipment + affix layer as PvE combat. A
// duel between two warriors carrying very different gear actually produces
// different outcomes than a base-stats brawl. PvP loss still has no resource
// cost — only ranking/record updates downstream.
function simulate(a: Combatant, b: Combatant) {
  const log: string[] = [];
  let ahp = a.hp;
  let bhp = b.hp;
  let turn = 1;
  while (ahp > 0 && bhp > 0 && turn < 30) {
    const aFirst = (a.spd + Math.random() * 5) >= (b.spd + Math.random() * 5);
    const order = aFirst ? [a, b] : [b, a];
    for (const attacker of order) {
      const defender = attacker === a ? b : a;
      const baseDmg = Math.max(1, Math.floor(attacker.atk * (1 + Math.random() * 0.4) - defender.def * 0.6));
      // Apply crit + lifesteal. Slay does not apply (defender has no
      // creatureType in PvP — players are players, not "humanoid mobs").
      const critRate = Math.min(60, 5 + attacker.effects.critRateBonus);
      const isCrit = Math.random() * 100 < critRate;
      const critMult = isCrit ? 1.5 + attacker.effects.critDamageBonus / 100 : 1.0;
      const dmg = Math.max(1, Math.floor(baseDmg * critMult));
      if (attacker === a) bhp -= dmg; else ahp -= dmg;
      const tag = isCrit ? "【クリティカル！】" : "";
      log.push(`T${turn}: ${attacker.name}の攻撃 → ${defender.name}に${dmg}ダメージ${tag}`);
      // Lifesteal heals attacker
      if (attacker.effects.lifestealPercent > 0) {
        const heal = Math.max(1, Math.floor(dmg * attacker.effects.lifestealPercent / 100));
        if (attacker === a) ahp = Math.min(ahp + heal, a.maxHp);
        else bhp = Math.min(bhp + heal, b.maxHp);
        log.push(`  └ ${attacker.name}は ${heal} HP を吸収した。`);
      }
      if (ahp <= 0 || bhp <= 0) break;
    }
    turn++;
  }
  const winner = ahp > bhp ? a : b;
  log.push(`勝者: ${winner.name}`);
  return { winner, log };
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const duel = await prisma.duel.findUnique({
    where: { id: params.id },
    include: { challenger: true, opponent: true },
  });
  if (!duel || duel.status !== "pending") return NextResponse.json({ error: "不正な決闘" }, { status: 400 });
  if (duel.opponentCharacterId !== c.id) return NextResponse.json({ error: "あなた宛てではありません" }, { status: 403 });
  // Build combatant records using equipment-aware stats so gear matters.
  const [aStats, bStats, aEff, bEff] = await Promise.all([
    computeCombatStats(duel.challenger.id),
    computeCombatStats(duel.opponent.id),
    computeCombatEffects(duel.challenger.id),
    computeCombatEffects(duel.opponent.id),
  ]);
  const a: Combatant = {
    id: duel.challenger.id, name: duel.challenger.name,
    hp: aStats?.maxHp ?? duel.challenger.maxHp,
    maxHp: aStats?.maxHp ?? duel.challenger.maxHp,
    atk: aStats?.atk ?? duel.challenger.atk,
    def: aStats?.def ?? duel.challenger.def,
    spd: aStats?.spd ?? duel.challenger.spd,
    effects: aEff,
  };
  const b: Combatant = {
    id: duel.opponent.id, name: duel.opponent.name,
    hp: bStats?.maxHp ?? duel.opponent.maxHp,
    maxHp: bStats?.maxHp ?? duel.opponent.maxHp,
    atk: bStats?.atk ?? duel.opponent.atk,
    def: bStats?.def ?? duel.opponent.def,
    spd: bStats?.spd ?? duel.opponent.spd,
    effects: bEff,
  };
  const { winner, log } = simulate(a, b);
  // ELO update — K=32, 400-pt scale. Winner gains, loser loses; sum stays
  // zero so the leaderboard reflects relative skill rather than activity.
  const ratings = await prisma.character.findMany({
    where: { id: { in: [duel.challengerCharacterId, duel.opponentCharacterId] } },
    select: { id: true, duelRating: true },
  });
  const ratingByCid = new Map(ratings.map((r) => [r.id, r.duelRating]));
  const aRat = ratingByCid.get(duel.challengerCharacterId) ?? 1500;
  const bRat = ratingByCid.get(duel.opponentCharacterId) ?? 1500;
  const expectedA = 1 / (1 + Math.pow(10, (bRat - aRat) / 400));
  const aWon = winner.id === duel.challengerCharacterId;
  const K = 32;
  const newA = Math.round(aRat + K * ((aWon ? 1 : 0) - expectedA));
  const newB = Math.round(bRat + K * ((aWon ? 0 : 1) - (1 - expectedA)));
  log.push(`レート更新: ${duel.challenger.name} ${aRat}→${newA} / ${duel.opponent.name} ${bRat}→${newB}`);
  await prisma.$transaction([
    prisma.duel.update({
      where: { id: duel.id },
      data: { status: "finished", winnerCharacterId: winner.id, log: JSON.stringify(log), resolvedAt: new Date() },
    }),
    prisma.character.update({ where: { id: duel.challengerCharacterId }, data: { duelRating: newA } }),
    prisma.character.update({ where: { id: duel.opponentCharacterId }, data: { duelRating: newB } }),
  ]);
  // Achievement hooks: first duel, win-count tiers.
  for (const cid of [duel.challengerCharacterId, duel.opponentCharacterId]) {
    try { await awardAchievement("first_duel", cid); } catch { /* non-fatal */ }
  }
  try {
    const wins = await prisma.duel.count({
      where: { status: "finished", winnerCharacterId: winner.id },
    });
    if (wins >= 5) await awardAchievement("duel_5_wins", winner.id);
    if (wins >= 25) await awardAchievement("duel_25_wins", winner.id);
    if (wins >= 100) await awardAchievement("duel_100_wins", winner.id);
    // Rating-threshold titles.
    const winnerRating = winner.id === duel.challengerCharacterId ? newA : newB;
    if (winnerRating >= 1700) await awardAchievement("duel_rating_1700", winner.id);
    if (winnerRating >= 1900) await awardAchievement("duel_rating_1900", winner.id);
    if (winnerRating >= 2100) await awardAchievement("duel_rating_2100", winner.id);
  } catch { /* non-fatal */ }
  // Auto-grant top-rated arena titles. We compute the leaderboard right here
  // since rating just changed; eligible characters need at least 5 finished
  // duels so a single match can't punt anyone into "top 1".
  try {
    const ratedTop = await prisma.character.findMany({
      where: {
        OR: [
          { duelsA: { some: { status: "finished" } } },
          { duelsB: { some: { status: "finished" } } },
        ],
      },
      select: { id: true },
      orderBy: { duelRating: "desc" },
      take: 10,
    });
    const winsByCid = new Map<string, number>();
    if (ratedTop.length > 0) {
      const winsAgg = await prisma.duel.groupBy({
        by: ["winnerCharacterId"],
        where: { status: "finished", winnerCharacterId: { in: ratedTop.map((r) => r.id) } },
        _count: { _all: true },
      });
      for (const w of winsAgg) {
        if (w.winnerCharacterId) winsByCid.set(w.winnerCharacterId, w._count._all);
      }
    }
    for (let idx = 0; idx < ratedTop.length; idx++) {
      const cid = ratedTop[idx].id;
      const w = winsByCid.get(cid) ?? 0;
      if (w < 5) continue; // need a real track record
      if (idx < 1) await awardAchievement("arena_top_1", cid);
      if (idx < 5) await awardAchievement("arena_top_5", cid);
      if (idx < 10) await awardAchievement("arena_top_10", cid);
    }
  } catch { /* non-fatal */ }
  return NextResponse.json({
    winnerName: winner.name,
    log,
    ratingChange: {
      [duel.challenger.name]: { before: aRat, after: newA },
      [duel.opponent.name]: { before: bRat, after: newB },
    },
  });
}
