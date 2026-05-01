import { prisma } from "@/lib/prisma";
import type { Skill } from "@prisma/client";

// Lv1+: 1 slot, Lv30+: 2, Lv50+: 3
export function getInheritSlotCount(level: number): number {
  if (level >= 50) return 3;
  if (level >= 30) return 2;
  return 1;
}

export function parseInheritedSkillIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function serializeInheritedSkillIds(ids: string[]): string {
  return JSON.stringify(ids);
}

// Skills the character can choose to inherit:
//   - belong to a job they have ever held (CharacterJobHistory)
//   - excluding the current job's skills (already available)
//   - excluding cursed-job skills (cursed skills don't carry over)
export async function getInheritableSkills(characterId: string): Promise<Skill[]> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { jobHistory: { include: { job: true } } },
  });
  if (!character) return [];
  const pastJobIds = character.jobHistory
    .filter((h) => !h.job.isCursed)
    .map((h) => h.jobId)
    .filter((id) => id !== character.currentJobId);
  if (pastJobIds.length === 0) return [];
  return prisma.skill.findMany({
    where: { jobId: { in: pastJobIds } },
    orderBy: [{ jobId: "asc" }, { name: "asc" }],
  });
}

export async function setInheritedSkills(
  characterId: string,
  skillIds: string[],
): Promise<void> {
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) throw new Error("character_not_found");
  const cap = getInheritSlotCount(character.level);
  if (skillIds.length > cap) {
    throw new Error(`slot_overflow: max ${cap} at Lv${character.level}`);
  }
  const dedup = Array.from(
    new Set(skillIds.filter((id) => typeof id === "string" && id.length > 0)),
  );
  if (dedup.length > 0) {
    const inheritable = await getInheritableSkills(characterId);
    const allowed = new Set(inheritable.map((s) => s.id));
    for (const id of dedup) {
      if (!allowed.has(id)) throw new Error(`not_inheritable: ${id}`);
    }
  }
  await prisma.character.update({
    where: { id: characterId },
    data: { inheritedSkillIds: serializeInheritedSkillIds(dedup) },
  });
}

export async function getInheritedSkills(characterId: string): Promise<Skill[]> {
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) return [];
  const ids = parseInheritedSkillIds(character.inheritedSkillIds);
  if (ids.length === 0) return [];
  const skills = await prisma.skill.findMany({ where: { id: { in: ids } } });
  const order = new Map(ids.map((id, idx) => [id, idx]));
  return skills.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

// 10/30/50 uses → +5/+10/+15% power. Consumed in battle.ts (C30-d).
export function getProficiencyBonusPct(usageCount: number): number {
  if (usageCount >= 50) return 15;
  if (usageCount >= 30) return 10;
  if (usageCount >= 10) return 5;
  return 0;
}

export async function tickSkillProficiency(
  characterId: string,
  skillId: string,
): Promise<number> {
  const row = await prisma.skillProficiency.upsert({
    where: { characterId_skillId: { characterId, skillId } },
    create: { characterId, skillId, usageCount: 1 },
    update: { usageCount: { increment: 1 } },
  });
  return row.usageCount;
}
