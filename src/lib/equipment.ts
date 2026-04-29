// Equipment-aware combat stats.
//
// Character.atk/def/etc. are the *base* stats (computed at level-up time).
// During combat we want to factor in:
//
//   1. Equipped item base bonuses (Item.atkBonus, defBonus, ...).
//   2. Per-instance affix bonuses (InventoryItem.instanceJson).
//   3. Job affinity: if the equipped weapon's jobAffinity does not include the
//      character's archetype, weapon bonuses are halved. This makes "what
//      weapon you wield" a real choice rather than always equipping max stats.
//
// One equip slot per slot type. Equipping a new item auto-unequips any
// existing item in that slot — handled by the equip API, not here.

import { prisma } from "@/lib/prisma";
import { aggregateEffects, parseInstance, sumBonuses, type AggregatedEffects, type StatBonus } from "@/lib/affixes";

export type CombatStats = {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  spd: number;
};

// Currently we recognize these slot strings on Item.slot.
export const EQUIP_SLOTS = [
  "weapon",
  "head",
  "body",
  "arm",
  "leg",
  "foot",
  "accessory",
  "charm",
] as const;

export type EquipSlot = typeof EQUIP_SLOTS[number];

// Returns the aggregated structured effects (crit, slay, lifesteal, regen,
// speed) from a character's equipped instances. Use alongside computeCombatStats
// when running combat. Returns the zero-value record on no equipment.
export async function computeCombatEffects(characterId: string): Promise<AggregatedEffects> {
  const inv = await prisma.inventoryItem.findMany({
    where: { characterId, equipped: true },
    select: { instanceJson: true },
  });
  return aggregateEffects(inv.map((i) => parseInstance(i.instanceJson)));
}

// Returns combat-ready stats for a character, including all equipped gear and
// its per-instance affixes. Pulls character + jobs + inventory in one query.
export async function computeCombatStats(characterId: string): Promise<CombatStats | null> {
  const c = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      inventory: {
        where: { equipped: true },
        include: { item: true },
      },
    },
  });
  if (!c) return null;
  const jobCategory = c.currentJobId
    ? (await prisma.job.findUnique({ where: { id: c.currentJobId }, select: { category: true } }))?.category ?? null
    : null;

  let atk = c.atk;
  let def = c.def;
  let mat = c.mat;
  let mdf = c.mdf;
  let hpBoost = 0;
  let mpBoost = 0;

  for (const inv of c.inventory) {
    const it = inv.item;
    if (!it.slot) continue; // shouldn't equip a non-slot item, but defend
    // Job affinity: if a weapon specifies an affinity list and the character's
    // archetype is not in it, halve the contribution.
    const affinityArr = parseAffinity(it.jobAffinity);
    const affine = affinityArr.length === 0 || (jobCategory && affinityArr.includes(jobCategory));
    const affMult = affine ? 1 : 0.5;

    atk += Math.floor(it.atkBonus * affMult);
    def += Math.floor(it.defBonus * affMult);
    mat += Math.floor(it.matBonus * affMult);
    mdf += Math.floor(it.mdfBonus * affMult);
    hpBoost += Math.floor(it.hpBonus * affMult);
    mpBoost += Math.floor(it.mpBonus * affMult);

    // Affix bonuses on the per-instance row. Affixes are *not* halved by
    // affinity — those are the player's own random rolls and feel cheap to
    // weaken further.
    const inst = parseInstance(inv.instanceJson);
    if (inst) {
      const b = inst.bonusStats;
      atk += b.atk ?? 0;
      def += b.def ?? 0;
      mat += b.mat ?? 0;
      mdf += b.mdf ?? 0;
      hpBoost += b.hp ?? 0;
      mpBoost += b.mp ?? 0;
    }
  }

  return {
    hp: c.hp,
    maxHp: c.maxHp + hpBoost,
    mp: c.mp,
    maxMp: c.maxMp + mpBoost,
    atk: Math.max(1, atk),
    def: Math.max(0, def),
    mat: Math.max(0, mat),
    mdf: Math.max(0, mdf),
    spd: c.spd,
  };
}

// Equip helper used by the /api/inventory/[id]/equip route.
// Returns { ok, reason? } so the caller can render the error verbatim.
export async function equipItem(characterId: string, inventoryItemId: string): Promise<{ ok: boolean; reason?: string }> {
  const inv = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    include: { item: true },
  });
  if (!inv) return { ok: false, reason: "持っていません" };
  if (inv.characterId !== characterId) return { ok: false, reason: "そのアイテムはあなたのものではありません" };
  if (!inv.item.slot) return { ok: false, reason: "装備できないアイテムです" };
  if (inv.item.category !== "equip") return { ok: false, reason: "装備できないアイテムです" };

  const slot = inv.item.slot;
  // Unequip any other item in the same slot.
  await prisma.inventoryItem.updateMany({
    where: { characterId, equipped: true, item: { slot } },
    data: { equipped: false },
  });
  await prisma.inventoryItem.update({
    where: { id: inventoryItemId },
    data: { equipped: true },
  });
  return { ok: true };
}

export async function unequipItem(characterId: string, inventoryItemId: string): Promise<{ ok: boolean; reason?: string }> {
  const inv = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
  if (!inv || inv.characterId !== characterId) return { ok: false, reason: "そのアイテムはあなたのものではありません" };
  await prisma.inventoryItem.update({ where: { id: inventoryItemId }, data: { equipped: false } });
  return { ok: true };
}

function parseAffinity(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Returns whether a weapon class is a good fit for an archetype. Pure helper —
// useful for the inventory UI to flag "適性" / "不適性" before equipping.
export function isAffine(weaponClass: string | null | undefined, jobAffinityJson: string | null | undefined, archetype: string | null | undefined): boolean {
  if (!weaponClass) return true; // non-weapon items are always fine
  if (!archetype) return true; // unknown archetype = don't penalize
  const arr = parseAffinity(jobAffinityJson);
  if (arr.length === 0) return true; // universal weapon
  return arr.includes(archetype);
}
