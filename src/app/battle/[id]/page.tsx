import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import BattleClient from "./Client";

export default async function BattlePage({ params }: { params: { id: string } }) {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const battle = await prisma.battle.findUnique({
    where: { id: params.id },
    include: { participants: { include: { character: true } } },
  });
  if (!battle) redirect("/town");
  // load my skills
  const skills = c.currentJobId ? await prisma.skill.findMany({ where: { jobId: c.currentJobId } }) : [];
  return (
    <main>
      <Hud />
      <BattleClient
        battleId={battle.id}
        characterId={c.id}
        skills={skills.map((s) => ({ id: s.id, name: s.name, type: s.type, cost: s.cost, description: s.description }))}
      />
    </main>
  );
}
