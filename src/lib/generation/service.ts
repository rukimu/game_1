import { prisma } from "@/lib/prisma";
import { intBetween, makeRng, pick } from "@/lib/rng";
import {
  ELEMENTS,
  ENEMY_PARTS,
  ITEM_NAMES,
  JOB_PARTS,
  NPC_TEMPLATES,
  QUEST_TEMPLATES,
  ROLES,
  RUMOR_TEMPLATES,
  SKILL_PARTS,
} from "@/lib/generation/templates";
import {
  GeneratedEnemy,
  GeneratedJob,
  GeneratedQuest,
  GeneratedSkill,
  validateGeneratedEnemy,
  validateGeneratedJob,
  validateGeneratedQuest,
  validateGeneratedSkill,
  validateRumor,
} from "@/lib/generation/validate";

export type GenerationContext = {
  seed?: string;
  seasonId?: string | null;
  townId?: string | null;
  characterId?: string | null;
  level?: number;
  category?: string;
  rank?: string;
};

export interface ContentGenerationService {
  generateJob(ctx: GenerationContext): Promise<GeneratedJob>;
  generateSkill(ctx: GenerationContext & { jobName?: string }): Promise<GeneratedSkill>;
  generateEnemy(ctx: GenerationContext): Promise<GeneratedEnemy>;
  generateQuest(ctx: GenerationContext & { townName?: string }): Promise<GeneratedQuest>;
  generateRumor(ctx: GenerationContext & { townName: string }): Promise<string>;
  generateNpcDialogue(ctx: GenerationContext & { role?: string }): Promise<{ role: string; line: string }>;
  generateDungeonName(ctx: GenerationContext): Promise<string>;
  generateItemName(ctx: GenerationContext & { slot: keyof typeof ITEM_NAMES }): Promise<string>;
}

class TemplateContentGenerationService implements ContentGenerationService {
  async generateJob(ctx: GenerationContext): Promise<GeneratedJob> {
    const seed = ctx.seed ?? `${Date.now()}-${Math.random()}`;
    const rng = makeRng(seed);
    const cat = (ctx.category ?? pick(["warrior","mage","rogue","cleric","craft","support","heretic","rare","cursed"], rng)) as keyof typeof JOB_PARTS;
    const parts = JOB_PARTS[cat];
    const name = `${pick(parts.prefix, rng)}${pick(parts.base, rng)}${pick(parts.suffix, rng)}`;
    const description = describeJob(cat, name, rng);
    const baseStats = jobBaseStats(cat, rng, ctx.level ?? 1);
    const rank = ctx.rank ?? pickRank(cat, rng);
    const isCursed = cat === "cursed" || rank === "cursed";
    const v = validateGeneratedJob({ name, description, category: cat, rank, isCursed, baseStats });
    if (!v.ok) throw new Error("template job validation failed: " + v.reason);
    return v.value;
  }

  async generateSkill(ctx: GenerationContext & { jobName?: string }): Promise<GeneratedSkill> {
    const seed = ctx.seed ?? `${Date.now()}-${Math.random()}`;
    const rng = makeRng(seed);
    const types: Array<keyof typeof SKILL_PARTS> = ["attack","heal","buff","debuff","special"];
    const type = pick(types, rng);
    const name = pick(SKILL_PARTS[type], rng);
    const element = type === "attack" || type === "special"
      ? pick(ELEMENTS as unknown as string[], rng)
      : null;
    const description = describeSkill(type, name, element);
    const power = type === "heal" ? intBetween(rng, 10, 30)
      : type === "buff" || type === "debuff" ? intBetween(rng, 0, 5)
      : intBetween(rng, 12, 40);
    const cost = type === "special" ? intBetween(rng, 10, 25) : intBetween(rng, 2, 12);
    const cooldown = type === "special" ? intBetween(rng, 1, 3) : 0;
    const targetType = type === "heal" ? "ally" : type === "buff" ? "self" : "enemy";
    const v = validateGeneratedSkill({ name, description, type, element, power, cost, cooldown, targetType });
    if (!v.ok) throw new Error("skill validation failed: " + v.reason);
    return v.value;
  }

  async generateEnemy(ctx: GenerationContext): Promise<GeneratedEnemy> {
    const seed = ctx.seed ?? `${Date.now()}-${Math.random()}`;
    const rng = makeRng(seed);
    const level = ctx.level ?? intBetween(rng, 1, 10);
    const name = `${pick(ENEMY_PARTS.prefix, rng)}${pick(ENEMY_PARTS.base, rng)}${pick(ENEMY_PARTS.suffix, rng)}`;
    const element = pick(ELEMENTS as unknown as string[], rng);
    const weakness = pick(ELEMENTS.filter(e => e !== element && e !== "none") as unknown as string[], rng);
    const description = `辺境にて目撃された${name}。${element === "none" ? "属性は感じられない" : `${jpElement(element)}の気配を纏う`}。`;
    const hp = 18 + level * 6 + intBetween(rng, 0, 10);
    const atk = 4 + level * 2 + intBetween(rng, 0, 4);
    const def = 1 + level + intBetween(rng, 0, 3);
    const spd = 4 + intBetween(rng, 0, level);
    const expReward = 8 + level * 6 + intBetween(rng, 0, 6);
    const goldReward = 5 + level * 5 + intBetween(rng, 0, 8);
    const v = validateGeneratedEnemy({ name, description, level, hp, atk, def, spd, element, weakness, expReward, goldReward });
    if (!v.ok) throw new Error("enemy validation failed: " + v.reason);
    return v.value;
  }

