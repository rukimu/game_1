import { containsBannedWord, sanitizeText } from "@/lib/sanitize";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export type GeneratedJob = {
  name: string;
  description: string;
  category: string;
  rank: string;
  isCursed: boolean;
  baseStats: {
    hp: number;
    mp: number;
    atk: number;
    def: number;
    mat: number;
    mdf: number;
    spd: number;
  };
};

export function validateGeneratedJob(input: any): ValidationResult<GeneratedJob> {
  if (!input || typeof input !== "object") return { ok: false, reason: "not an object" };
  const name = sanitizeText(String(input.name ?? ""), 40);
  const description = sanitizeText(String(input.description ?? ""), 400);
  if (!name) return { ok: false, reason: "name required" };
  if (!description) return { ok: false, reason: "description required" };
  if (containsBannedWord(name) || containsBannedWord(description))
    return { ok: false, reason: "banned word" };
  const category = ["warrior","mage","rogue","cleric","craft","support","heretic","rare","cursed"].includes(input.category)
    ? input.category
    : "warrior";
  const rank = ["beginner","intermediate","advanced","special","legendary","heretic","cursed"].includes(input.rank)
    ? input.rank
    : "beginner";
  const isCursed = !!input.isCursed || category === "cursed" || rank === "cursed";
  const s = input.baseStats ?? {};
  return {
    ok: true,
    value: {
      name,
      description,
      category,
      rank,
      isCursed,
      baseStats: {
        hp: clamp(Number(s.hp ?? 30), 10, 200),
        mp: clamp(Number(s.mp ?? 10), 0, 200),
        atk: clamp(Number(s.atk ?? 8), 1, 80),
        def: clamp(Number(s.def ?? 4), 0, 80),
        mat: clamp(Number(s.mat ?? 6), 0, 80),
        mdf: clamp(Number(s.mdf ?? 4), 0, 80),
        spd: clamp(Number(s.spd ?? 6), 1, 60),
      },
    },
  };
}

export type GeneratedSkill = {
  name: string;
  description: string;
  type: "attack" | "heal" | "buff" | "debuff" | "special";
  element: string | null;
  power: number;
  cost: number;
  cooldown: number;
  targetType: string;
};

export function validateGeneratedSkill(input: any): ValidationResult<GeneratedSkill> {
  if (!input || typeof input !== "object") return { ok: false, reason: "bad" };
  const name = sanitizeText(String(input.name ?? ""), 30);
  const description = sanitizeText(String(input.description ?? ""), 200);
  if (!name || !description) return { ok: false, reason: "missing fields" };
  if (containsBannedWord(name) || containsBannedWord(description))
    return { ok: false, reason: "banned" };
  const type = ["attack","heal","buff","debuff","special"].includes(input.type) ? input.type : "attack";
  const element = ["fire","water","earth","wind","light","dark","none"].includes(input.element)
    ? input.element
    : null;
  return {
    ok: true,
    value: {
      name,
      description,
      type,
      element,
      power: clamp(Number(input.power ?? 10), 0, 200),
      cost: clamp(Number(input.cost ?? 0), 0, 80),
      cooldown: clamp(Number(input.cooldown ?? 0), 0, 5),
      targetType: ["enemy","ally","self","all_enemies","all_allies"].includes(input.targetType)
        ? input.targetType
        : type === "heal" ? "ally" : "enemy",
    },
  };
}

export type GeneratedEnemy = {
  name: string;
  description: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  element: string | null;
  weakness: string | null;
  expReward: number;
  goldReward: number;
};

export function validateGeneratedEnemy(input: any): ValidationResult<GeneratedEnemy> {
  if (!input) return { ok: false, reason: "bad" };
  const name = sanitizeText(String(input.name ?? ""), 30);
  const description = sanitizeText(String(input.description ?? ""), 200);
  if (!name) return { ok: false, reason: "no name" };
  if (containsBannedWord(name) || containsBannedWord(description))
    return { ok: false, reason: "banned" };
  return {
    ok: true,
    value: {
      name,
      description,
      level: clamp(Number(input.level ?? 1), 1, 60),
      hp: clamp(Number(input.hp ?? 30), 5, 5000),
      atk: clamp(Number(input.atk ?? 8), 1, 300),
      def: clamp(Number(input.def ?? 4), 0, 200),
      spd: clamp(Number(input.spd ?? 6), 1, 80),
      element: ["fire","water","earth","wind","light","dark","none"].includes(input.element) ? input.element : null,
      weakness: ["fire","water","earth","wind","light","dark"].includes(input.weakness) ? input.weakness : null,
      expReward: clamp(Number(input.expReward ?? 10), 1, 5000),
      goldReward: clamp(Number(input.goldReward ?? 10), 0, 5000),
    },
  };
}

export type GeneratedQuest = {
  title: string;
  description: string;
  goalType: string;
  goalParam: string | null;
  goalCount: number;
  expReward: number;
  goldReward: number;
};

export function validateGeneratedQuest(input: any): ValidationResult<GeneratedQuest> {
  if (!input) return { ok: false, reason: "bad" };
  const title = sanitizeText(String(input.title ?? ""), 50);
  const description = sanitizeText(String(input.description ?? ""), 400);
  if (!title) return { ok: false, reason: "no title" };
  if (containsBannedWord(title) || containsBannedWord(description))
    return { ok: false, reason: "banned" };
  return {
    ok: true,
    value: {
      title,
      description,
      goalType: ["defeat_enemy","collect_item","talk_npc","collect_drop","visit_town","win_battles"].includes(input.goalType) ? input.goalType : "defeat_enemy",
      goalParam: input.goalParam ? sanitizeText(String(input.goalParam), 40) : null,
      goalCount: clamp(Number(input.goalCount ?? 3), 1, 20),
      expReward: clamp(Number(input.expReward ?? 50), 1, 5000),
      goldReward: clamp(Number(input.goldReward ?? 50), 0, 5000),
    },
  };
}

export function validateRumor(text: string): ValidationResult<string> {
  const t = sanitizeText(text, 200);
  if (!t) return { ok: false, reason: "empty" };
  if (containsBannedWord(t)) return { ok: false, reason: "banned" };
  return { ok: true, value: t };
}
