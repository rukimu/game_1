// Mass item generator. Used by the seed to populate hundreds of weapons +
// armor + accessory base items. Per-instance affixes (Cycle 3) layer on
// top, so the actual unique-instance space is base × ~hundreds.

import { intBetween, makeRng, pick } from "@/lib/rng";

export type GeneratedItemEntry = {
  name: string;
  description: string;
  category: string; // equip / consumable / material
  rarity: string;
  slot: string | null;
  weaponClass: string | null;
  jobAffinity: string; // JSON array
  basePrice: number;
  atkBonus: number;
  defBonus: number;
  matBonus: number;
  mdfBonus: number;
  hpBonus: number;
  mpBonus: number;
};

// Exposed to UI so the inventory page can show "あなたの職業に合う武器一覧".
export const WEAPON_CLASS_LABEL_JP: Record<string, string> = {
  sword: "剣", greatsword: "大剣", spear: "槍", dagger: "短剣",
  bow: "弓", staff: "杖", rod: "ロッド", drum: "太鼓",
  flute: "笛", hammer: "槌", flail: "フレイル", claws: "爪", knuckle: "拳",
};

export const ARCHETYPE_LABEL_JP: Record<string, string> = {
  warrior: "戦士系", mage: "魔導系", rogue: "盗賊系", cleric: "神官系",
  support: "支援系", craft: "職人系", heretic: "異端系", rare: "稀少系", cursed: "呪い系",
};

export const WEAPON_CLASSES: Array<{ key: string; affinity: string[]; nameRoots: string[]; baseAtk: number; baseMat: number; baseDef: number }> = [
  { key: "sword",      affinity: ["warrior", "cleric"],   nameRoots: ["剣", "刃", "細剣", "長剣", "騎士剣", "片手剣", "礼拝剣", "古剣"], baseAtk: 8, baseMat: 0, baseDef: 0 },
  { key: "greatsword", affinity: ["warrior"],             nameRoots: ["大剣", "両手剣", "重剣", "巨剣", "断頭剣"], baseAtk: 12, baseMat: 0, baseDef: -1 },
  { key: "spear",      affinity: ["warrior"],             nameRoots: ["槍", "鉾", "薙刀", "穂槍", "騎兵槍"], baseAtk: 9, baseMat: 1, baseDef: 0 },
  { key: "dagger",     affinity: ["rogue", "mage"],       nameRoots: ["短刀", "短剣", "牙短剣", "影刃", "懐剣", "短刺剣"], baseAtk: 6, baseMat: 1, baseDef: 0 },
  { key: "bow",        affinity: ["rogue", "support"],    nameRoots: ["弓", "短弓", "長弓", "猟弓", "森人の弓", "強弓"], baseAtk: 7, baseMat: 1, baseDef: 0 },
  { key: "staff",      affinity: ["mage", "cleric"],      nameRoots: ["杖", "錫杖", "賢者の杖", "神官の杖", "古杖", "祈杖"], baseAtk: 1, baseMat: 8, baseDef: 0 },
  { key: "rod",        affinity: ["mage"],                nameRoots: ["ロッド", "細杖", "蒼炎ロッド", "月詠みロッド", "詠唱筆"], baseAtk: 1, baseMat: 9, baseDef: 0 },
  { key: "drum",       affinity: ["support"],             nameRoots: ["太鼓", "戦太鼓", "旅太鼓", "祭太鼓"], baseAtk: 2, baseMat: 4, baseDef: 0 },
  { key: "flute",      affinity: ["support"],             nameRoots: ["笛", "横笛", "縦笛", "風笛", "詩人の笛"], baseAtk: 0, baseMat: 5, baseDef: 1 },
  { key: "hammer",     affinity: ["cleric"],              nameRoots: ["槌", "鎚", "聖印の槌", "戦槌", "石槌"], baseAtk: 7, baseMat: 1, baseDef: 1 },
  { key: "flail",      affinity: ["cleric"],              nameRoots: ["フレイル", "鎖鎚", "鎖付き槌"], baseAtk: 6, baseMat: 1, baseDef: 1 },
  { key: "claws",      affinity: ["rogue", "warrior"],    nameRoots: ["爪", "鉤爪", "獣爪", "鋼爪"], baseAtk: 7, baseMat: 0, baseDef: 0 },
  { key: "knuckle",    affinity: ["warrior", "support"],  nameRoots: ["拳套", "メリケン", "鋼拳", "拳", "鎚拳"], baseAtk: 6, baseMat: 0, baseDef: 1 },
];

