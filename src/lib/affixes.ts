// Hack-and-slash style affix system.
//
// When a weapon or piece of armor drops from a defeated enemy, we roll a tier
// (common/rare/epic/legendary) based on enemy level + luck, then layer 0-2
// prefixes and 0-1 suffix on top of the base item. Each affix carries:
//
//   - a Japanese fragment to splice into the displayName
//   - additional flat stat bonuses (atk, def, mat, mdf, hp, mp)
//   - optional special-effect flavor text shown in the inventory
//
// Affix output is fully serializable (StructuredAffix[]) so we can persist it
// into InventoryItem.instanceJson and re-render on the client without touching
// the global Item table. Two players can both find a "古びた剣" and one wields
// "蒼炎の 古びた剣 の獣狩り" while the other has "頑強な 古びた剣". The base
// recipe is the same; the actual blade is different.
//
// IMPORTANT: rolls are performed server-side only. Clients see results, never
// the dice — affix tables and probabilities are not exposed via any API.

import { intBetween, makeRng, pick } from "@/lib/rng";

export type AffixTier = "common" | "rare" | "epic" | "legendary";

export type StatBonus = {
  atk?: number;
  def?: number;
  mat?: number;
  mdf?: number;
  hp?: number;
  mp?: number;
};

export type StructuredAffix = {
  kind: "prefix" | "suffix";
  text: string;
  bonus: StatBonus;
  special?: string; // flavor text for the rare "specials" tier
  effects?: SpecialEffect[]; // machine-readable counterpart of `special`
};

// Special effects that the combat engine actually reads. Each affix can ship
// `special` (flavor text shown in the inventory) plus `effects` (the
// mechanical version that battle.ts adds to the player). Keeping them aligned
// is intentional — the flavor sentence is the contract, the effect is its
// implementation.
export type SpecialEffect =
  | { kind: "slay"; target: CreatureType; bonusPercent: number }    // bonus damage vs creature type
  | { kind: "crit_rate"; bonusPercent: number }                     // crit chance +N%
  | { kind: "crit_damage"; bonusPercent: number }                   // crit multiplier +N%
  | { kind: "lifesteal"; percent: number }                          // % of damage healed back
  | { kind: "post_battle_regen"; amount: number }                   // hp restored after each won battle
  | { kind: "speed_aura"; amount: number };                         // flat spd boost (also reflected in stats sum, but combat reads here for log)

// Loosely categorize generated/seeded enemies so slay-bonus affixes can find
// matches. battle.ts also stores this on EnemyState.
export type CreatureType = "humanoid" | "beast" | "undead" | "magic" | "construct" | "unknown";

export type ItemInstance = {
  tier: AffixTier;
  affixes: StructuredAffix[];
  bonusStats: StatBonus; // pre-summed for quick combat lookup
  specials: string[];
  // Cached display name. Always render from the affix array if you need to
  // mutate, but reading this is cheap.
  displayName: string;
};

// ----- Affix tables -------------------------------------------------------

type AffixDef = {
  text: string;
  bonus: StatBonus;
  special?: string;
  effects?: SpecialEffect[];
};

const PREFIXES_T1: AffixDef[] = [
  { text: "鋭い", bonus: { atk: 2 } },
  { text: "頑強な", bonus: { def: 2 } },
  { text: "素早い", bonus: { atk: 1 } },
  { text: "燻し銀の", bonus: { def: 1, atk: 1 } },
  { text: "古めかしい", bonus: { atk: 1, hp: 4 } },
  { text: "練磨の", bonus: { atk: 2, def: 1 } },
  { text: "若き", bonus: { mat: 1, mp: 3 } },
  { text: "整った", bonus: { def: 2, mdf: 1 } },
];

