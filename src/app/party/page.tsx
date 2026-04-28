import Hud from "@/components/Hud";
import Chat from "@/components/Chat";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import PartyClient from "./Client";

export const dynamic = "force-dynamic";

export default async function PartyPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const party = c.partyMembers[0]
    ? await prisma.party.findUnique({
        where: { id: c.partyMembers[0].partyId },
        include: { members: { include: { character: true } } },
      })
    : null;
  const open = await prisma.party.findMany({
    where: { isOpen: true },
    include: { members: { include: { character: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 panel space-y-3">
          <h2 className="text-lg font-bold text-yellow-200">パーティー</h2>
          <PartyClient
            myParty={party}
            openParties={open.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              members: p.members.map((m) => ({ name: m.character.name, level: m.character.level })),
            }))}
            myCharacterId={c.id}
          />
        </div>
        <div>
          {party && <Chat channel={`party:${party.id}`} title="パーティーチャット" />}
        </div>
      </div>
    </main>
  );
}
