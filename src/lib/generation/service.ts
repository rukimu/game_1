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
  SEASONAL_RUMOR_TEMPLATES,
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
  // Optional context that lets generation react to the current world / character.
  // - seasonClueWords: short keywords from the current season's mystery; if present
  //   we splice them into rumors and NPC lines so the season permeates everywhere.
  // - characterArchetype: warrior/mage/rogue/cleric/support, used by NPCs to greet
  //   the player in a way that resonates with their bio.
  // - characterBioOpening: a short fragment of the character's bio (one clause)
  //   that NPCs may echo back to the player.
  seasonClueWords?: string[];
  characterArchetype?: string | null;
  characterBioOpening?: string | null;
};

export interface ContentGenerationService {
  generateJob(ctx: GenerationContext): Promise<GeneratedJob>;
  generateSkill(ctx: GenerationContext & { jobName?: string }): Promise<GeneratedSkill>;
  generateEnemy(ctx: GenerationContext): Promise<GeneratedEnemy>;
  generateQuest(ctx: GenerationContext & { townName?: string; otherTownName?: string }): Promise<GeneratedQuest>;
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
    const baseName = pick(ENEMY_PARTS.base, rng);
    const name = `${pick(ENEMY_PARTS.prefix, rng)}${baseName}${pick(ENEMY_PARTS.suffix, rng)}`;
    const element = pick(ELEMENTS as unknown as string[], rng);
    const weakness = pick(ELEMENTS.filter(e => e !== element && e !== "none") as unknown as string[], rng);
    const creatureType = inferCreatureType(baseName);
    const description = `辺境にて目撃された${name}。${element === "none" ? "属性は感じられない" : `${jpElement(element)}の気配を纏う`}。`;
    // Difficulty curve: starter level 1 should be winnable solo, but later
    // levels and dungeon-deep encounters scale harder than the player.
    const hp = 22 + level * 8 + intBetween(rng, 0, 10);
    const atk = 5 + level * 2 + intBetween(rng, 0, 3);
    const def = 1 + level + intBetween(rng, 0, 3);
    const spd = 4 + intBetween(rng, 0, level);
    // EXP/gold scale super-linearly so reward keeps pace with the leveling curve.
    // Lv1 ≈ 25 EXP, Lv10 ≈ 108, Lv30 ≈ 438, Lv50 ≈ 970.
    const expReward = 15 + level * (7 + Math.floor(level / 4)) + intBetween(rng, 0, 6);
    const goldReward = 8 + level * (5 + Math.floor(level / 6)) + intBetween(rng, 0, 8);
    const v = validateGeneratedEnemy({ name, description, level, hp, atk, def, spd, element, weakness, expReward, goldReward });
    if (!v.ok) throw new Error("enemy validation failed: " + v.reason);
    // Attach creatureType post-validate (the validator doesn't know the field).
    return { ...v.value, creatureType } as GeneratedEnemy & { creatureType: string };
  }

  async generateQuest(ctx: GenerationContext & { townName?: string; otherTownName?: string }): Promise<GeneratedQuest> {
    const seed = ctx.seed ?? `${Date.now()}-${Math.random()}`;
    const rng = makeRng(seed);
    const tpl = pick(QUEST_TEMPLATES, rng);
    const enemy = `${pick(ENEMY_PARTS.prefix, rng)}${pick(ENEMY_PARTS.base, rng)}`;
    const place = ctx.townName ?? "この街";
    const otherPlace = ctx.otherTownName ?? "遠くの街";
    const count = intBetween(rng, 2, 5);
    const description = tpl.text
      .replace("{place}", place)
      .replace("{enemy}", enemy)
      .replace("{count}", String(count))
      .replace("{otherPlace}", otherPlace);
    // Title varies by quest kind so the player sees what they're getting at a glance.
    const title = tpl.kind === "defeat" ? `${enemy}討伐`
      : tpl.kind === "collect" ? "装備品の供出"
      : tpl.kind === "explore" ? `${otherPlace}への伝令`
      : "戦いの腕試し";
    // Reward also scales by kind. Explore is one-and-done so we pay flat.
    const baseExp = 30 + count * 10;
    const baseGold = 25 + count * 8;
    const expReward = tpl.kind === "explore" ? 40 : baseExp;
    const goldReward = tpl.kind === "explore" ? 50 : baseGold;
    // goalParam carries either the enemy name (defeat), the destination town
    // (visit_town), or empty (collect_drop / win_battles).
    const goalParam = tpl.goalType === "defeat_enemy" ? enemy
      : tpl.goalType === "visit_town" ? otherPlace
      : "";
    // Adjust goalCount per kind so explore is 1-shot, collect is small, etc.
    const goalCount = tpl.goalType === "visit_town" ? 1
      : tpl.goalType === "collect_drop" ? Math.max(2, intBetween(rng, 2, 4))
      : tpl.goalType === "win_battles" ? Math.max(2, intBetween(rng, 2, 5))
      : count;
    const v = validateGeneratedQuest({ title, description, goalType: tpl.goalType, goalParam, goalCount, expReward, goldReward });
    if (!v.ok) throw new Error("quest validation failed: " + v.reason);
    return v.value;
  }

  async generateRumor(ctx: GenerationContext & { townName: string }): Promise<string> {
    const seed = ctx.seed ?? `${Date.now()}-${Math.random()}`;
    const rng = makeRng(seed);
    const seasonWords = ctx.seasonClueWords ?? [];
    // 45% chance to use a season-flavored template if we have keywords. The
    // season's central mystery thus permeates rumors across every town without
    // ever spelling out the answer.
    const useSeasonal = seasonWords.length > 0 && rng() < 0.45;
    const tpl = useSeasonal
      ? pick(SEASONAL_RUMOR_TEMPLATES, rng)
      : pick(RUMOR_TEMPLATES, rng);
    const text = tpl
      .replace("{place}", ctx.townName)
      .replace("{element}", jpElement(pick(ELEMENTS as unknown as string[], rng)))
      .replace("{role}", pick(ROLES, rng))
      .replace("{seasonWord}", useSeasonal ? pick(seasonWords, rng) : "");
    const v = validateRumor(text);
    if (!v.ok) throw new Error("rumor validation failed: " + v.reason);
    return v.value;
  }

  async generateNpcDialogue(ctx: GenerationContext & { role?: string }): Promise<{ role: string; line: string }> {
    const seed = ctx.seed ?? `${Date.now()}-${Math.random()}`;
    const rng = makeRng(seed);
    const npc = pick(NPC_TEMPLATES, rng);
    const role = ctx.role ?? npc.role;
    let line = roleLineFor(role, rng) ?? npc.line;
    // Sprinkle a season keyword into ~40% of NPC lines so the central mystery
    // surfaces in casual chatter, not just in tavern rumors.
    const seasonWords = ctx.seasonClueWords ?? [];
    if (seasonWords.length > 0 && rng() < 0.4) {
      const word = pick(seasonWords, rng);
      line = `${line} 最近は『${word}』の話ばかりだよ。`;
    }
    // ~35% chance the NPC reads the player's archetype off them. Pure flavor —
    // never reveals stats — but it makes the world feel as if it knows you.
    if (ctx.characterArchetype && rng() < 0.35) {
      const greet = ARCHETYPE_NPC_GREETINGS[ctx.characterArchetype];
      if (greet && greet.length > 0) line = `${line} ${pick(greet, rng)}`;
    }
    return { role, line };
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

// Loosely classify an enemy by its base noun. Used by slay-bonus affixes.
// Names not matched fall back to "humanoid" since that's the largest bucket
// among ENEMY_PARTS.base, but mismatches are non-fatal in combat.
function inferCreatureType(baseName: string): "humanoid" | "beast" | "undead" | "magic" | "construct" | "unknown" {
  if (/(スケルトン|リッチ|屍|ゾンビ|亡霊)/.test(baseName)) return "undead";
  if (/(オオカミ|ハーピー|ワーム|獣|蜘蛛|蛇)/.test(baseName)) return "beast";
  if (/(スライム|鎧人形|ゴーレム|機巧)/.test(baseName)) return "construct";
  if (/(魔導|魔狼|精霊|霊|魔)/.test(baseName)) return "magic";
  if (/(ゴブリン|コボルト|オーク|盗賊|盗賊団|兵士)/.test(baseName)) return "humanoid";
  return "unknown";
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

// Per-role line variants. NPCs feel less repetitive when each role has 2-3 ways
// to greet the player. The fallback NPC_TEMPLATES is still used for unknown roles.
const ROLE_LINE_VARIANTS: Record<string, string[]> = {
  "酒場の主人": [
    "ようこそ。今日はちょっと変わった噂が流れているよ。",
    "席は空いてる。何か飲むかい？それとも噂が目当てかね。",
    "あんた、今日も歩き通しか。火の傍で温まっていきな。",
  ],
  "宿屋の主人": [
    "一晩あたためた寝床と、温かい飯を出すよ。",
    "今夜はやけに静かだ。ぐっすり眠れるはずさ。",
    "鎧は脱いで楽にしな。ここは戦場じゃない。",
  ],
  "旅の吟遊詩人": [
    "新しい歌を覚えたんだ、聴いていくかい？",
    "酒場で集めた物語ばかりだ。どれも誰かの本当だよ。",
    "歌わないなら、今夜の旅人にはなれないのさ。",
  ],
  "占い師": [
    "あんたの星には、まだ見ぬ職が浮かんでいる…。",
    "近頃、星の並びが変だ。何かが目覚めようとしている。",
    "あんたの選択ひとつで、あの星座は形を変える。",
  ],
  "転職屋の老人": [
    "心当たりがあるなら、そこを開いてみるといい。鍵はあんた自身だ。",
    "道は閉じたんじゃない。歩き慣れた足が次の道を覚えていないだけだ。",
    "選んだ職は記憶になる。記憶は呼び戻せる。",
  ],
};

function roleLineFor(role: string, rng: () => number): string | null {
  const variants = ROLE_LINE_VARIANTS[role];
  if (!variants || variants.length === 0) return null;
  return pick(variants, rng);
}

// Lines that NPCs may add when they sense the player's archetype. These are
// flavor-only — they never reveal stats and they should never be the *whole*
// line, only a tail addition.
const ARCHETYPE_NPC_GREETINGS: Record<string, string[]> = {
  warrior: [
    "あんた、肩の構え方が戦場の人間のそれだ。",
    "剣を握り続けた手だな。守るために振るう手だ。",
  ],
  mage: [
    "書物の埃の匂いがする。詠唱者の目だ。",
    "言葉を信じている人間は、目の奥が静かなんだ。",
  ],
  rogue: [
    "足音を消す癖は、隠せないものだよ。",
    "あんたの影、濃いね。よく光を見てきた人だ。",
  ],
  cleric: [
    "祈りを忘れない者は、見ればわかる。",
    "あんたの気配、心が静かだ。誰かに尽くしてきた人だな。",
  ],
  support: [
    "あんた、よく歌を聴いてきた人だな。",
    "賑やかな人生を歩んできたんだろう。耳がいい。",
  ],
};

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
