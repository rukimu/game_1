import { prisma } from "@/lib/prisma";

export const LEVEL_CAP = 50;
export const JOB_CHANGE_LEVELS = [10, 30, 50];

export function expForLevel(level: number) {
  return Math.floor(50 * level * level + 100 * level);
}

export function applyJobBaseStats(base: any) {
  return {
    hp: Number(base.hp ?? 30),
    maxHp: Number(base.hp ?? 30),
    mp: Number(base.mp ?? 10),
    maxMp: Number(base.mp ?? 10),
    atk: Number(base.atk ?? 8),
    def: Number(base.def ?? 4),
    mat: Number(base.mat ?? 6),
    mdf: Number(base.mdf ?? 4),
    spd: Number(base.spd ?? 6),
  };
}

export async function awardExpAndGold(characterId: string, exp: number, gold: number) {
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) return null;
  let newExp = character.exp + exp;
  let newLevel = character.level;
  const updates: any = { exp: newExp, gold: character.gold + gold };
  while (newLevel < LEVEL_CAP && newExp >= expForLevel(newLevel)) {
    newExp -= expForLevel(newLevel);
    newLevel += 1;
    updates.maxHp = (updates.maxHp ?? character.maxHp) + 4;
    updates.hp = (updates.maxHp ?? character.maxHp);
    updates.maxMp = (updates.maxMp ?? character.maxMp) + 2;
    updates.mp = (updates.maxMp ?? character.maxMp);
    updates.atk = (updates.atk ?? character.atk) + 1;
    updates.def = (updates.def ?? character.def) + 1;
    updates.mat = (updates.mat ?? character.mat) + 1;
    updates.mdf = (updates.mdf ?? character.mdf) + 1;
    updates.spd = (updates.spd ?? character.spd) + (Math.random() < 0.5 ? 1 : 0);
  }
  updates.exp = newExp;
  updates.level = newLevel;
  const updated = await prisma.character.update({ where: { id: characterId }, data: updates });
  return updated;
}
