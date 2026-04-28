import Hud from "@/components/Hud";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import JobsClient from "./Client";

export default async function JobsPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const history = await prisma.characterJobHistory.findMany({
    where: { characterId: c.id },
    include: { job: true },
  });
  const quests = await prisma.jobChangeQuest.findMany({
    where: { characterId: c.id },
    include: { targetJob: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <main>
      <Hud />
      <div className="panel space-y-3">
        <h2 className="text-lg font-bold text-yellow-200">転職施設</h2>
        <p className="text-xs text-yellow-100/70">Lv10/30/50で新たな職業候補が現れます。過去に就いた職にはいつでも転職できます（呪い職を除く）。</p>
        <JobsClient
          level={c.level}
          isCursed={c.isCursed}
          history={history.map((h) => ({ id: h.jobId, name: h.job.name, isCursed: h.job.isCursed }))}
          activeQuests={quests.filter((q) => !q.completedAt).map((q) => ({ id: q.id, jobName: q.targetJob.name, description: q.description, progress: q.progress, goalCount: q.goalCount }))}
        />
      </div>
    </main>
  );
}