const PREFIXES_T2: AffixDef[] = [
  { text: "蒼炎の", bonus: { mat: 4, atk: 2 }, special: "刃に微かな炎が灯っている。クリティカル率 +5%。", effects: [{ kind: "crit_rate", bonusPercent: 5 }] },
  { text: "霜結ぶ", bonus: { mdf: 3, def: 2 }, special: "触れた者の指先が悴む。" },
  { text: "雷を孕む", bonus: { atk: 4, mat: 2 }, special: "鞘から微かな放電が漏れる。クリティカル時のダメージ +20%。", effects: [{ kind: "crit_damage", bonusPercent: 20 }] },
  { text: "月光の", bonus: { mat: 3, mdf: 3 }, special: "夜にだけ柄が淡く光る。" },
  { text: "影喰みの", bonus: { atk: 5, hp: -3 }, special: "握る手から温度が逃げていく。与ダメの 5% を吸収して回復する。", effects: [{ kind: "lifesteal", percent: 5 }] },
  { text: "聖印の", bonus: { mdf: 4, hp: 6 }, special: "祈りに似た振動を伝える。戦闘終了後にHPがわずかに回復する。", effects: [{ kind: "post_battle_regen", amount: 8 }] },
  { text: "黄昏の", bonus: { atk: 3, mat: 3 }, special: "見つめると視野の端が薄暗くなる。" },
  { text: "羽化する", bonus: { atk: 2, def: 2, hp: 4 }, special: "速度がわずかに上がる。", effects: [{ kind: "speed_aura", amount: 2 }] },
  { text: "深紅の", bonus: { atk: 5 } },
  { text: "翠玉の", bonus: { mdf: 4, mp: 5 } },
];

const PREFIXES_T3: AffixDef[] = [
  { text: "竜殺しの", bonus: { atk: 9, def: 3, hp: 8 }, special: "竜種の前で柄が熱を持つ。獣型・不死型・構築型の敵に与ダメ +25%。", effects: [{ kind: "slay", target: "beast", bonusPercent: 25 }, { kind: "slay", target: "undead", bonusPercent: 25 }, { kind: "slay", target: "construct", bonusPercent: 25 }] },
  { text: "星詠みの", bonus: { mat: 9, mdf: 4, mp: 10 }, special: "夜空の星座が刃に映り込む。クリティカル率 +10%。", effects: [{ kind: "crit_rate", bonusPercent: 10 }] },
  { text: "封印された", bonus: { atk: 7, mat: 7 }, special: "持ち主以外には重すぎて動かない。与ダメの 8% を吸収する。", effects: [{ kind: "lifesteal", percent: 8 }] },
  { text: "灯の年の", bonus: { atk: 5, mat: 5, hp: 10, mp: 8 }, special: "シーズンの中心の謎と共鳴している。戦闘後にHPが大きく回復する。", effects: [{ kind: "post_battle_regen", amount: 18 }] },
  { text: "伝承の", bonus: { atk: 6, def: 6, hp: 12 }, special: "古い詩に名が残されている。クリティカル時のダメージ +35%。", effects: [{ kind: "crit_damage", bonusPercent: 35 }] },
];

const SUFFIXES_T1: AffixDef[] = [
  { text: "の試作", bonus: { atk: 1 } },
  { text: "の刻印", bonus: { def: 1 } },
  { text: "の手記", bonus: { mat: 1 } },
  { text: "の継承", bonus: { hp: 5 } },
  { text: "の鍛え直し", bonus: { atk: 1, def: 1 } },
];

const SUFFIXES_T2: AffixDef[] = [
  { text: "の獣狩り", bonus: { atk: 4 }, special: "獣型の敵に与ダメ +20%。", effects: [{ kind: "slay", target: "beast", bonusPercent: 20 }] },
  { text: "の魔狩り", bonus: { mat: 4 }, special: "魔法を扱う敵に与ダメ +20%。", effects: [{ kind: "slay", target: "magic", bonusPercent: 20 }] },
  { text: "の風斬り", bonus: { atk: 2, mat: 2 }, special: "速度がさらに +2。", effects: [{ kind: "speed_aura", amount: 2 }] },
  { text: "の月詠み", bonus: { mat: 3, mp: 6 } },
  { text: "の鎮魂", bonus: { mdf: 4, hp: 8 }, special: "戦闘後 HP がわずかに自然回復する。", effects: [{ kind: "post_battle_regen", amount: 6 }] },
  { text: "の不眠", bonus: { atk: 3, hp: -2 }, special: "夜が来てもこれを置いて眠れない。クリティカル率 +3%。", effects: [{ kind: "crit_rate", bonusPercent: 3 }] },
  { text: "の探求", bonus: { mat: 3, mp: 4 } },
  { text: "の屍払い", bonus: { atk: 3, mdf: 2 }, special: "不死型の敵に与ダメ +25%。", effects: [{ kind: "slay", target: "undead", bonusPercent: 25 }] },
];

