import { prisma } from "@/lib/prisma";

export async function getCuratedJobs() {
  return prisma.job.findMany({
    where: { curated: true },
    include: { skills: true },
    orderBy: { name: "asc" },
  });
}

export async function getCuratedJobByName(name: string) {
  return prisma.job.findUnique({
    where: { name },
    include: { skills: true },
  });
}

export async function getCuratedJobsByCategory(category: string) {
  return prisma.job.findMany({
    where: { curated: true, category },
    include: { skills: true },
    orderBy: { name: "asc" },
  });
}

// Lookup by quirk keyword. Used by C31-b for the quiz-result matcher
// — multiple jobs can share a quirk (e.g. several "猫好き" curated jobs
// once Phase 2 expands the catalog), so the result is an array.
export async function getCuratedJobsByQuirk(quirk: string) {
  return prisma.job.findMany({
    where: { curated: true, quirk },
    include: { skills: true },
    orderBy: { name: "asc" },
  });
}

export async function countCuratedJobs(): Promise<number> {
  return prisma.job.count({ where: { curated: true } });
}
