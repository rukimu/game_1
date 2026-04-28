import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import BattleStarter from "./BattleStarter";

export default async function BattlePage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const partyId = c.partyMembers[0]?.partyId ?? null;
  const active = partyId
    ? await prisma.battle.findFirst({ where: { partyId, status: "active" } })
    : null;
  if (active) redirect(`/battle/${active.id}`);
  return (
    <main>
      <Hud />
      <div className="panel">
        <h1 className="text-lg font-bold text-yellow-200 mb-2">冒険</h1>
        <p className="text-sm text-yellow-100/80">街の外には、噂に聞いた獣たちが息を潜めている。</p>
        <BattleStarter />
      </div>
    </main>
  );
}