const SUFFIXES_T3: AffixDef[] = [
  { text: "の絶剣", bonus: { atk: 12, def: 4 }, special: "詠唱不要で刃が震える。クリティカル率 +8%、クリティカル時ダメ +20%。", effects: [{ kind: "crit_rate", bonusPercent: 8 }, { kind: "crit_damage", bonusPercent: 20 }] },
  { text: "の禁忌", bonus: { mat: 12, mp: 10 }, special: "これを抜いた者の名は記録から削られる。与ダメの 10% を吸収する。", effects: [{ kind: "lifesteal", percent: 10 }] },
  { text: "の伝承", bonus: { atk: 6, def: 6, mat: 6, mdf: 6 }, special: "戦闘後にHPがしっかり回復する。", effects: [{ kind: "post_battle_regen", amount: 25 }] },
];

// ----- Tier roll ---------------------------------------------------------

// Probability table by enemy level. Rare and above get more common as the
// enemy grows, but legendaries remain rare even at the level cap to give them
// real weight when they finally drop.
function rollTier(rng: () => number, enemyLevel: number): AffixTier {
  const r = rng();
  const lv = Math.max(1, enemyLevel);
  const epicCh = Math.min(0.05 + lv * 0.005, 0.18);    // ~5.5% Lv1 → 18% Lv26+
  const rareCh = Math.min(0.18 + lv * 0.012, 0.45);    // ~19% Lv1 → 45% Lv22+
  const legCh = Math.min(0.005 + lv * 0.0008, 0.025);  // 0.5% Lv1 → 2.5% Lv25+
  if (r < legCh) return "legendary";
  if (r < legCh + epicCh) return "epic";
  if (r < legCh + epicCh + rareCh) return "rare";
  return "common";
}

// How many affixes per tier (prefixes / suffixes).
function affixCounts(tier: AffixTier): { prefix: number; suffix: number } {
  switch (tier) {
    case "legendary": return { prefix: 2, suffix: 1 };
    case "epic":      return { prefix: 1, suffix: 1 };
    case "rare":      return { prefix: 1, suffix: 0 };
    default:          return { prefix: 0, suffix: 0 };
  }
}

function prefixPoolFor(tier: AffixTier): AffixDef[] {
  switch (tier) {
    case "legendary": return [...PREFIXES_T3, ...PREFIXES_T2];
    case "epic":      return [...PREFIXES_T2, ...PREFIXES_T1];
    case "rare":      return [...PREFIXES_T1, ...PREFIXES_T2];
    default:          return PREFIXES_T1;
  }
}

function suffixPoolFor(tier: AffixTier): AffixDef[] {
  switch (tier) {
    case "legendary": return [...SUFFIXES_T3, ...SUFFIXES_T2];
    case "epic":      return [...SUFFIXES_T2, ...SUFFIXES_T1];
    case "rare":      return SUFFIXES_T1;
    default:          return [];
  }
}

// ----- Public API --------------------------------------------------------

// Rolls an instance for a base item. Pure (given seed) — same seed yields the
// same instance, which makes audit logging and reproducibility easy.
export function rollItemInstance(args: {
  baseName: string;
  enemyLevel: number;
  seed?: string;
  // Allow caller to force a tier — used by quest rewards or admin grants.
  forcedTier?: AffixTier;
}): ItemInstance {
  const seed = args.seed ?? `${Date.now()}-${Math.random()}`;
  const rng = makeRng(seed);
  const tier = args.forcedTier ?? rollTier(rng, args.enemyLevel);
  const counts = affixCounts(tier);
  const prefixes: StructuredAffix[] = [];
  const suffixes: StructuredAffix[] = [];

  // Pick prefixes without replacement.
  const prefixPool = prefixPoolFor(tier).slice();
  for (let i = 0; i < counts.prefix && prefixPool.length > 0; i++) {
    const idx = Math.floor(rng() * prefixPool.length);
    const def = prefixPool.splice(idx, 1)[0];
    prefixes.push({ kind: "prefix", text: def.text, bonus: def.bonus, special: def.special, effects: def.effects });
  }
  const suffixPool = suffixPoolFor(tier).slice();
  for (let i = 0; i < counts.suffix && suffixPool.length > 0; i++) {
    const idx = Math.floor(rng() * suffixPool.length);
    const def = suffixPool.splice(idx, 1)[0];
    suffixes.push({ kind: "suffix", text: def.text, bonus: def.bonus, special: def.special, effects: def.effects });
  }

  // Layer a small per-instance variance on rare+ items so two "蒼炎の 古びた剣"
  // still differ slightly in atk/def. ±1 across each non-zero stat.
  const variance: StatBonus = tier === "common" ? {} : {
    atk: intBetween(rng, -1, 1),
    def: intBetween(rng, -1, 1),
    mat: intBetween(rng, -1, 1),
    mdf: intBetween(rng, -1, 1),
  };

  const allAffixes = [...prefixes, ...suffixes];
  const bonusStats = sumBonuses([...allAffixes.map((a) => a.bonus), variance]);
  const specials = allAffixes.map((a) => a.special).filter((s): s is string => !!s);

  const prefixText = prefixes.map((a) => a.text).join("");
  const suffixText = suffixes.map((a) => a.text).join("");
  const displayName = `${prefixText}${prefixText ? " " : ""}${args.baseName}${suffixText}`.trim();

  return { tier, affixes: allAffixes, bonusStats, specials, displayName };
}

