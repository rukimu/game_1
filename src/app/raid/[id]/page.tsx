import { redirect } from "next/navigation";
import Hud from "@/components/Hud";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { getRaidView, finalizeRaidIfDue } from "@/lib/raid";
import { prisma } from "@/lib/prisma";
import RaidClient from "./Client";

export const dynamic = "force-dynamic";

export default async function RaidPage({ params }: { params: { id: string } }) {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  // Lazy lifecycle advance so the page reflects "expired" without a cron.
  await finalizeRaidIfDue(params.id);
  const initial = await getRaidView(params.id);
  if (!initial) redirect("/town");

  // Spectator / cross-town gate: viewing is allowed only if the player is in
  // the same town as the raid. Participants are always allowed.
  const me = await prisma.character.findUnique({
    where: { id: c.id },
    select: { currentTownId: true },
  });
  const sameTown = !!initial.townId && me?.currentTownId === initial.townId;
  const isParticipant = initial.participants.some((p) => p.characterId === c.id);
  if (!sameTown && !isParticipant) redirect("/town");

  return (
    <main>
      <Hud />
      <RaidClient initial={initial} characterId={c.id} />
    </main>
  );
}