  async generateQuest(ctx: GenerationContext & { townName?: string }): Promise<GeneratedQuest> {
    const seed = ctx.seed ?? `${Date.now()}-${Math.random()}`;
    const rng = makeRng(seed);
    const tpl = pick(QUEST_TEMPLATES, rng);
    const enemy = `${pick(ENEMY_PARTS.prefix, rng)}${pick(ENEMY_PARTS.base, rng)}`;
    const place = ctx.townName ?? "この街";
    const count = intBetween(rng, 2, 5);
    const description = tpl.text
      .replace("{place}", place)
      .replace("{enemy}", enemy)
      .replace("{count}", String(count));
    const title = `${enemy}討伐`;
    const expReward = 30 + count * 10;
    const goldReward = 25 + count * 8;
    const v = validateGeneratedQuest({ title, description, goalType: tpl.goalType, goalParam: enemy, goalCount: count, expReward, goldReward });
    if (!v.ok) throw new Error("quest validation failed: " + v.reason);
    return v.value;
  }

  async generateRumor(ctx: GenerationContext & { townName: string }): Promise<string> {
    const seed = ctx.seed ?? `${Date.now()}-${Math.random()}`;
    const rng = makeRng(seed);
    const tpl = pick(RUMOR_TEMPLATES, rng);
    const text = tpl
      .replace("{place}", ctx.townName)
      .replace("{element}", jpElement(pick(ELEMENTS as unknown as string[], rng)))
      .replace("{role}", pick(ROLES, rng));
    const v = validateRumor(text);
    if (!v.ok) throw new Error("rumor validation failed: " + v.reason);
    return v.value;
  }

  async generateNpcDialogue(ctx: GenerationContext & { role?: string }): Promise<{ role: string; line: string }> {
    const seed = ctx.seed ?? `${Date.now()}-${Math.random()}`;
    const rng = makeRng(seed);
    const npc = pick(NPC_TEMPLATES, rng);
    return { role: ctx.role ?? npc.role, line: npc.line };
  }

  async generateDungeonName(ctx: GenerationContext): Promise<string> {
    const seed = ctx.seed ?? `${Date.now()}-${Math.random()}`;
    const rng = makeRng(seed);
    const a = pick(["忘れられた","古き","深淵の","蒼の","黄昏の","渇きの","霜の"], rng);
    const b = pick(["地下廊","遺跡","封印迷宮","鍾乳洞","水底回廊","塔","巣","谷","祠"], rng);
    return `${a}${b}`;
  }

  async generateItemName(ctx: GenerationContext & { slot: keyof typeof ITEM_NAMES }): Promise<string> {
    const seed = ctx.seed ?? `${Date.now()}-${Math.random()}`;
    const rng = makeRng(seed);
    return pick(ITEM_NAMES[ctx.slot], rng);
  }
}

function jpElement(e: string) {
  switch (e) {
    case "fire": return "火";
    case "water": return "水";
    case "earth": return "土";
    case "wind": return "風";
    case "light": return "光";
    case "dark": return "闇";
    default: return "無";
  }
}

function describeJob(cat: string, name: string, rng: () => number) {
  const flavor: Record<string, string[]> = {
    warrior: ["前線で剣を振るう道。","盾と勇気を糧にする。","数多の戦場を生き抜いた者の道。"],
    mage: ["古き書と詠唱に身を捧げる。","星と元素の理を読み解く者。","禁書を紐解く者の系譜。"],
    rogue: ["影と速さを武器にする者。","闇に紛れて急所を狙う。","誰にも気付かれず動く道。"],
    cleric: ["祈りで仲間を支える道。","聖なる光を手にする者。","誓いを糧に戦う者。"],
    craft: ["生産と創造に長けた職。","手に職を持つ実直な道。","素材から逸品を生み出す。"],
    support: ["旅と歌で人を導く者。","補助と機転で勝ちを呼ぶ。"],
    heretic: ["秘された術を扱う者。","異端の知を継ぐ稀有な道。"],
    rare: ["世界に数人と現れぬ稀少職。","選ばれし者の道。"],
    cursed: ["強大な力と引き換えに、何かを差し出す道。","一度足を踏み入れたら、戻ることは難しい。"],
  };
  return `${name}は、${pick(flavor[cat] ?? flavor.warrior, rng)}`;
}

