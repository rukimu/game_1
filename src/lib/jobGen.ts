// Mass job generator. Used by the seed to populate Job + Skill rows so
// any Lv-up job-change candidate has thousands of distinct entries to draw
// from. Each generated job has 2-3 procedurally-named skills attached.
//
// We deliberately seed THOUSANDS so the world feels like the spec promised:
// "ほぼ無限に拡張できる職業構造". 攻略サイトに辞書として全職業を載せる
// だけでも気力が要る分量にする。

import { JOB_PARTS, ELEMENTS } from "@/lib/generation/templates";
import { intBetween, makeRng, pick } from "@/lib/rng";

export type GeneratedJobEntry = {
  name: string;
  category: string;
  rank: string;
  description: string;
  isCursed: boolean;
  baseStats: {
    hp: number; mp: number; atk: number; def: number; mat: number; mdf: number; spd: number;
  };
  skills: Array<{
    name: string;
    description: string;
    type: "attack" | "heal" | "buff" | "debuff" | "special";
    element: string | null;
    power: number;
    cost: number;
    cooldown: number;
    targetType: string;
  }>;
};

const RANKS_BY_CATEGORY: Record<string, string[]> = {
  warrior: ["beginner", "intermediate", "advanced", "special", "legendary"],
  mage: ["beginner", "intermediate", "advanced", "special", "legendary"],
  rogue: ["beginner", "intermediate", "advanced", "special"],
  cleric: ["beginner", "intermediate", "advanced", "special", "legendary"],
  craft: ["beginner", "intermediate", "advanced"],
  support: ["beginner", "intermediate", "advanced"],
  heretic: ["heretic"],
  rare: ["legendary"],
  cursed: ["cursed"],
};

// Per-category base stats; the generator slightly perturbs these per-job so
// two "黒鉄の重装兵" instances aren't bit-identical.
const BASE_STATS: Record<string, { hp: number; mp: number; atk: number; def: number; mat: number; mdf: number; spd: number }> = {
  warrior: { hp: 40, mp: 8,  atk: 12, def: 10, mat: 4,  mdf: 6,  spd: 6 },
  mage:    { hp: 25, mp: 30, atk: 5,  def: 4,  mat: 14, mdf: 10, spd: 6 },
  rogue:   { hp: 28, mp: 12, atk: 11, def: 6,  mat: 6,  mdf: 6,  spd: 12 },
  cleric:  { hp: 32, mp: 24, atk: 7,  def: 7,  mat: 11, mdf: 12, spd: 6 },
  craft:   { hp: 30, mp: 14, atk: 8,  def: 8,  mat: 8,  mdf: 8,  spd: 6 },
  support: { hp: 28, mp: 22, atk: 6,  def: 6,  mat: 9,  mdf: 10, spd: 9 },
  heretic: { hp: 25, mp: 28, atk: 7,  def: 5,  mat: 13, mdf: 8,  spd: 8 },
  rare:    { hp: 38, mp: 20, atk: 12, def: 10, mat: 12, mdf: 10, spd: 9 },
  cursed:  { hp: 45, mp: 18, atk: 16, def: 6,  mat: 14, mdf: 4,  spd: 8 },
};

const SKILL_BASE_BY_TYPE: Record<string, string[]> = {
  attack:  ["斬", "突", "打", "刺", "剣", "槍", "拳", "牙", "刃", "舞", "閃"],
  heal:    ["祈", "癒", "息", "光", "治", "薬"],
  buff:    ["鼓", "歌", "印", "風", "陽"],
  debuff:  ["呪", "霧", "鎖", "錆", "縛", "封"],
  special: ["秘", "封", "万", "深", "終", "黎"],
};
const SKILL_PREFIX = [
  "鋼の", "蒼炎の", "霜の", "閃光の", "黎明の", "黄昏の", "暁の", "禁の",
  "深淵の", "百舌の", "獣牙の", "塔陰の", "鏡映の", "風喰みの", "灰の",
];
const SKILL_SUFFIX = [
  "陣", "技", "舞", "閃", "断", "詠", "節", "光", "貫", "撃", "歌", "詠唱",
];

// Generate jobs across a deterministic combinatorial space. The default of
// jobsPerCategory=120 gives 9 × 120 = 1080 jobs total. Bumping it to 200
// produces ~1800 — bounded by the JOB_PARTS combinatorial which is now
// ~5000 across categories.
export function generateMassJobs(jobsPerCategory: number = 200): GeneratedJobEntry[] {
  const out: GeneratedJobEntry[] = [];
  const seen = new Set<string>();
  for (const [cat, parts] of Object.entries(JOB_PARTS) as Array<[string, { prefix: string[]; base: string[]; suffix: string[] }]>) {
    const ranks = RANKS_BY_CATEGORY[cat] ?? ["beginner"];
    const baseStats = BASE_STATS[cat] ?? BASE_STATS.warrior;
    let made = 0;
    let attempt = 0;
    while (made < jobsPerCategory && attempt < jobsPerCategory * 10) {
      attempt++;
      const rng = makeRng(`job-${cat}-${attempt}`);
      const name = `${pick(parts.prefix, rng)}${pick(parts.base, rng)}${pick(parts.suffix, rng)}`;
      if (seen.has(name)) continue;
      seen.add(name);
      const rank = pick(ranks, rng);
      const isCursed = cat === "cursed";
      const description = describeJob(cat, name, rng);
      const stats = {
        hp: baseStats.hp + intBetween(rng, -3, 5),
        mp: baseStats.mp + intBetween(rng, -2, 4),
        atk: baseStats.atk + intBetween(rng, -2, 3),
        def: baseStats.def + intBetween(rng, -1, 3),
        mat: baseStats.mat + intBetween(rng, -1, 3),
        mdf: baseStats.mdf + intBetween(rng, -1, 2),
        spd: baseStats.spd + intBetween(rng, -1, 2),
      };
      const skills = generateSkillsForJob(cat, name, rng);
      out.push({ name, category: cat, rank, description, isCursed, baseStats: stats, skills });
      made++;
    }
  }
  return out;
}

