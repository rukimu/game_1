import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import CharacterClient from "./Client";

export default async function CharactersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const characters = await prisma.character.findMany({
    where: { userId: user.id },
    include: { jobHistory: { include: { job: true } } },
    orderBy: { createdAt: "asc" },
  });
  const jobs = await prisma.job.findMany({ where: { rank: "beginner" }, orderBy: { name: "asc" } });
  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-yellow-200">キャラクター選択</h1>
        <div className="flex gap-2">
          {user.isAdmin && <Link href="/admin" className="btn">管理者</Link>}
          <form action="/api/auth/logout" method="post">
            <button className="btn">ログアウト</button>
          </form>
        </div>
      </header>
      <CharacterClient
        characters={characters.map((c) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          isCursed: c.isCursed,
          jobName: c.jobHistory.find((h) => h.jobId === c.currentJobId)?.job.name ?? "—",
        }))}
        jobs={jobs.map((j) => ({ name: j.name, description: j.description }))}
        slots={user.characterSlots}
      />
    </main>
  );
}
