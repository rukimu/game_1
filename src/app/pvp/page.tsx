import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import PvpClient from "./Client";

export const dynamic = "force-dynamic";

export default async function PvpPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const duels = await prisma.duel.findMany({
    where: { OR: [{ challengerCharacterId: c.id }, { opponentCharacterId: c.id }] },
    include: { challenger: true, opponent: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return (
    <main>
      <Hud />
      <div className="panel space-y-3">
        <h2 className="text-lg font-bold text-yellow-200">闘技場 / 決闘</h2>
        <PvpClient duels={duels.map((d) => ({
          id: d.id,
          status: d.status,
          challengerName: d.challenger.name,
          opponentName: d.opponent.name,
          winner: d.winnerCharacterId === d.challengerCharacterId ? d.challenger.name : d.winnerCharacterId === d.opponentCharacterId ? d.opponent.name : null,
          isMineToAccept: d.opponentCharacterId === c.id && d.status === "pending",
          log: JSON.parse(d.log || "[]"),
        }))} />
      </div>
    </main>
  );
}