function describeJob(cat: string, name: string, rng: () => number): string {
  const lines: Record<string, string[]> = {
    warrior: [
      "前線で剣を振るう道。", "盾と勇気を糧にする。", "数多の戦場を生き抜いた者の道。",
      "鋼の意志で剣を継ぐ系譜。", "剣の通った道だけを歩む者。", "戦の喧噪の中で静かさを得る道。",
    ],
    mage: [
      "古き書と詠唱に身を捧げる。", "星と元素の理を読み解く者。", "禁書を紐解く者の系譜。",
      "言葉そのものに重みを乗せる職。", "詠唱の余韻が世界を歪める者。",
    ],
    rogue: [
      "影と速さを武器にする者。", "闇に紛れて急所を狙う。", "誰にも気付かれず動く道。",
      "鍵と嘘を扱う者の家系。", "誰もが見過ごす道を知る者。",
    ],
    cleric: [
      "祈りで仲間を支える道。", "聖なる光を手にする者。", "誓いを糧に戦う者。",
      "他者の痛みを己が痛みとする道。", "夜明けと夕暮れに祈る者。",
    ],
    craft: [
      "生産と創造に長けた職。", "手に職を持つ実直な道。", "素材から逸品を生み出す。",
      "鉄と火と祈りで道具を生む者。", "壊れた物の声を聞く職。",
    ],
    support: [
      "旅と歌で人を導く者。", "補助と機転で勝ちを呼ぶ。",
      "他者の士気そのものを糧にする者。", "歌でしか動かない心を動かす。",
    ],
    heretic: [
      "秘された術を扱う者。", "異端の知を継ぐ稀有な道。",
      "暦から消された呪文を口ずさむ者。", "禁じられた書架の鍵を持つ家系。",
    ],
    rare: [
      "世界に数人と現れぬ稀少職。", "選ばれし者の道。",
      "星の並びに従って現れる職。", "誓いの代償に得る稀少の業。",
    ],
    cursed: [
      "強大な力と引き換えに、何かを差し出す道。", "一度足を踏み入れたら、戻ることは難しい。",
      "贄として己を世界に捧げる職。", "歌うことを禁じられた口を持つ者。",
    ],
  };
  return `${name}は、${pick(lines[cat] ?? lines.warrior, rng)}`;
}

function generateSkillsForJob(cat: string, jobName: string, rng: () => number): GeneratedJobEntry["skills"] {
  // Number of skills scales with rank-tier-equivalent: 2 for low, 3-4 for high.
  const count = ["heretic", "rare", "cursed"].includes(cat) ? 4 : intBetween(rng, 2, 3);
  const types: Array<"attack" | "heal" | "buff" | "debuff" | "special"> =
    cat === "cleric" ? ["heal", "buff", "attack", "special"] :
    cat === "support" ? ["buff", "heal", "debuff", "attack"] :
    cat === "mage" ? ["attack", "debuff", "special", "buff"] :
    cat === "rogue" ? ["attack", "debuff", "special"] :
    cat === "warrior" ? ["attack", "buff", "special", "attack"] :
    cat === "craft" ? ["buff", "debuff", "attack"] :
    cat === "heretic" ? ["debuff", "special", "attack", "heal"] :
    cat === "cursed" ? ["attack", "debuff", "special", "special"] :
    ["attack", "buff", "heal", "special"];
  const out: GeneratedJobEntry["skills"] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const t = types[i % types.length];
    let attempt = 0;
    let name = "";
    do {
      const rune = pick(SKILL_BASE_BY_TYPE[t] ?? ["技"], rng);
      const prefix = pick(SKILL_PREFIX, rng);
      const suffix = pick(SKILL_SUFFIX, rng);
      name = `${prefix}${rune}${suffix}`;
      attempt++;
    } while (seen.has(name) && attempt < 10);
    seen.add(name);
    const element: string | null = (t === "attack" || t === "special")
      ? pick([...ELEMENTS] as string[], rng) : null;
    out.push({
      name,
      description: describeSkill(t, name, element),
      type: t,
      element,
      power: t === "heal" ? intBetween(rng, 14, 32)
           : t === "buff" || t === "debuff" ? intBetween(rng, 0, 5)
           : intBetween(rng, 14, 38),
      cost: t === "special" ? intBetween(rng, 10, 24) : intBetween(rng, 2, 12),
      cooldown: t === "special" ? intBetween(rng, 1, 3) : 0,
      targetType: t === "heal" ? "ally" : t === "buff" ? "self" : "enemy",
    });
  }
  return out;
}

function describeSkill(type: string, name: string, element: string | null): string {
  const elt = element && element !== "none" ? `${jpElement(element)}属性の` : "";
  switch (type) {
    case "attack":  return `${elt}${name}。敵単体に攻撃を加える。`;
    case "heal":    return `${name}。味方単体のHPを回復する。`;
    case "buff":    return `${name}。自身を一時的に強化する。`;
    case "debuff":  return `${name}。敵を弱体化させる。`;
    case "special": return `${elt}秘技${name}。クールダウンが長いが強力。`;
    default:        return name;
  }
}

function jpElement(e: string): string {
  switch (e) {
    case "fire": return "火"; case "water": return "水"; case "earth": return "土";
    case "wind": return "風"; case "light": return "光"; case "dark": return "闇";
    default: return "無";
  }
}
