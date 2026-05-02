// Cycle 34: ascension (転生) — Lv50 reset that carries permanent bonuses
// across generations. Achievements/titles persist; the character returns
// to Lv1 with the current job's base stats + a cumulative bonus.

import { prisma } from "@/lib/prisma";
import { applyJobBaseStats } from "@/lib/leveling";
import { getIO } from "@/lib/socket";

export type AscensionBonus = {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  spd: number;
};

// Per-generation bonus is flat-applied on top of the job's base stats
// after each level reset. Values are per-generation, not cumulative;
// totals are computed by multiplying with character.generation.
const PER_GENERATION_BONUS: AscensionBonus = {
  hp: 5,
  mp: 2,
  atk: 2,
  def: 1,
  mat: 2,
  mdf: 1,
  spd: 1,
};

export function bonusForGeneration(gen: number): AscensionBonus {
  return {
    hp: PER_GENERATION_BONUS.hp * gen,
    mp: PER_GENERATION_BONUS.mp * gen,
    atk: PER_GENERATION_BONUS.atk * gen,
    def: PER_GENERATION_BONUS.def * gen,
    mat: PER_GENERATION_BONUS.mat * gen,
    mdf: PER_GENERATION_BONUS.mdf * gen,
    spd: PER_GENERATION_BONUS.spd * gen,
  };
}

export function parseAscensionBonus(raw: string | null | undefined): AscensionBonus | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      hp: Number(parsed.hp) || 0,
      mp: Number(parsed.mp) || 0,
      atk: Number(parsed.atk) || 0,
      def: Number(parsed.def) || 0,
      mat: Number(parsed.mat) || 0,
      mdf: Number(parsed.mdf) || 0,
      spd: Number(parsed.spd) || 0,
    };
  } catch {
    return null;
  }
}

export async function canAscend(characterId: string): Promise<{ ok: boolean; reason?: string }> {
  const c = await prisma.character.findUnique({ where: { id: characterId } });
  if (!c) return { ok: false, reason: "character_not_found" };
  if (c.level < 50) return { ok: false, reason: "requires_lv50" };
  if (c.isCursed) return { ok: false, reason: "cursed_cannot_ascend" };
  return { ok: true };
}

export async function ascendCharacter(characterId: string) {
  const check = await canAscend(characterId);
  if (!check.ok) return { ok: false as const, error: check.reason ?? "ascend_blocked" };
  const c = await prisma.character.findUnique({ where: { id: characterId } });
  if (!c) return { ok: false as const, error: "character_not_found" };
  const job = c.currentJobId
    ? await prisma.job.findUnique({ where: { id: c.currentJobId } })
    : null;
  const baseStats = job ? JSON.parse(job.baseStats) : { hp: 30, mp: 10, atk: 8, def: 4, mat: 6, mdf: 4, spd: 6 };
  const newGen = c.generation + 1;
  const bonus = bonusForGeneration(newGen);
  const base = applyJobBaseStats(baseStats);
  const updated = await prisma.character.update({
    where: { id: characterId },
    data: {
      level: 1,
      exp: 0,
      hp: base.maxHp + bonus.hp,
      maxHp: base.maxHp + bonus.hp,
      mp: base.maxMp + bonus.mp,
      maxMp: base.maxMp + bonus.mp,
      atk: base.atk + bonus.atk,
      def: base.def + bonus.def,
      mat: base.mat + bonus.mat,
      mdf: base.mdf + bonus.mdf,
      spd: base.spd + bonus.spd,
      generation: newGen,
      ascensionBonusJson: JSON.stringify(bonus),
    },
  });
  // Broadcast — ascension is a public moment, like curse onset.
  try {
    const a = await prisma.announcement.create({
      data: {
        title: `『${updated.name}』は世代を進めた`,
        body: `${updated.name} は第 ${newGen} 世代へと到達した。新たな旅が始まる。`,
      },
    });
    getIO()?.emit("system:announcement", a);
  } catch { /* non-fatal */ }
  return { ok: true as const, generation: newGen, bonus };
}
