import { redirect } from "next/navigation";
import Link from "next/link";
import Hud from "@/components/Hud";
import { prisma } from "@/lib/prisma";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { computeCombatStats, isAffine } from "@/lib/equipment";
import { parseInstance, tierColorClass, tierLabel } from "@/lib/affixes";
import { WEAPON_CLASSES, WEAPON_CLASS_LABEL_JP, ARCHETYPE_LABEL_JP } from "@/lib/itemGen";
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
  // Equipped-by-slot map lets us compute the "equip swap" diff per row.
  const equippedBySlot = new Map<string, typeof inventory[number]>();
  for (const inv of inventory) {
    if (inv.equipped && inv.item.slot) equippedBySlot.set(inv.item.slot, inv);
  }
  function effectiveBonuses(inv: typeof inventory[number]) {
    const inst = parseInstance(inv.instanceJson);
    const affineWeapon = isAffine(inv.item.weaponClass, inv.item.jobAffinity, archetype);
    const affMult = affineWeapon ? 1 : 0.5;
    return {
      atk: Math.floor((inv.item.atkBonus ?? 0) * affMult) + (inst?.bonusStats.atk ?? 0),
      def: Math.floor((inv.item.defBonus ?? 0) * affMult) + (inst?.bonusStats.def ?? 0),
      mat: Math.floor((inv.item.matBonus ?? 0) * affMult) + (inst?.bonusStats.mat ?? 0),
      mdf: Math.floor((inv.item.mdfBonus ?? 0) * affMult) + (inst?.bonusStats.mdf ?? 0),
      hp: Math.floor((inv.item.hpBonus ?? 0) * affMult) + (inst?.bonusStats.hp ?? 0),
      mp: Math.floor((inv.item.mpBonus ?? 0) * affMult) + (inst?.bonusStats.mp ?? 0),
    };
  }
  const rows = inventory.map((inv) => {
    const inst = parseInstance(inv.instanceJson);
    const tier = inst?.tier ?? "common";
    const affineWeapon = isAffine(inv.item.weaponClass, inv.item.jobAffinity, archetype);
    const myBonuses = effectiveBonuses(inv);
    // Diff vs whatever's equipped in this slot (zero when this is the
    // currently-equipped piece). NPCs' "what would I gain" question.
    const equipped = inv.item.slot ? equippedBySlot.get(inv.item.slot) ?? null : null;
    const eqBonuses = equipped && equipped.id !== inv.id ? effectiveBonuses(equipped) : null;
    const diff = eqBonuses
      ? {
          atk: myBonuses.atk - eqBonuses.atk,
          def: myBonuses.def - eqBonuses.def,
          mat: myBonuses.mat - eqBonuses.mat,
          mdf: myBonuses.mdf - eqBonuses.mdf,
          hp: myBonuses.hp - eqBonuses.hp,
          mp: myBonuses.mp - eqBonuses.mp,
        }
      : null;
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
      bonuses: myBonuses,
      diffVsEquipped: diff,
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
          {archetype && (
            <div className="panel">
              <div className="text-sm font-bold text-yellow-200 mb-1">武器適性表</div>
              <p className="text-[10px] text-yellow-200/60 mb-2">
                あなたの職業 <span className="text-yellow-100">{job?.name}</span>（
                {ARCHETYPE_LABEL_JP[archetype] ?? archetype}）に対応する武器クラス。
                適性外の武器を装備すると ATK / MAT 等の補正が <span className="text-red-300">半減</span> します（affix の補正は減りません）。
              </p>
              <table className="text-xs w-full">
                <thead>
                  <tr className="text-yellow-300/80 text-left">
                    <th className="pb-1">武器</th>
                    <th className="pb-1">適性</th>
                  </tr>
                </thead>
                <tbody>
                  {WEAPON_CLASSES.map((w) => {
                    const ok = w.affinity.includes(archetype);
                    return (
                      <tr key={w.key} className={ok ? "" : "opacity-50"}>
                        <td className="py-0.5">
                          {WEAPON_CLASS_LABEL_JP[w.key] ?? w.key}
                          <span className="text-yellow-200/50 ml-1 text-[10px]">({w.key})</span>
                        </td>
                        <td className="py-0.5">
                          {ok ? (
                            <span className="text-green-300">○ 適性</span>
                          ) : (
                            <span className="text-red-300">× 半減</span>
                          )}
                          {w.affinity.length > 0 && (
                            <span className="text-yellow-200/50 ml-2 text-[10px]">
                              ({w.affinity.map((a) => ARCHETYPE_LABEL_JP[a] ?? a).join("/")} 向け)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
