import { redirect } from "next/navigation";
import Link from "next/link";
import Hud from "@/components/Hud";
import { prisma } from "@/lib/prisma";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { parseInstance, tierColorClass, tierLabel } from "@/lib/affixes";
import { FORGE_CONFIG } from "@/lib/forge";
import ForgeClient from "./Client";

export const dynamic = "force-dynamic";

export default async function ForgePage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const inv = await prisma.inventoryItem.findMany({
    where: { characterId: c.id, item: { category: "equip" } },
    include: { item: true },
    orderBy: [{ equipped: "desc" }, { acquiredAt: "desc" }],
  });
  const rows = inv.map((i) => {
    const inst = parseInstance(i.instanceJson);
    const tier = inst?.tier ?? "common";
    return {
      id: i.id,
      displayName: i.displayName ?? i.item.name,
      slot: i.item.slot ?? "",
      tier,
      tierLabel: tierLabel(tier),
      tierClass: tierColorClass(tier),
      equipped: i.equipped,
      specials: inst?.specials ?? [],
    };
  });
  const materialCount = await prisma.inventoryItem.count({
    where: { characterId: c.id, equipped: false, item: { category: "equip" } },
  });

  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 panel space-y-3">
          <h2 className="text-lg font-bold text-yellow-200">鍛冶場（アイテム加工）</h2>
          <p className="text-xs text-yellow-200/80">
            手持ちの装備品を素材にして、対象装備のアフィックスを引き直します。
            <br />
            <span className="text-yellow-100">リロール</span>: 同ティア再抽選 (10% でティア上昇)。
            <span className="text-yellow-100 ml-3">強化</span>: 強制的にティアを 1 段上げる (高コスト)。
          </p>
          <div className="text-xs text-yellow-200/70">
            所持金 {c.gold}G ／ 装備可素材 {materialCount} 個（1 回の加工で {FORGE_CONFIG.materialCount} 個消費）
          </div>
          <ForgeClient rows={rows} myGold={c.gold} />
          <div className="pt-2 flex gap-2">
            <Link href="/inventory" className="btn">所持品</Link>
            <Link href="/town" className="btn">街に戻る</Link>
          </div>
        </div>
        <div className="space-y-3">
          <div className="panel">
            <div className="text-sm font-bold text-yellow-200 mb-1">価格表</div>
            <table className="text-xs text-yellow-100/80 w-full">
              <thead>
                <tr>
                  <th className="text-left">ティア</th>
                  <th className="text-right">リロール</th>
                  <th className="text-right">強化</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>並</td><td className="text-right">200G</td><td className="text-right">800G</td></tr>
                <tr><td>良質</td><td className="text-right">500G</td><td className="text-right">2,500G</td></tr>
                <tr><td>希少</td><td className="text-right">1,500G</td><td className="text-right">6,000G</td></tr>
                <tr><td>伝説</td><td className="text-right">4,000G</td><td className="text-right">—</td></tr>
              </tbody>
            </table>
            <div className="text-[10px] text-yellow-200/50 mt-1">
              加工は古い装備品から優先して 5 個消費されます。装備中・対象自身・消耗品は対象外。
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
