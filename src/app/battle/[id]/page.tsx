import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import { getInheritedSkills } from "@/lib/skillInherit";
import BattleClient from "./Client";

export default async function BattlePage({ params }: { params: { id: string } }) {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const battle = await prisma.battle.findUnique({
    where: { id: params.id },
    include: { participants: { include: { character: true } } },
  });
  if (!battle) redirect("/town");
  // load my skills (current job + inherited slots, dedup'd by id)
  const currentSkills = c.currentJobId ? await prisma.skill.findMany({ where: { jobId: c.currentJobId } }) : [];
  const inheritedSkills = await getInheritedSkills(c.id);
  const currentIdSet = new Set(currentSkills.map((s) => s.id));
  const skills = [
    ...currentSkills.map((s) => ({ ...s, inherited: false })),
    ...inheritedSkills.filter((s) => !currentIdSet.has(s.id)).map((s) => ({ ...s, inherited: true })),
  ];

  // Mid-battle join/leave eligibility (Cycle 23). Boss + dungeon battles
  // are excluded; the UI hides the buttons via `joinable=false`.
  const myPart = battle.participants.find((p) => p.characterId === c.id);
  const joinable = battle.kind !== "boss" && !battle.dungeonRunId;
  let canJoin = false;
  if (joinable && !myPart && battle.partyId && battle.status === "active") {
    const member = await prisma.partyMember.findFirst({
      where: { partyId: battle.partyId, characterId: c.id },
      select: { id: true },
    });
    canJoin = !!member;
  }
  const canLeave = !!(joinable && myPart?.alive && battle.status === "active"
    && battle.participants.filter((p) => p.alive).length > 1);

  return (
    <main>
      <Hud />
      <BattleClient
        battleId={battle.id}
        characterId={c.id}
        skills={skills.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          cost: s.inherited ? Math.ceil(s.cost * 1.5) : s.cost,
          baseCost: s.cost,
          description: s.description,
          inherited: s.inherited,
        }))}
        canJoin={canJoin}
        canLeave={canLeave}
        isParticipant={!!myPart?.alive}
      />
    </main>
  );
}
