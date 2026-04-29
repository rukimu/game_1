import { prisma } from "@/lib/prisma";
import { getIO } from "@/lib/socket";

// Per-season list of "world keywords" that the mystery is built around. These
// bleed into rumors, enemy descriptions, and NPC lines so the season's central
// motif permeates every town the player visits, even before they uncover a
// single clue. Keep these short: they are slotted into templates verbatim.
const SEASON_KEYWORDS_BY_NAME: Record<string, string[]> = {
  "Season 1: 灯の年": [
    "塔", "鐘", "紋章", "禁書", "井戸", "灯", "影", "封印者", "薄明",
  ],
};

let _keywordCache: { name: string; words: string[] } | null = null;

export async function getCurrentSeasonKeywords(): Promise<string[]> {
  if (_keywordCache) return _keywordCache.words;
  const season = await prisma.season.findFirst({ where: { isCurrent: true }, select: { name: true } });
  if (!season) return [];
  const words = SEASON_KEYWORDS_BY_NAME[season.name] ?? [];
  _keywordCache = { name: season.name, words };
  return words;
}

// Returns the current season's mystery + this character's discovered clues.
export async function getCharacterMystery(characterId: string) {
  const season = await prisma.season.findFirst({
    where: { isCurrent: true },
    include: { clues: { orderBy: { orderIdx: "asc" } } },
  });
  if (!season) return null;
  const found = await prisma.characterClue.findMany({
    where: { characterId, clueId: { in: season.clues.map((c) => c.id) } },
    select: { clueId: true, foundAt: true, source: true },
  });
  const foundMap = new Map(found.map((f) => [f.clueId, f]));
  return {
    seasonId: season.id,
    seasonName: season.name,
    title: season.mysteryTitle,
    hint: season.mysteryHint,
    solvedAt: season.mysterySolvedAt,
    solverName: season.mysterySolverName,
    clues: season.clues.map((c) => ({
      id: c.id,
      idx: c.orderIdx,
      isFinal: c.isFinal,
      hint: c.hint,
      text: foundMap.has(c.id) ? c.text : null,
      foundAt: foundMap.get(c.id)?.foundAt ?? null,
      source: foundMap.get(c.id)?.source ?? null,
    })),
    foundCount: found.length,
    totalCount: season.clues.length,
  };
}

// Roll for a clue discovery for a given character. `chance` is 0..1.
// Returns the unlocked clue or null. Triggers a server-wide announcement for
// the very first solver of the season.
export async function rollClueDiscovery(
  characterId: string,
  source: "rumor" | "battle" | "dungeon" | "npc",
  chance: number,
): Promise<{ id: string; text: string; isFinal: boolean } | null> {
  if (Math.random() >= chance) return null;
  const season = await prisma.season.findFirst({
    where: { isCurrent: true },
    include: { clues: { orderBy: { orderIdx: "asc" } } },
  });
  if (!season || season.clues.length === 0) return null;
  // pick an undiscovered clue for this character. Final clue only unlocks once
  // others are found.
  const found = await prisma.characterClue.findMany({
    where: { characterId, clueId: { in: season.clues.map((c) => c.id) } },
    select: { clueId: true },
  });
  const foundIds = new Set(found.map((f) => f.clueId));
  const undiscovered = season.clues.filter((c) => !foundIds.has(c.id));
  if (undiscovered.length === 0) return null;
  const nonFinal = undiscovered.filter((c) => !c.isFinal);
  let pickFrom = nonFinal.length > 0 ? nonFinal : undiscovered;
  // if only the final remains, require all others found
  if (nonFinal.length === 0) {
    const allOthersFound =
      season.clues.filter((c) => !c.isFinal).every((c) => foundIds.has(c.id));
    if (!allOthersFound) return null;
  }
  const clue = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  await prisma.characterClue.create({
    data: { characterId, clueId: clue.id, source },
  });
  // First-finder bonus and global announce.
  if (clue.isFinal) {
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    const updated = await prisma.season.updateMany({
      where: { id: season.id, mysterySolvedAt: null },
      data: { mysterySolvedAt: new Date(), mysterySolverName: character?.name ?? null },
    });
    if (updated.count > 0 && character) {
      // grant a meaningful reward
      await prisma.character.update({
        where: { id: character.id },
        data: { gold: { increment: 1000 }, exp: { increment: 500 } },
      });
      const a = await prisma.announcement.create({
        data: {
          title: `『${season.mysteryTitle}』を解き明かした者が現れた！`,
          body: `${character.name}が灯の年の中心の謎に到達した。世界に新たな章が始まる。`,
        },
      });
      getIO()?.emit("system:announcement", a);
    }
  }
  return { id: clue.id, text: clue.text, isFinal: clue.isFinal };
}