const WEAPON_PREFIXES = [
  "古びた", "鉄の", "鋼の", "蒼の", "黒鉄の", "雪原の", "湖底の", "霜の", "陽光の", "月光の",
  "竜骨の", "獣牙の", "祠の", "塔陰の", "祈りの", "練磨の", "騎士の", "練習用の", "森人の",
  "黄金の", "銀の", "翡翠の", "硝子の", "黎明の", "黄昏の", "禁書の", "灰の", "霧の", "鏡の",
];
const WEAPON_SUFFIXES = [
  "", "", "の試作", "の継承", "・銘無し", "・三代目", "・古老", "の手記", "の刻印",
];

const ARMOR_BY_SLOT: Record<string, { roots: string[]; baseDef: number }> = {
  head:      { roots: ["帽子", "兜", "フード", "ベール", "鎖頭巾", "羽根飾り兜", "鋼兜"], baseDef: 2 },
  body:      { roots: ["服", "鎧", "胴鎧", "鎖帷子", "板金鎧", "革鎧", "聖衣", "詠唱衣", "祝祭衣"], baseDef: 4 },
  arm:       { roots: ["手袋", "腕当て", "籠手", "鎖腕当て", "革腕当て"], baseDef: 1 },
  leg:       { roots: ["ズボン", "脚甲", "脛当て", "鎖脛", "革脛"], baseDef: 2 },
  foot:      { roots: ["靴", "ブーツ", "サバトン", "革靴", "鋼靴"], baseDef: 1 },
  accessory: { roots: ["指輪", "腕輪", "首飾り", "ペンダント", "イヤリング"], baseDef: 0 },
  charm:     { roots: ["お守り", "羽飾り", "紋章片", "古銭", "祝詞片"], baseDef: 0 },
};
const ARMOR_PREFIXES = [
  "布の", "革の", "鋼の", "鎖", "鉄の", "蒼の", "翡翠の", "聖印の", "古き", "月詠みの",
  "黄金の", "霜の", "湖畔の", "黒の", "白翼の", "陽光の", "祝祭の", "銀細工の", "塩の",
];
const ARMOR_SUFFIXES = [
  "", "", "・修復済", "・古老の", "・無銘", "の刻印",
];

