import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import ShopClient from "./Client";
import CosmeticList from "./CosmeticList";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const items = await prisma.item.findMany({ where: { cosmetic: false }, orderBy: { basePrice: "asc" }, take: 50 });
  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="panel">
          <h2 className="text-lg font-bold text-yellow-200 mb-2">道具屋</h2>
          <ShopClient items={items.map((i) => ({ id: i.id, name: i.name, description: i.description, basePrice: i.basePrice, rarity: i.rarity }))} myGold={c.gold} />
        </div>
        <div className="panel">
          <h2 className="text-lg font-bold text-yellow-200 mb-2">課金ショップ（モック）</h2>
          <p className="text-xs text-yellow-100/70 mb-2">本決済はモックです。クリックで購入扱いになります。課金は強さに直結しません。</p>
          <CosmeticList />
        </div>
      </div>
    </main>
  );
}
