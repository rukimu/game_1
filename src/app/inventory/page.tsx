import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import { getEquipmentBonuses, EQUIP_SLOTS, SLOT_LABEL, type EquipSlot } from "@/lib/equipment";
import InventoryClient from "./Client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const items = await prisma.inventoryItem.findMany({
    where: { characterId: c.id },
    include: { item: true },
    orderBy: [{ equipped: "desc" }, { acquiredAt: "asc" }],
  });
  const bonuses = await getEquipmentBonuses(c.id);

  const equippedBySlot: Record<string, (typeof items)[number] | undefined> = {};
  for (const inv of items) {
    if (inv.equipped && inv.item.slot) equippedBySlot[inv.item.slot] = inv;
  }

  const view = items.map((inv) => ({
    id: inv.id,
    quantity: inv.quantity,
    equipped: inv.equipped,
    item: {
      id: inv.item.id,
      name: inv.item.name,
      description: inv.item.description,
      category: inv.item.category,
      slot: inv.item.slot,
      rarity: inv.item.rarity,
      atkBonus: inv.item.atkBonus,
      defBonus: inv.item.defBonus,
      matBonus: inv.item.matBonus,
      mdfBonus: inv.item.mdfBonus,
      hpBonus: inv.item.hpBonus,
      mpBonus: inv.item.mpBonus,
    },
  }));

  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="panel md:col-span-1">
          <h2 className="text-lg font-bold text-yellow-200 mb-2">装備</h2>
          <ul className="text-sm space-y-1">
            {EQUIP_SLOTS.map((slot) => {
              const eq = equippedBySlot[slot];
              return (
                <li key={slot} className="flex justify-between border-b border-yellow-900/30 py-1">
                  <span className="text-yellow-300/80 w-12">{SLOT_LABEL[slot as EquipSlot]}</span>
                  <span className="flex-1 text-right text-yellow-100/90">
                    {eq ? eq.item.name : <span className="text-yellow-200/40">―</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3">
            <h3 className="text-sm font-bold text-yellow-200 mb-1">合計補正</h3>
            <ul className="text-xs text-yellow-100/80 grid grid-cols-2 gap-x-2">
              <li>ATK +{bonuses.atk}</li>
              <li>DEF +{bonuses.def}</li>
              <li>MAT +{bonuses.mat}</li>
              <li>MDF +{bonuses.mdf}</li>
              <li>HP +{bonuses.hp}</li>
              <li>MP +{bonuses.mp}</li>
            </ul>
          </div>
          <div className="mt-3 text-xs text-yellow-100/80 space-y-0.5">
            <div>素のATK {c.atk} → 実効 {c.atk + bonuses.atk}</div>
            <div>素のDEF {c.def} → 実効 {c.def + bonuses.def}</div>
            <div>素のMAT {c.mat} → 実効 {c.mat + bonuses.mat}</div>
            <div>素のMDF {c.mdf} → 実効 {c.mdf + bonuses.mdf}</div>
            <div>HP {c.hp}/{c.maxHp + bonuses.hp}</div>
            <div>MP {c.mp}/{c.maxMp + bonuses.mp}</div>
          </div>
        </div>
        <div className="panel md:col-span-2">
          <h2 className="text-lg font-bold text-yellow-200 mb-2">所持品</h2>
          <InventoryClient items={view} />
        </div>
      </div>
    </main>
  );
}
