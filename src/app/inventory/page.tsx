import { redirect } from "next/navigation";
import Link from "next/link";
import Hud from "@/components/Hud";
import { prisma } from "@/lib/prisma";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { computeCombatStats, isAffine } from "@/lib/equipment";
import { parseInstance, tierColorClass, tierLabel } from "@/lib/affixes";
import InventoryClient from "./Client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const job = c.currentJobId
    ? await prisma.job.findUnique({ where: { id: c.currentJobId }, select: { category: true, name: true } })
    : null;
  const archetype = job?.category ?? null;
  const inventory = await prisma.inventoryItem.findMany({
    where: { characterId: c.id },
    include: { item: true },
    orderBy: [{ equipped: "desc" }, { acquiredAt: "desc" }],
  });
  const stats = await computeCombatStats(c.id);

  // Pre-format each row so the client component stays presentational.
  const rows = inventory.map((inv) => {
    const inst = parseInstance(inv.instanceJson);
    const tier = inst?.tier ?? "common";
    const affineWeapon = isAffine(inv.item.weaponClass, inv.item.jobAffinity, archetype);
    return {
      id: inv.id,
      itemId: inv.item.id,
      baseName: inv.item.name,
      displayName: inv.displayName ?? inv.item.name,
      slot: inv.item.slot,
      weaponClass: inv.item.weaponClass,
      category: inv.item.category,
      rarity: inv.item.rarity,
      tier,
      tierLabel: tier === "common" ? null : tierLabel(tier),
      tierClass: tierColorClass(tier),
      equipped: inv.equipped,
      affineWeapon,
      quantity: inv.quantity,
      // Full effective bonuses including base item + affix instance.
      bonuses: {
        atk: (inv.item.atkBonus ?? 0) + (inst?.bonusStats.atk ?? 0),
        def: (inv.item.defBonus ?? 0) + (inst?.bonusStats.def ?? 0),
        mat: (inv.item.matBonus ?? 0) + (inst?.bonusStats.mat ?? 0),
        mdf: (inv.item.mdfBonus ?? 0) + (inst?.bonusStats.mdf ?? 0),
        hp: (inv.item.hpBonus ?? 0) + (inst?.bonusStats.hp ?? 0),
        mp: (inv.item.mpBonus ?? 0) + (inst?.bonusStats.mp ?? 0),
      },
      specials: inst?.specials ?? [],
    };
  });

  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 panel">
          <h2 className="text-lg font-bold text-yellow-200 mb-2">所持品 / 装備</h2>
          <p className="text-xs text-yellow-200/70 mb-3">
            装備中は <span className="text-green-300">[装備中]</span>。職業適性の合わない武器は効果が半減します。
            {archetype && (<>あなたの職業適性: <span className="text-yellow-100">{job?.name}（{archetype}）</span></>)}
          </p>
          <InventoryClient rows={rows} />
          <div className="mt-3">
            <Link href="/town" className="btn">街に戻る</Link>
          </div>
        </div>
        <div className="space-y-3">
          <div className="panel">
            <div className="text-sm font-bold text-yellow-200 mb-2">戦闘ステータス（装備込み）</div>
            {stats ? (
              <ul className="text-sm text-yellow-100 space-y-1">
                <li>HP: {stats.hp} / {stats.maxHp}</li>
                <li>MP: {stats.mp} / {stats.maxMp}</li>
                <li>攻撃: {stats.atk}</li>
                <li>防御: {stats.def}</li>
                <li>魔攻: {stats.mat}</li>
                <li>魔防: {stats.mdf}</li>
                <li>速度: {stats.spd}</li>
              </ul>
            ) : (
              <div className="text-yellow-200/50 text-xs">読み込めませんでした。</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