export function sumBonuses(list: StatBonus[]): StatBonus {
  const out: Required<StatBonus> = { atk: 0, def: 0, mat: 0, mdf: 0, hp: 0, mp: 0 };
  for (const b of list) {
    out.atk += b.atk ?? 0;
    out.def += b.def ?? 0;
    out.mat += b.mat ?? 0;
    out.mdf += b.mdf ?? 0;
    out.hp += b.hp ?? 0;
    out.mp += b.mp ?? 0;
  }
  // Drop zero entries to keep instanceJson small.
  const compact: StatBonus = {};
  if (out.atk) compact.atk = out.atk;
  if (out.def) compact.def = out.def;
  if (out.mat) compact.mat = out.mat;
  if (out.mdf) compact.mdf = out.mdf;
  if (out.hp) compact.hp = out.hp;
  if (out.mp) compact.mp = out.mp;
  return compact;
}

export function tierLabel(tier: AffixTier): string {
  switch (tier) {
    case "legendary": return "伝説";
    case "epic":      return "希少";
    case "rare":      return "良質";
    default:          return "並";
  }
}

export function tierColorClass(tier: AffixTier): string {
  switch (tier) {
    case "legendary": return "text-orange-300";
    case "epic":      return "text-purple-300";
    case "rare":      return "text-blue-300";
    default:          return "text-yellow-100/80";
  }
}

// Parse persisted instance data, tolerating missing fields for legacy rows.
export function parseInstance(json: string | null | undefined): ItemInstance | null {
  if (!json) return null;
  try {
    const obj = JSON.parse(json);
    if (!obj || !obj.tier) return null;
    return {
      tier: obj.tier,
      affixes: obj.affixes ?? [],
      bonusStats: obj.bonusStats ?? {},
      specials: obj.specials ?? [],
      displayName: obj.displayName ?? "",
    } as ItemInstance;
  } catch {
    return null;
  }
}

// Aggregate the structured effects across all equipped instances of a
// character. battle.ts calls this at the start of resolveTurn so a fresh
// drop influences the very next swing. Always returns a stable shape so
// callers can read fields without null checks.
export type AggregatedEffects = {
  critRateBonus: number;       // additive %, capped at +50 elsewhere
  critDamageBonus: number;     // additive %, e.g. 25 means crit does 1.5 + 0.25 = 1.75x
  lifestealPercent: number;    // additive %, capped at 50
  postBattleRegen: number;     // flat hp restored after a winning battle
  speedAura: number;           // already counted in stat sum but kept for log clarity
  slay: Partial<Record<CreatureType, number>>; // bonus % per creature type
};

export function aggregateEffects(instances: (ItemInstance | null)[]): AggregatedEffects {
  const out: AggregatedEffects = {
    critRateBonus: 0,
    critDamageBonus: 0,
    lifestealPercent: 0,
    postBattleRegen: 0,
    speedAura: 0,
    slay: {},
  };
  for (const inst of instances) {
    if (!inst) continue;
    for (const aff of inst.affixes) {
      const effects = aff.effects ?? [];
      for (const ef of effects) {
        switch (ef.kind) {
          case "crit_rate":     out.critRateBonus += ef.bonusPercent; break;
          case "crit_damage":   out.critDamageBonus += ef.bonusPercent; break;
          case "lifesteal":     out.lifestealPercent += ef.percent; break;
          case "post_battle_regen": out.postBattleRegen += ef.amount; break;
          case "speed_aura":    out.speedAura += ef.amount; break;
          case "slay":          out.slay[ef.target] = (out.slay[ef.target] ?? 0) + ef.bonusPercent; break;
        }
      }
    }
  }
  // safety caps
  out.critRateBonus = Math.min(50, out.critRateBonus);
  out.lifestealPercent = Math.min(50, out.lifestealPercent);
  return out;
}
