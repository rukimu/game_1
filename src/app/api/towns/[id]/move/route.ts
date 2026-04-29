import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { awardExpAndGold } from "@/lib/leveling";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const town = await prisma.town.findUnique({ where: { id: params.id } });
  if (!town) return NextResponse.json({ error: "no town" }, { status: 404 });
  await prisma.character.update({ where: { id: c.id }, data: { currentTownId: town.id } });
  // Tick visit_town quest progress for any active quests targeting this town.
  // Using town name match keeps the goalParam contract simple (no lookup
  // tables) and matches what generateQuest writes.
  const visitQuests = await prisma.characterQuest.findMany({
    where: { characterId: c.id, completedAt: null, quest: { goalType: "visit_town" } },
    include: { quest: true },
  });
  for (const cq of visitQuests) {
    if (!cq.quest.goalParam) continue;
    if (cq.quest.goalParam !== town.name && !cq.quest.goalParam.includes(town.name)) continue;
    const newProg = cq.progress + 1;
    if (newProg >= cq.quest.goalCount) {
      await prisma.characterQuest.update({
        where: { id: cq.id },
        data: { progress: newProg, completedAt: new Date() },
      });
      await awardExpAndGold(c.id, cq.quest.expReward, cq.quest.goldReward);
    } else {
      await prisma.characterQuest.update({ where: { id: cq.id }, data: { progress: newProg } });
    }
  }
  const url = new URL("/town", req.url);
  return NextResponse.redirect(url, { status: 303 });
}