// Generate ~600 weapons (across 13 classes × ~45 each) + ~250 armor pieces
// + 10 consumables. Total ~860 base items.
export function generateMassItems(weaponPerClass: number = 45, armorPerSlot: number = 32): GeneratedItemEntry[] {
  const out: GeneratedItemEntry[] = [];
  const seenNames = new Set<string>();

  for (const cls of WEAPON_CLASSES) {
    let made = 0;
    let attempt = 0;
    while (made < weaponPerClass && attempt < weaponPerClass * 8) {
      attempt++;
      const rng = makeRng(`weapon-${cls.key}-${attempt}`);
      const root = pick(cls.nameRoots, rng);
      const prefix = pick(WEAPON_PREFIXES, rng);
      const suffix = pick(WEAPON_SUFFIXES, rng);
      const name = `${prefix}${root}${suffix}`.trim();
      if (seenNames.has(name)) continue;
      seenNames.add(name);
      // Stat curve: scale base stats with a small noise.
      const lvlBoost = intBetween(rng, 0, 6);
      const atk = Math.max(0, cls.baseAtk + lvlBoost + intBetween(rng, -1, 2));
      const mat = Math.max(0, cls.baseMat + Math.floor(lvlBoost * 0.7) + intBetween(rng, -1, 2));
      const def = cls.baseDef + intBetween(rng, -1, 1);
      const rarity = lvlBoost >= 5 ? "rare" : "common";
      const basePrice = 50 + lvlBoost * 80 + intBetween(rng, 0, 60);
      out.push({
        name, description: `${cls.key} 系の武器。`,
        category: "equip", rarity,
        slot: "weapon", weaponClass: cls.key,
        jobAffinity: JSON.stringify(cls.affinity),
        basePrice,
        atkBonus: atk, defBonus: def, matBonus: mat,
        mdfBonus: 0, hpBonus: 0, mpBonus: 0,
      });
      made++;
    }
  }

  for (const [slot, cfg] of Object.entries(ARMOR_BY_SLOT)) {
    let made = 0;
    let attempt = 0;
    while (made < armorPerSlot && attempt < armorPerSlot * 8) {
      attempt++;
      const rng = makeRng(`armor-${slot}-${attempt}`);
      const root = pick(cfg.roots, rng);
      const prefix = pick(ARMOR_PREFIXES, rng);
      const suffix = pick(ARMOR_SUFFIXES, rng);
      const name = `${prefix}${root}${suffix}`.trim();
      if (seenNames.has(name)) continue;
      seenNames.add(name);
      const lvlBoost = intBetween(rng, 0, 5);
      const def = cfg.baseDef + lvlBoost + intBetween(rng, -1, 1);
      const mdf = Math.floor(def * 0.4) + intBetween(rng, -1, 2);
      const hp = slot === "charm" ? intBetween(rng, 4, 12) : intBetween(rng, 0, 4);
      const mp = slot === "accessory" || slot === "charm" ? intBetween(rng, 0, 5) : 0;
      const rarity = lvlBoost >= 4 ? "rare" : "common";
      const basePrice = 30 + lvlBoost * 60 + intBetween(rng, 0, 40);
      out.push({
        name, description: `${slot} 用の防具。`,
        category: "equip", rarity,
        slot, weaponClass: null,
        jobAffinity: "[]",
        basePrice,
        atkBonus: 0, defBonus: Math.max(0, def), matBonus: 0,
        mdfBonus: Math.max(0, mdf), hpBonus: hp, mpBonus: mp,
      });
      made++;
    }
  }

  // Consumables / materials. Small but useful for shop / quest collect.
  const CONS = [
    { name: "薬草", description: "HPを少し回復する。", basePrice: 20 },
    { name: "上薬草", description: "HPをそこそこ回復する。", basePrice: 60 },
    { name: "癒しの霊薬", description: "HPを大きく回復する。", basePrice: 180 },
    { name: "魔力の小瓶", description: "MPを少し回復する。", basePrice: 30 },
    { name: "魔力の霊薬", description: "MPを大きく回復する。", basePrice: 200 },
    { name: "携帯食", description: "戦闘外で少し回復する。", basePrice: 10 },
    { name: "保存食", description: "腹持ちが良い。", basePrice: 25 },
    { name: "解毒薬", description: "毒状態を解除する。", basePrice: 60 },
    { name: "覚醒剤", description: "スタン状態を解除する。", basePrice: 80 },
    { name: "氷雪結晶", description: "火傷を冷やすのに使う。", basePrice: 70 },
  ];
  for (const c of CONS) {
    if (seenNames.has(c.name)) continue;
    seenNames.add(c.name);
    out.push({
      name: c.name, description: c.description, category: "consumable", rarity: "common",
      slot: null, weaponClass: null, jobAffinity: "[]", basePrice: c.basePrice,
      atkBonus: 0, defBonus: 0, matBonus: 0, mdfBonus: 0, hpBonus: 0, mpBonus: 0,
    });
  }
  return out;
}
