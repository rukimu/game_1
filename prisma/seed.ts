import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateAllTowns, generateNpcsForTown } from "../src/lib/townGen";
import { generateMassJobs } from "../src/lib/jobGen";
import { generateMassItems } from "../src/lib/itemGen";
import { CURATED_JOBS } from "./curatedJobs";
import { CURATED_NPCS, CURATED_TOWNS } from "./curatedNpcs";
import { ONBOARDING_CHAIN, ONBOARDING_GENERATED_BY } from "../src/lib/onboarding";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin1234";

  // Admin user
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        isAdmin: true,
        characterSlots: 5,
      },
    });
    console.log(`Created admin user: ${adminEmail} / ${adminPassword}`);
  } else if (!existing.isAdmin) {
    await prisma.user.update({ where: { id: existing.id }, data: { isAdmin: true } });
  }

  // Towns — generated in bulk via the procedural townGen so the world map
  // is dense (14 regions × 8 towns = 112 towns by default). The first 3
  // legacy names are preserved as aliases by upserting before generation.
  const legacyTowns = [
    // Cycle 40 Phase 1: 5 主要都市の段階開放。アルダ Lv1 / ミルレ Lv5 /
    // ヴェルナ Lv10 / ベルクラート Lv25 / ヴェスペル Lv40。procedural
    // 110 街は default 999 で実質封印。
    { name: "始まりの街アルダ", region: "中央高原", danger: 1, economy: 60, security: 70, innFee: 15, description: "旅人が最初に立ち寄る、平穏な街。", rumorTrend: "neutral", unlockLevel: 1 },
    { name: "湖畔の街ミルレ", region: "湖畔地方", danger: 2, economy: 55, security: 60, innFee: 25, description: "湖の畔に栄えた商人の街。", rumorTrend: "neutral", unlockLevel: 5 },
    { name: "霧の街ヴェルナ", region: "霧の北縁", danger: 3, economy: 40, security: 45, innFee: 30, description: "深い霧に覆われた、噂の絶えぬ街。", rumorTrend: "ominous", unlockLevel: 10 },
  ];
  for (const t of legacyTowns) {
    // Cycle 40 Phase 1: update に unlockLevel を含めて既存 row も上書き。
    // 旧 seed (update: {}) では新規 default 999 のまま legacy 街が封印
    // されてしまう問題を解消。
    await prisma.town.upsert({
      where: { name: t.name },
      update: { unlockLevel: t.unlockLevel },
      create: t,
    });
  }
  // Cycle 33: curated towns added on top of legacy. Provides the home
  // address for the new C33 hand-curated NPCs (鐘塔の都, 古王国の都).
  for (const t of CURATED_TOWNS) {
    await prisma.town.upsert({
      where: { name: t.name },
      update: { unlockLevel: t.unlockLevel },
      create: t,
    });
  }
  const generatedTowns = generateAllTowns(8); // 14 regions * 8 = 112
  for (const t of generatedTowns) {
    const exists = await prisma.town.findUnique({ where: { name: t.name } });
    if (!exists) {
      await prisma.town.create({ data: t });
    }
  }
  console.log(`  towns: ${legacyTowns.length} legacy + ${generatedTowns.length} generated = ${legacyTowns.length + generatedTowns.length}`);

  // NPCs — procedural per town. Each town gets ~5 NPCs with sampled-without-
  // replacement names + roles, plus theme-appropriate fallback dialogue.
  // Live town page regenerates the actual line per visit (Cycle 17 memory).
  const allTowns = await prisma.town.findMany({ select: { id: true, name: true, region: true } });
  const themeByRegion: Record<string, string> = {
    "中央高原": "central", "湖畔地方": "lakeside", "霧の北縁": "mist", "黄金の南海岸": "gold",
    "黒森地方": "darkforest", "霜の高山": "frost", "塩の砂漠": "desert", "古王国の遺跡群": "ruin",
    "東風の谷": "valley", "影海岸": "shadow", "聖印の高原": "holy", "灰落としの平原": "ash",
    "鏡映の湖沼": "mirror", "鐘塔の麓": "bell",
    "中央": "central", "西": "lakeside", "北": "mist",
  };
  let npcTotal = 0;
  for (const town of allTowns) {
    const npcs = generateNpcsForTown(town.name, themeByRegion[town.region] ?? "central", 5);
    for (const n of npcs) {
      const exists = await prisma.npc.findFirst({ where: { townId: town.id, name: n.name } });
      if (!exists) {
        await prisma.npc.create({ data: { townId: town.id, name: n.name, role: n.role, dialogue: n.dialogue } });
        npcTotal++;
      }
    }
  }
  console.log(`  npcs: +${npcTotal} generated (5 per town target)`);

  // Cycle 33: hand-curated NPCs (酒場の主人カイ etc.) on top of the
  // procedural NPC pool. Resolved by townName → townId. Idempotent —
  // existing rows get their curated metadata refreshed.
  let curatedNpcsCreated = 0;
  let curatedNpcsUpdated = 0;
  for (const cn of CURATED_NPCS) {
    const town = await prisma.town.findUnique({ where: { name: cn.townName } });
    if (!town) {
      console.warn(`  curated npc "${cn.name}" references missing town "${cn.townName}".`);
      continue;
    }
    const existing = await prisma.npc.findFirst({
      where: { townId: town.id, name: cn.name },
    });
    const fields = {
      role: cn.role,
      dialogue: cn.dialogue,
      curated: true,
      bio: cn.bio,
      relationsJson: cn.relations ? JSON.stringify(cn.relations) : null,
    };
    if (existing) {
      await prisma.npc.update({ where: { id: existing.id }, data: fields });
      curatedNpcsUpdated++;
    } else {
      await prisma.npc.create({
        data: { townId: town.id, name: cn.name, ...fields },
      });
      curatedNpcsCreated++;
    }
  }
  console.log(`  curated npcs: ${curatedNpcsCreated} created, ${curatedNpcsUpdated} updated (catalog ${CURATED_NPCS.length}).`);

  // Initial 5 beginner jobs (anchor entries the quiz maps onto). Kept as
  // upserts so they always exist regardless of generator output.
  const initialJobs = [
    { name: "見習い戦士", category: "warrior", rank: "beginner", description: "前線で剣を振るう道。", baseStats: JSON.stringify({ hp: 40, mp: 8, atk: 12, def: 10, mat: 4, mdf: 6, spd: 6 }) },
    { name: "見習い魔導士", category: "mage", rank: "beginner", description: "古き書と詠唱に身を捧げる道。", baseStats: JSON.stringify({ hp: 25, mp: 30, atk: 5, def: 4, mat: 14, mdf: 10, spd: 6 }) },
    { name: "見習い盗賊", category: "rogue", rank: "beginner", description: "影と速さを武器にする道。", baseStats: JSON.stringify({ hp: 28, mp: 12, atk: 11, def: 6, mat: 6, mdf: 6, spd: 12 }) },
    { name: "見習い神官", category: "cleric", rank: "beginner", description: "祈りで仲間を支える道。", baseStats: JSON.stringify({ hp: 32, mp: 24, atk: 7, def: 7, mat: 11, mdf: 12, spd: 6 }) },
    { name: "見習い吟遊詩人", category: "support", rank: "beginner", description: "歌と機知で仲間を支える道。", baseStats: JSON.stringify({ hp: 28, mp: 22, atk: 6, def: 6, mat: 9, mdf: 10, spd: 9 }) },
  ];
  for (const j of initialJobs) {
    await prisma.job.upsert({ where: { name: j.name }, update: {}, create: j });
  }
  // Starter skills for the 5 anchor jobs.
  const starters = [
    { jobName: "見習い戦士", skill: { name: "斬撃", description: "敵単体に攻撃を加える。", type: "attack", element: "none", power: 14, cost: 2, cooldown: 0, targetType: "enemy" } },
    { jobName: "見習い魔導士", skill: { name: "蒼焔斬", description: "火属性の魔法攻撃。", type: "attack", element: "fire", power: 18, cost: 5, cooldown: 0, targetType: "enemy" } },
    { jobName: "見習い盗賊", skill: { name: "影刃", description: "素早い一撃。", type: "attack", element: "dark", power: 16, cost: 3, cooldown: 0, targetType: "enemy" } },
    { jobName: "見習い神官", skill: { name: "癒しの祈り", description: "味方単体のHPを回復する。", type: "heal", element: null, power: 20, cost: 4, cooldown: 0, targetType: "ally" } },
    { jobName: "見習い吟遊詩人", skill: { name: "鼓舞の歌", description: "自身の攻撃力を一時的に高める。", type: "buff", element: null, power: 0, cost: 3, cooldown: 0, targetType: "self" } },
  ];
  for (const s of starters) {
    const job = await prisma.job.findUnique({ where: { name: s.jobName } });
    if (!job) continue;
    const exists = await prisma.skill.findFirst({ where: { jobId: job.id, name: s.skill.name } });
    if (!exists) await prisma.skill.create({ data: { jobId: job.id, ...s.skill } });
  }

  // Cycle 31: hand-curated personality jobs (眼鏡戦士, 猫好き魔導師 etc.)
  // — distinct from the procedural mass pool. Phase 1 ships 12 entries
  // here; Phase 2 will bulk-generate ~90 more via the AI pipeline in
  // docs/team/CURATED_JOB_BULK.md.
  //
  // Housekeeping: drop curated rows whose name is no longer in the
  // catalog (renames during early C31 dev — e.g. "眼鏡戦士・パセリ"
  // → "眼鏡戦士"). Skills are removed first because Skill.jobId is
  // SetNull on delete and we don't want orphan rows clinging on.
  const validCuratedNames = new Set(CURATED_JOBS.map((cj) => cj.name));
  const staleCurated = await prisma.job.findMany({
    where: { curated: true, NOT: { name: { in: Array.from(validCuratedNames) } } },
    select: { id: true, name: true },
  });
  for (const j of staleCurated) {
    await prisma.skill.deleteMany({ where: { jobId: j.id } });
    await prisma.job.delete({ where: { id: j.id } });
  }
  if (staleCurated.length > 0) {
    console.log(`Curated jobs: cleaned ${staleCurated.length} stale entries (${staleCurated.map((j) => j.name).join(", ")}).`);
  }

  let curatedCreated = 0;
  let curatedSkillsCreated = 0;
  for (const cj of CURATED_JOBS) {
    const baseStatsJson = JSON.stringify(cj.baseStats);
    const job = await prisma.job.upsert({
      where: { name: cj.name },
      update: {
        curated: true,
        quirk: cj.quirk,
        signatureOutfit: cj.signatureOutfit,
        signatureBio: cj.signatureBio,
        category: cj.category,
        rank: cj.rank,
        description: cj.description,
        baseStats: baseStatsJson,
      },
      create: {
        name: cj.name,
        category: cj.category,
        rank: cj.rank,
        description: cj.description,
        curated: true,
        quirk: cj.quirk,
        signatureOutfit: cj.signatureOutfit,
        signatureBio: cj.signatureBio,
        baseStats: baseStatsJson,
      },
    });
    curatedCreated++;
    for (const s of cj.uniqueSkills) {
      const exists = await prisma.skill.findFirst({
        where: { jobId: job.id, name: s.name },
      });
      if (!exists) {
        await prisma.skill.create({
          data: {
            jobId: job.id,
            name: s.name,
            description: s.description,
            type: s.type,
            element: s.element,
            power: s.power,
            cost: s.cost,
            cooldown: s.cooldown ?? 0,
            targetType: s.targetType ?? "enemy",
          },
        });
        curatedSkillsCreated++;
      }
    }
  }
  console.log(`Curated jobs: ${curatedCreated} upserted, ${curatedSkillsCreated} unique skills created.`);

  // Mass-generate the rest of the job universe. ~200 per category × 9 cats
  // (capped by combinatorial space for rare/cursed/heretic) → ~1500 jobs +
  // 3-4 procedurally-named skills each = ~5000 skills.
  const massJobs = generateMassJobs(200);
  let jobsCreated = 0;
  let skillsCreated = 0;
  for (const j of massJobs) {
    const existing = await prisma.job.findUnique({ where: { name: j.name } });
    if (existing) continue;
    const job = await prisma.job.create({
      data: {
        name: j.name,
        category: j.category,
        rank: j.rank,
        description: j.description,
        isCursed: j.isCursed,
        baseStats: JSON.stringify(j.baseStats),
      },
    });
    jobsCreated++;
    for (const s of j.skills) {
      try {
        await prisma.skill.create({
          data: { jobId: job.id, ...s, element: s.element ?? null },
        });
        skillsCreated++;
      } catch { /* ignore name uniqueness rare-collision */ }
    }
  }
  console.log(`  jobs: 5 anchor + ${jobsCreated} generated = ${5 + jobsCreated} (skills: ${skillsCreated} attached)`);

  // ----- Items: mass-generated weapons + armor + consumables ----------------
  // generateMassItems() produces ~600 weapons (13 classes × ~45) + ~225 armor
  // (7 slots × ~32) + 10 consumables. Combined with per-instance affixes,
  // the actual unique-instance space is in the hundreds of thousands.
  const massItems = generateMassItems(45, 32);
  let itemsCreated = 0;
  for (const it of massItems) {
    const existing = await prisma.item.findFirst({ where: { name: it.name } });
    if (!existing) {
      await prisma.item.create({ data: it });
      itemsCreated++;
    }
  }
  console.log(`  items: +${itemsCreated} generated`);

  // ----- Legacy hand-curated items (kept so quest references / seed cookies
  // that point at "古びた剣" etc. still resolve). The generator may also
  // produce items with these names; the upsert pattern reconciles.
  const items: Array<{
    name: string;
    description: string;
    category: string;
    rarity?: string;
    slot?: string;
    weaponClass?: string;
    jobAffinity?: string;
    basePrice?: number;
    atkBonus?: number;
    defBonus?: number;
    matBonus?: number;
    mdfBonus?: number;
    hpBonus?: number;
    mpBonus?: number;
  }> = [
    // --- Consumables / starters ---
    { name: "薬草", description: "HPを少し回復する。", category: "consumable", rarity: "common", basePrice: 20 },
    { name: "癒しの霊薬", description: "HPを大きく回復する。", category: "consumable", rarity: "rare", basePrice: 80 },
    { name: "魔力の小瓶", description: "MPを少し回復する。", category: "consumable", rarity: "common", basePrice: 30 },
    { name: "携帯食", description: "戦闘外で少し回復する。", category: "consumable", rarity: "common", basePrice: 10 },

    // --- Swords (warrior + cleric secondary) ---
    { name: "古びた剣", description: "新人の最初の相棒。", category: "equip", slot: "weapon", weaponClass: "sword", jobAffinity: '["warrior","cleric"]', rarity: "common", atkBonus: 3, basePrice: 30 },
    { name: "鉄の剣", description: "鈍く重い両刃。", category: "equip", slot: "weapon", weaponClass: "sword", jobAffinity: '["warrior","cleric"]', rarity: "common", atkBonus: 6, basePrice: 120 },
    { name: "騎士の剣", description: "誓いと共に振るう刃。", category: "equip", slot: "weapon", weaponClass: "sword", jobAffinity: '["warrior","cleric"]', rarity: "rare", atkBonus: 9, defBonus: 2, basePrice: 380 },
    { name: "長剣レイラム", description: "湖畔で鍛えられた繊細な長剣。", category: "equip", slot: "weapon", weaponClass: "sword", jobAffinity: '["warrior"]', rarity: "rare", atkBonus: 12, basePrice: 620 },

    // --- Greatswords (warrior only) ---
    { name: "両手剣", description: "重い一撃を得意とする。", category: "equip", slot: "weapon", weaponClass: "greatsword", jobAffinity: '["warrior"]', rarity: "common", atkBonus: 9, defBonus: -1, basePrice: 200 },
    { name: "竜骨の大剣", description: "竜の骨を芯に鋳た大剣。", category: "equip", slot: "weapon", weaponClass: "greatsword", jobAffinity: '["warrior"]', rarity: "rare", atkBonus: 14, hpBonus: 6, basePrice: 780 },

    // --- Spears (warrior) ---
    { name: "鉄の槍", description: "間合いと突きの武器。", category: "equip", slot: "weapon", weaponClass: "spear", jobAffinity: '["warrior"]', rarity: "common", atkBonus: 7, basePrice: 140 },
    { name: "蒼穹の槍", description: "雲を裂くと言われる。", category: "equip", slot: "weapon", weaponClass: "spear", jobAffinity: '["warrior"]', rarity: "rare", atkBonus: 11, matBonus: 2, basePrice: 540 },

    // --- Daggers (rogue main, mage secondary) ---
    { name: "錆びた短刀", description: "練習用の短刀。", category: "equip", slot: "weapon", weaponClass: "dagger", jobAffinity: '["rogue","mage"]', rarity: "common", atkBonus: 4, basePrice: 40 },
    { name: "影刃", description: "夜陰で切る、暗殺者の常道。", category: "equip", slot: "weapon", weaponClass: "dagger", jobAffinity: '["rogue"]', rarity: "rare", atkBonus: 9, basePrice: 360 },
    { name: "毒牙", description: "刃に微かな苦味が染みている。", category: "equip", slot: "weapon", weaponClass: "dagger", jobAffinity: '["rogue"]', rarity: "rare", atkBonus: 8, matBonus: 3, basePrice: 420 },

    // --- Bows (rogue + support) ---
    { name: "森人の弓", description: "風を読みやすい弓。", category: "equip", slot: "weapon", weaponClass: "bow", jobAffinity: '["rogue","support"]', rarity: "common", atkBonus: 5, basePrice: 80 },
    { name: "月光弓", description: "月夜にだけ良く飛ぶという。", category: "equip", slot: "weapon", weaponClass: "bow", jobAffinity: '["rogue","support"]', rarity: "rare", atkBonus: 10, matBonus: 2, basePrice: 480 },

    // --- Staves (mage + cleric) ---
    { name: "練習用の杖", description: "詠唱補助の最初の一本。", category: "equip", slot: "weapon", weaponClass: "staff", jobAffinity: '["mage","cleric"]', rarity: "common", matBonus: 4, mpBonus: 4, basePrice: 50 },
    { name: "蒼炎のロッド", description: "火元素を孕む詠唱具。", category: "equip", slot: "weapon", weaponClass: "rod", jobAffinity: '["mage"]', rarity: "rare", matBonus: 9, mpBonus: 6, basePrice: 460 },
    { name: "神官の杖", description: "祈りを増幅する。", category: "equip", slot: "weapon", weaponClass: "staff", jobAffinity: '["cleric"]', rarity: "rare", matBonus: 7, mdfBonus: 4, mpBonus: 6, basePrice: 420 },
    { name: "古き賢者の杖", description: "持つ者の声を遠くまで届かせる。", category: "equip", slot: "weapon", weaponClass: "staff", jobAffinity: '["mage","cleric"]', rarity: "rare", matBonus: 11, mpBonus: 10, basePrice: 720 },

    // --- Hammers / flails (cleric) ---
    { name: "聖印の槌", description: "重く、しかし祈りで軽くなる。", category: "equip", slot: "weapon", weaponClass: "hammer", jobAffinity: '["cleric"]', rarity: "rare", atkBonus: 7, mdfBonus: 4, basePrice: 380 },
    { name: "鎖付きフレイル", description: "祈りと打撃を兼ねる武器。", category: "equip", slot: "weapon", weaponClass: "flail", jobAffinity: '["cleric"]', rarity: "common", atkBonus: 6, mdfBonus: 2, basePrice: 180 },

    // --- Support instruments ---
    { name: "旅の太鼓", description: "戦場でも仲間を鼓舞する。", category: "equip", slot: "weapon", weaponClass: "drum", jobAffinity: '["support"]', rarity: "common", atkBonus: 2, matBonus: 4, mpBonus: 4, basePrice: 110 },
    { name: "詩人の笛", description: "音色で士気を保つ。", category: "equip", slot: "weapon", weaponClass: "flute", jobAffinity: '["support"]', rarity: "common", matBonus: 5, mdfBonus: 3, mpBonus: 6, basePrice: 140 },
    { name: "月詠みの竪琴", description: "夜にだけ鳴る弦が一本ある。", category: "equip", slot: "weapon", weaponClass: "drum", jobAffinity: '["support"]', rarity: "rare", matBonus: 8, mdfBonus: 4, mpBonus: 10, basePrice: 580 },

    // --- Heretic / cursed ---
    { name: "禁書の短杖", description: "誰も読めない頁を捲ると指が痛む。", category: "equip", slot: "weapon", weaponClass: "rod", jobAffinity: '["mage","heretic"]', rarity: "rare", matBonus: 12, mdfBonus: -2, mpBonus: 8, basePrice: 600 },

    // --- Armor: head ---
    { name: "布の帽子", description: "風よけにはなる。", category: "equip", slot: "head", rarity: "common", defBonus: 1, basePrice: 30 },
    { name: "鉄兜", description: "頭部を守る基本装備。", category: "equip", slot: "head", rarity: "common", defBonus: 3, basePrice: 110 },
    { name: "革のフード", description: "影に紛れやすい。", category: "equip", slot: "head", rarity: "common", defBonus: 2, basePrice: 70 },

    // --- Armor: body ---
    { name: "布の服", description: "最低限の防具。", category: "equip", slot: "body", rarity: "common", defBonus: 2, basePrice: 20 },
    { name: "革の鎧", description: "軽くて動きやすい。", category: "equip", slot: "body", rarity: "common", defBonus: 5, basePrice: 160 },
    { name: "鎖帷子", description: "斬撃に強い。", category: "equip", slot: "body", rarity: "common", defBonus: 8, basePrice: 380 },
    { name: "蒼の長衣", description: "詠唱者向けの装い。", category: "equip", slot: "body", rarity: "rare", defBonus: 4, mdfBonus: 5, mpBonus: 6, basePrice: 460 },

    // --- Armor: arm/leg/foot ---
    { name: "革の腕当て", description: "腕を擦り傷から守る。", category: "equip", slot: "arm", rarity: "common", defBonus: 1, basePrice: 50 },
    { name: "鋼の籠手", description: "重いが頼りになる。", category: "equip", slot: "arm", rarity: "common", defBonus: 3, basePrice: 180 },
    { name: "革のズボン", description: "丈夫で動きやすい。", category: "equip", slot: "leg", rarity: "common", defBonus: 2, basePrice: 80 },
    { name: "鎖のすね当て", description: "脚を守る。", category: "equip", slot: "leg", rarity: "common", defBonus: 4, basePrice: 220 },
    { name: "革のブーツ", description: "長旅向きの靴。", category: "equip", slot: "foot", rarity: "common", defBonus: 1, basePrice: 60 },
    { name: "鋼のサバトン", description: "重装兵の足元。", category: "equip", slot: "foot", rarity: "common", defBonus: 3, basePrice: 200 },

    // --- Accessories / charms ---
    { name: "銅の指輪", description: "気休めにはなる。", category: "equip", slot: "accessory", rarity: "common", matBonus: 1, basePrice: 60 },
    { name: "翡翠のペンダント", description: "首元に冷たさが伝わる。", category: "equip", slot: "accessory", rarity: "rare", matBonus: 4, mpBonus: 6, basePrice: 380 },
    { name: "治癒のお守り", description: "疲労を少しだけ軽くする。", category: "equip", slot: "charm", rarity: "common", hpBonus: 6, basePrice: 90 },
    { name: "風読みの羽", description: "速度の感覚が鋭くなる。", category: "equip", slot: "charm", rarity: "rare", atkBonus: 1, mdfBonus: 2, basePrice: 220 },
    { name: "古き紋章の欠片", description: "誰のものかは分からない。", category: "equip", slot: "charm", rarity: "rare", matBonus: 3, mdfBonus: 3, basePrice: 320 },
  ];
  for (const it of items) {
    const exists = await prisma.item.findFirst({ where: { name: it.name } });
    if (!exists) {
      await prisma.item.create({ data: { ...it, jobAffinity: it.jobAffinity ?? "[]" } });
    } else {
      // Keep existing items in sync with the catalog. Helps when re-running
      // the seed after adding new fields like weaponClass / jobAffinity.
      await prisma.item.update({
        where: { id: exists.id },
        data: {
          description: it.description,
          category: it.category,
          slot: it.slot ?? null,
          weaponClass: it.weaponClass ?? null,
          jobAffinity: it.jobAffinity ?? "[]",
          rarity: it.rarity ?? "common",
          basePrice: it.basePrice ?? 10,
          atkBonus: it.atkBonus ?? 0,
          defBonus: it.defBonus ?? 0,
          matBonus: it.matBonus ?? 0,
          mdfBonus: it.mdfBonus ?? 0,
          hpBonus: it.hpBonus ?? 0,
          mpBonus: it.mpBonus ?? 0,
        },
      });
    }
  }

  // Initial season w/ central mystery
  const SEASON1_CLUES = [
    { idx: 0, text: "灯の年と呼ばれるこのシーズンの始まり、北の空に塔の影が一瞬だけ蘇ったという。", hint: "塔は本当に消えたのか？" },
    { idx: 1, text: "古い鐘は、もう半世紀も鳴っていない。だが今、子守歌のような音を聞いたという者がいる。", hint: "鐘はいくつあるのか。" },
    { idx: 2, text: "封印者の家系は途絶えたはずだ。しかし今年、その紋章が再び現れたらしい。", hint: "誰がその紋章を見たのか。" },
    { idx: 3, text: "禁書の写本が、霧の街ヴェルナで盗まれた。盗まれたのは1冊だけ、しかし誰も読んだことがない頁だった。", hint: "誰も読めない頁とは何か。" },
    { idx: 4, text: "湖畔の街ミルレの占い師は、毎日同じ夢を見ると言う。塔と、鐘と、消えた職の名前。", hint: "消えた職とは。" },
    { idx: 5, text: "始まりの街アルダの井戸の奥から、規則正しい鼓動のような響きが聞こえる。", hint: "井戸の底に何があるのか。" },
    { idx: 6, text: "7つの鐘が同じ瞬間に鳴る時、灯の年の塔は再び世界に降りる──と古い詩は告げる。", hint: "全ての手がかりを集めたとき、答えに近づく。", isFinal: true },
  ];

  let currentSeason = await prisma.season.findFirst({ where: { isCurrent: true } });
  if (!currentSeason) {
    currentSeason = await prisma.season.create({
      data: {
        name: "Season 1: 灯の年",
        isCurrent: true,
        rules: JSON.stringify({ rareJobBoost: 0.05, rumorTrend: "neutral", weakElement: "wind" }),
        mysteryTitle: "灯の年の塔",
        mysteryHint: "古き鐘の音と、薄明に消えた塔について、人々は囁いている。世界中に散った手がかりを集めた者だけが、塔の正体に辿り着くという。",
      },
    });
  } else if (!currentSeason.mysteryTitle) {
    currentSeason = await prisma.season.update({
      where: { id: currentSeason.id },
      data: {
        mysteryTitle: "灯の年の塔",
        mysteryHint: "古き鐘の音と、薄明に消えた塔について、人々は囁いている。世界中に散った手がかりを集めた者だけが、塔の正体に辿り着くという。",
      },
    });
  }
  // ensure clues exist
  const existingClueCount = await prisma.seasonClue.count({ where: { seasonId: currentSeason.id } });
  if (existingClueCount < SEASON1_CLUES.length) {
    for (const c of SEASON1_CLUES) {
      const exists = await prisma.seasonClue.findFirst({ where: { seasonId: currentSeason.id, orderIdx: c.idx } });
      if (!exists) {
        await prisma.seasonClue.create({
          data: { seasonId: currentSeason.id, orderIdx: c.idx, text: c.text, hint: c.hint, isFinal: c.isFinal ?? false },
        });
      }
    }
  }

  // Castles — one per region so siege participation has territorial meaning.
  const castles = [
    { name: "アルダ城", region: "中央高原", description: "中央地方を見下ろす由緒ある城。" },
    { name: "湖鏡城", region: "湖畔地方", description: "湖面に映る石壁が独特の景観を持つ。" },
    { name: "霧塔城", region: "霧の北縁", description: "塔の上半分が常に霧に隠れている。" },
    { name: "黄金城", region: "黄金の南海岸", description: "海風と陽光に磨かれた壁面が陽に光る。" },
    { name: "黒森砦", region: "黒森地方", description: "森に呑まれかけた半廃墟の砦。" },
    { name: "霜帝城", region: "霜の高山", description: "氷柱が天然の城壁となっている。" },
    { name: "塩塔", region: "塩の砂漠", description: "塩の柱で支えられた奇怪な塔。" },
    { name: "古王の祠", region: "古王国の遺跡群", description: "城というより巨大な祠跡。" },
    { name: "東風城", region: "東風の谷", description: "稲穂の海に浮かぶように見える石城。" },
    { name: "影潮城", region: "影海岸", description: "黒潮を背に建つ侵入を拒む要塞。" },
    { name: "聖印大聖殿", region: "聖印の高原", description: "城を兼ねた巨大な聖殿。" },
    { name: "灰煤城", region: "灰落としの平原", description: "煤けた壁面が独特の質感を持つ。" },
    { name: "鏡映城", region: "鏡映の湖沼", description: "湖底にもう一つの城が映ると噂される。" },
    { name: "鐘塔本城", region: "鐘塔の麓", description: "三時間に一度、城自身の鐘が鳴る。" },
  ];
  let castlesCreated = 0;
  for (const c of castles) {
    const exists = await prisma.castle.findFirst({ where: { name: c.name } });
    if (!exists) {
      await prisma.castle.create({ data: c });
      castlesCreated++;
    }
  }
  console.log(`  castles: +${castlesCreated} (${castles.length} total)`);

  // Cycle 41-4: オンボーディング 5 連鎖クエスト。新規キャラに自動受注され、
  // 完了すると次の 1 件が自動で受注される。Day1 プレイヤに「次にやること」
  // を 1 件だけ提示し続ける線形誘導。seed.ts はキャラ作成より前に走るので
  // ここでは Quest 行のみ用意 (受注は src/app/api/characters/route.ts)。
  let onboardingCreated = 0;
  let onboardingUpdated = 0;
  for (const step of ONBOARDING_CHAIN) {
    const existing = await prisma.quest.findFirst({
      where: { generatedBy: ONBOARDING_GENERATED_BY, title: step.title },
    });
    if (existing) {
      await prisma.quest.update({
        where: { id: existing.id },
        data: {
          description: step.description,
          goalType: step.goalType,
          goalParam: step.goalParam,
          goalCount: step.goalCount,
          expReward: step.expReward,
          goldReward: step.goldReward,
        },
      });
      onboardingUpdated++;
    } else {
      await prisma.quest.create({
        data: {
          townId: null,
          title: step.title,
          description: step.description,
          goalType: step.goalType,
          goalParam: step.goalParam,
          goalCount: step.goalCount,
          expReward: step.expReward,
          goldReward: step.goldReward,
          generatedBy: ONBOARDING_GENERATED_BY,
        },
      });
      onboardingCreated++;
    }
  }
  console.log(`  onboarding chain: +${onboardingCreated} created, ${onboardingUpdated} updated`);

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
