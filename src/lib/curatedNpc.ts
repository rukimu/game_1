import { prisma } from "@/lib/prisma";

export type NpcRelationLink = {
  name: string;
  relation: string;
  note?: string;
};

export function parseNpcRelations(raw: string | null | undefined): NpcRelationLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is NpcRelationLink =>
        typeof x === "object" && x !== null && typeof x.name === "string" && typeof x.relation === "string",
    );
  } catch {
    return [];
  }
}

export async function getCuratedNpcsForTown(townId: string) {
  return prisma.npc.findMany({
    where: { townId, curated: true },
    orderBy: { name: "asc" },
  });
}

export async function countCuratedNpcs(): Promise<number> {
  return prisma.npc.count({ where: { curated: true } });
}
