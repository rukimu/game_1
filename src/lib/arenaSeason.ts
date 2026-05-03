// Cycle 36: arena ELO seasonal regression. Every Monday (or any time
// applyRegressionIfDue is called past the next-Monday boundary) every
// character's duelRating regresses 50% of the way back to the 1500
// baseline. Prevents permanent rating bloat from the early-active set,
// keeps the leaderboard meaningful for new climbers each season.
//
// Stored as a single WorldState-style row keyed by ISO week. We don't
// add a new table — the marker is just the latest "week applied" key
// kept in a singleton settings row (uses prisma.season metadata).

import { prisma } from "@/lib/prisma";

const BASELINE = 1500;
const REGRESS_FACTOR = 0.5; // half-way back to baseline

function isoWeekKey(d: Date = new Date()): string {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(
    ((target.getTime() - firstThu.getTime()) / 86400_000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7,
  );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const MARKER_NAME = "_arena_regression_marker";

export async function applyArenaRegressionIfDue() {
  const week = isoWeekKey();
  const marker = await prisma.season.findFirst({ where: { name: MARKER_NAME } });
  if (marker?.rules === week) return { applied: false, week } as const;

  const chars = await prisma.character.findMany({ select: { id: true, duelRating: true } });
  let updated = 0;
  for (const c of chars) {
    if (c.duelRating === BASELINE) continue;
    const next = Math.round(c.duelRating + (BASELINE - c.duelRating) * REGRESS_FACTOR);
    if (next !== c.duelRating) {
      await prisma.character.update({ where: { id: c.id }, data: { duelRating: next } });
      updated++;
    }
  }
  if (marker) {
    await prisma.season.update({ where: { id: marker.id }, data: { rules: week } });
  } else {
    await prisma.season.create({
      data: {
        name: MARKER_NAME,
        rules: week,
        isCurrent: false,
        expectedDurationDays: 0,
      },
    });
  }
  return { applied: true, week, updated } as const;
}
