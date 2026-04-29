import { prisma } from "@/lib/prisma";

export const EQUIP_SLOTS = ["weapon", "head", "body", "arm", "leg", "foot", "accessory", "charm"] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: "武器",
  head: "頭",
  body: "胴",
  arm: "腕",
  leg: "脚",
  foot: "足",
  accessory: "装飾",
  charm: "護符",
};

export type EquipBonuses = {
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  hp: number;
  mp: number;
};

export const ZERO_BONUSES: EquipBonuses = { atk: 0, def: 0, mat: 0, mdf: 0, hp: 0, mp: 0 };

export async function getEquipmentBonuses(characterId: string): Promise<EquipBonuses> {
  const equipped = await prisma.inventoryItem.findMany({
    where: { characterId, equipped: true },
    include: { item: true },
  });
  const bonus: EquipBonuses = { ...ZERO_BONUSES };
  for (const inv of equipped) {
    bonus.atk += inv.item.atkBonus;
    bonus.def += inv.item.defBonus;
    bonus.mat += inv.item.matBonus;
    bonus.mdf += inv.item.mdfBonus;
    bonus.hp += inv.item.hpBonus;
    bonus.mp += inv.item.mpBonus;
  }
  return bonus;
}

export type CharacterStatsLike = {
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  maxHp: number;
  maxMp: number;
};

export function applyBonusesToStats<T extends CharacterStatsLike>(stats: T, bonus: EquipBonuses): T {
  return {
    ...stats,
    atk: stats.atk + bonus.atk,
    def: stats.def + bonus.def,
    mat: stats.mat + bonus.mat,
    mdf: stats.mdf + bonus.mdf,
    maxHp: stats.maxHp + bonus.hp,
    maxMp: stats.maxMp + bonus.mp,
  };
}

export function isEquipSlot(s: string | null | undefined): s is EquipSlot {
  return !!s && (EQUIP_SLOTS as readonly string[]).includes(s);
}