function describeSkill(type: string, name: string, element: string | null) {
  const elt = element && element !== "none" ? `${jpElement(element)}属性の` : "";
  switch (type) {
    case "attack": return `${elt}${name}。敵単体に攻撃を加える。`;
    case "heal": return `${name}。味方単体のHPを回復する。`;
    case "buff": return `${name}。自身を一時的に強化する。`;
    case "debuff": return `${name}。敵を弱体化させる。`;
    case "special": return `${elt}秘技${name}。クールダウンが長いが強力。`;
    default: return name;
  }
}

function jobBaseStats(cat: string, rng: () => number, level: number) {
  const lv = Math.max(1, level);
  const base = {
    warrior: { hp: 40, mp: 8, atk: 12, def: 10, mat: 4, mdf: 6, spd: 6 },
    mage:    { hp: 25, mp: 30, atk: 5, def: 4, mat: 14, mdf: 10, spd: 6 },
    rogue:   { hp: 28, mp: 12, atk: 11, def: 6, mat: 6, mdf: 6, spd: 12 },
    cleric:  { hp: 32, mp: 24, atk: 7, def: 7, mat: 11, mdf: 12, spd: 6 },
    craft:   { hp: 30, mp: 14, atk: 8, def: 8, mat: 8, mdf: 8, spd: 6 },
    support: { hp: 28, mp: 22, atk: 6, def: 6, mat: 9, mdf: 10, spd: 9 },
    heretic: { hp: 25, mp: 28, atk: 7, def: 5, mat: 13, mdf: 8, spd: 8 },
    rare:    { hp: 38, mp: 20, atk: 12, def: 10, mat: 12, mdf: 10, spd: 9 },
    cursed:  { hp: 45, mp: 18, atk: 16, def: 6, mat: 14, mdf: 4, spd: 8 },
  } as const;
  const b = (base as any)[cat] ?? base.warrior;
  return {
    hp: b.hp + lv * 4 + intBetween(rng, 0, 4),
    mp: b.mp + lv * 2 + intBetween(rng, 0, 3),
    atk: b.atk + lv + intBetween(rng, 0, 2),
    def: b.def + lv + intBetween(rng, 0, 2),
    mat: b.mat + lv + intBetween(rng, 0, 2),
    mdf: b.mdf + lv + intBetween(rng, 0, 2),
    spd: b.spd + intBetween(rng, 0, 2),
  };
}

function pickRank(cat: string, rng: () => number) {
  if (cat === "rare") return pick(["advanced","special","legendary"], rng);
  if (cat === "heretic") return "heretic";
  if (cat === "cursed") return "cursed";
  return pick(["beginner","intermediate","advanced"], rng);
}

// AI service stub. If/when AI keys are provided, fall back to template if AI fails.
class AiContentGenerationService implements ContentGenerationService {
  constructor(private fallback: ContentGenerationService) {}
  async generateJob(ctx: GenerationContext) {
    // No real provider in MVP. Always fall back, but tag as ai for the audit story.
    return this.fallback.generateJob(ctx);
  }
  generateSkill(ctx: any) { return this.fallback.generateSkill(ctx); }
  generateEnemy(ctx: any) { return this.fallback.generateEnemy(ctx); }
  generateQuest(ctx: any) { return this.fallback.generateQuest(ctx); }
  generateRumor(ctx: any) { return this.fallback.generateRumor(ctx); }
  generateNpcDialogue(ctx: any) { return this.fallback.generateNpcDialogue(ctx); }
  generateDungeonName(ctx: any) { return this.fallback.generateDungeonName(ctx); }
  generateItemName(ctx: any) { return this.fallback.generateItemName(ctx); }
}

let cached: ContentGenerationService | null = null;

export function getContentGenerationService(): ContentGenerationService {
  if (cached) return cached;
  const provider = (process.env.AI_PROVIDER ?? "template").toLowerCase();
  const tpl = new TemplateContentGenerationService();
  if (provider === "template" || (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY)) {
    cached = tpl;
  } else {
    cached = new AiContentGenerationService(tpl);
  }
  return cached;
}

export function generationLabel() {
  const provider = (process.env.AI_PROVIDER ?? "template").toLowerCase();
  if (provider === "template") return "template";
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) return "template";
  return "ai";
}

export async function logGeneratedContent(args: {
  type: string;
  refId?: string | null;
  title: string;
  body: string;
  structured?: any;
  seed?: string;
  seasonId?: string | null;
  townId?: string | null;
  characterId?: string | null;
}) {
  await prisma.generatedContent.create({
    data: {
      type: args.type,
      refId: args.refId ?? null,
      title: args.title,
      body: args.body,
      structuredJson: JSON.stringify(args.structured ?? {}),
      seed: args.seed ?? null,
      seasonId: args.seasonId ?? null,
      townId: args.townId ?? null,
      characterId: args.characterId ?? null,
      generatedBy: generationLabel(),
      validationStatus: "ok",
    },
  });
}
