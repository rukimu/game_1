// Item augmentation forge.
//
// Players who have hoarded common drops can sacrifice them to reroll the
// affixes on a target equipment instance. The cost grows with the target's
// current tier so a Legendary reroll is meaningfully expensive. Materials
// consumed are simple: any 5 equip-category InventoryItems plus a gold
// payment. We deliberately do not introduce a new "scroll" item right now
// to keep the schema unchanged.
//
// Mechanic summary:
//   - Reroll: keeps the base item, picks a fresh ItemInstance with the same
//     tier (or one tier up on a 10% lucky pull). Cost: 5 equip items + gold.
//   - Upgrade: forces the next tier up (common→rare→epic→legendary). Costs
//     more, requires that no current affix slots are missing.

import { prisma } from "@/lib/prisma";
import {
  parseInstance,
  rollItemInstance,
  type AffixTier,
  type ItemInstance,
} from "@/lib/affixes";

const TIER_ORDER: AffixTier[] = ["common", "rare", "epic", "legendary"];

function nextTier(t: AffixTier): AffixTier {
  const idx = TIER_ORDER.indexOf(t);
  if (idx < 0 || idx + 1 >= TIER_ORDER.length) return t;
  return TIER_ORDER[idx + 1];
}

function rerollGoldCost(tier: AffixTier): number {
  switch (tier) {
    case "common":    return 200;
    case "rare":      return 500;
    case "epic":      return 1500;
    case "legendary": return 4000;
  }
}

function upgradeGoldCost(tier: AffixTier): number {
  switch (tier) {
    case "common":    return 800;
    case "rare":      return 2500;
    case "epic":      return 6000;
    case "legendary": return 6000; // already max — the API will reject before this
  }
}

const MATERIAL_COUNT = 5;

export type ForgeResult = {
  ok: boolean;
  error?: string;
  before?: { displayName: string; tier: AffixTier };
  after?: { displayName: string; tier: AffixTier };
  goldSpent?: number;
  materialsSpent?: string[];
};

// Quote what a forge action will cost without actually performing it. Used by
// the UI to show "+200G + 5 素材" before the player commits.
export async function quoteForge(
  characterId: string,
  inventoryItemId: string,
  mode: "reroll" | "upgrade",
): Promise<{ ok: boolean; error?: string; goldCost?: number; tier?: AffixTier; nextTier?: AffixTier }> {
  const inv = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    include: { item: true },
  });
  if (!inv || inv.characterId !== characterId) return { ok: false, error: "そのアイテムはあなたのものではありません" };
  if (inv.item.category !== "equip" || !inv.item.slot) return { ok: false, error: "装備可能アイテムのみ加工できます" };
  const inst = parseInstance(inv.instanceJson);
  const tier: AffixTier = inst?.tier ?? "common";
  if (mode === "upgrade" && tier === "legendary") {
    return { ok: false, error: "これ以上の強化はできません" };
  }
  const cost = mode === "reroll" ? rerollGoldCost(tier) : upgradeGoldCost(tier);
  return {
    ok: true,
    goldCost: cost,
    tier,
    nextTier: mode === "upgrade" ? nextTier(tier) : undefined,
  };
}

// Run a forge action. Atomic-ish: validates funds and materials, deducts in
// one transaction, then writes the new instance.
export async function runForge(
  characterId: string,
  inventoryItemId: string,
  mode: "reroll" | "upgrade",
): Promise<ForgeResult> {
  const inv = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    include: { item: true },
  });
  if (!inv || inv.characterId !== characterId) return { ok: false, error: "そのアイテムはあなたのものではありません" };
  if (inv.item.category !== "equip" || !inv.item.slot) return { ok: false, error: "装備可能アイテムのみ加工できます" };

  const inst = parseInstance(inv.instanceJson);
  const tier: AffixTier = inst?.tier ?? "common";
  if (mode === "upgrade" && tier === "legendary") return { ok: false, error: "これ以上の強化はできません" };
  const goldCost = mode === "reroll" ? rerollGoldCost(tier) : upgradeGoldCost(tier);

  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character || character.gold < goldCost) return { ok: false, error: `ゴールドが足りません (${goldCost}G必要)` };

  // Find sacrificable materials: equip items the player owns that are NOT
  // the target itself, NOT currently equipped. Prefer common-tier vanilla.
  const candidates = await prisma.inventoryItem.findMany({
    where: {
      characterId,
      equipped: false,
      id: { not: inventoryItemId },
      item: { category: "equip" },
    },
    orderBy: [{ acquiredAt: "asc" }],
    take: 50,
  });
  if (candidates.length < MATERIAL_COUNT) {
    return { ok: false, error: `素材が足りません (装備品 ${MATERIAL_COUNT} 個が必要)` };
  }
  const sacrifices = candidates.slice(0, MATERIAL_COUNT);

  // Roll new instance. Reroll keeps tier (with 10% lucky bump), upgrade forces next.
  let targetTier: AffixTier;
  if (mode === "upgrade") {
    targetTier = nextTier(tier);
  } else {
    targetTier = Math.random() < 0.1 ? nextTier(tier) : tier;
  }
  const newInstance: ItemInstance = rollItemInstance({
    baseName: inv.item.name,
    enemyLevel: 25,
    seed: `forge-${inventoryItemId}-${Date.now()}-${Math.random()}`,
    forcedTier: targetTier,
  });

  // Apply atomically.
  await prisma.$transaction([
    prisma.character.update({
      where: { id: characterId },
      data: { gold: { decrement: goldCost } },
    }),
    prisma.inventoryItem.deleteMany({
      where: { id: { in: sacrifices.map((s) => s.id) }, characterId },
    }),
    prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        displayName: newInstance.displayName,
        instanceJson: JSON.stringify(newInstance),
      },
    }),
  ]);

  return {
    ok: true,
    before: { displayName: inv.displayName ?? inv.item.name, tier },
    after: { displayName: newInstance.displayName, tier: newInstance.tier },
    goldSpent: goldCost,
    materialsSpent: sacrifices.map((s) => s.id),
  };
}

export const FORGE_CONFIG = {
  rerollGoldCost,
  upgradeGoldCost,
  materialCount: MATERIAL_COUNT,
};
