import Link from "next/link";
import { redirect } from "next/navigation";
import Hud from "@/components/Hud";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import { getSiegeBattleView, startSiegeBattle } from "@/lib/siegeBattle";
import { maybeAdvancePhase } from "@/lib/siege";
import SiegeBattleClient from "./Client";

export const dynamic = "force-dynamic";

export default async function SiegeBattlePage({ params }: { params: { id: string } }) {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");

  const siege = await prisma.siegeEvent.findUnique({
    where: { id: params.id },
    include: { castle: true },
  });
  if (!siege) redirect("/siege");

  await maybeAdvancePhase(params.id);
  let view = await getSiegeBattleView(params.id);
  if (!view) {
    await startSiegeBattle(params.id);
    view = await getSiegeBattleView(params.id);
  }

  const member = await prisma.guildMember.findUnique({ where: { characterId: c.id } });
  const myGuildId = member?.guildId ?? null;
  const myRole = member?.role ?? null;
  const participating = !!view && !!myGuildId && view.guilds.some((g) => g.guildId === myGuildId);

  // Serialize Date to ISO so the Client can use it as a number key.
  const initialView = view ? {
    ...view,
    turnEndsAt: view.turnEndsAt ? view.turnEndsAt.toISOString() : null,
  } : null;

  return (
    <main className="space-y-3">
      <Hud />
      <div className="panel space-y-2">
        <div className="text-xs">
          <Link href="/siege" className="underline text-yellow-300/80">攻城戦一覧へ戻る</Link>
        </div>
        <h2 className="text-lg font-bold text-yellow-200">{siege.castle.name} 攻城戦</h2>
      </div>
      <SiegeBattleClient
        siegeId={params.id}
        castleName={siege.castle.name}
        characterId={c.id}
        myGuildId={myGuildId}
        myRole={myRole}
        participating={participating}
        initialView={initialView}
      />
    </main>
  );
}
