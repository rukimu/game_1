import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import AuctionClient from "./Client";

export default async function AuctionPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const listings = await prisma.auctionListing.findMany({
    where: { status: "active" },
    include: { invItem: { include: { item: true } }, seller: true },
    orderBy: { endsAt: "asc" },
    take: 50,
  });
  const myInventory = await prisma.inventoryItem.findMany({
    where: { characterId: c.id, equipped: false },
    include: { item: true },
  });
  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="panel">
          <h2 className="text-lg font-bold text-yellow-200 mb-2">オークションハウス</h2>
          <AuctionClient
            listings={listings.map((l) => ({
              id: l.id,
              itemName: l.invItem.item.name,
              sellerName: l.seller.name,
              startPrice: l.startPrice,
              currentBid: l.currentBid,
              buyoutPrice: l.buyoutPrice ?? null,
              endsAt: l.endsAt.toISOString(),
            }))}
            myGold={c.gold}
            myCharacterId={c.id}
            myInventory={myInventory.map((i) => ({ id: i.id, name: i.item.name, qty: i.quantity, tradable: i.item.tradable }))}
          />
        </div>
        <div className="panel">
          <h2 className="text-lg font-bold text-yellow-200 mb-2">取引</h2>
          <p className="text-xs text-yellow-100/70">個人間トレードはMVPでは API のみ実装されています。<br />POST /api/trades で対象キャラ名を指定して提案を作成できます。</p>
        </div>
      </div>
    </main>
  );
}
