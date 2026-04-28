import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import DungeonClient from "./Client";

export const dynamic = "force-dynamic";

export default async function DungeonRunPage({ params }: { params: { id: string } }) {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const run = await prisma.dungeonRun.findFirst({
    where: { id: params.id, characterId: c.id },
  });
  if (!run) redirect("/dungeon");
  return (
    <main>
      <Hud />
      <DungeonClient initialRunId={run.id} />
    </main>
  );
}
