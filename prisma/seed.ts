import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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

  // Towns
  const towns = [
    { name: "始まりの街アルダ", region: "中央", danger: 1, economy: 60, security: 70, innFee: 15, description: "旅人が最初に立ち寄る、平穏な街。" },
    { name: "湖畔の街ミルレ", region: "西", danger: 2, economy: 55, security: 60, innFee: 25, description: "湖の畔に栄えた商人の街。" },
    { name: "霧の街ヴェルナ", region: "北", danger: 3, economy: 40, security: 45, innFee: 30, description: "深い霧に覆われた、噂の絶えぬ街。" },
  ];
  for (const t of towns) {
    await prisma.town.upsert({ where: { name: t.name }, update: {}, create: t });
  }

  // Seed NPCs into each starter town. Their `dialogue` field is a fallback;
  // the live town page regenerates lines per-visit so the world keeps speaking
  // about whatever the season's mystery is currently surfacing.
  const NPC_SEED: Record<string, Array<{ name: string; role: string; dialogue: string }>> = {
    "始まりの街アルダ": [
      { name: "ガロン", role: "酒場の主人", dialogue: "ようこそ。今日はちょっと変わった噂が流れているよ。" },
      { name: "リヤ", role: "宿屋の主人", dialogue: "一晩あたためた寝床と、温かい飯を出すよ。" },
      { name: "老師ヒース", role: "転職屋の老人", dialogue: "心当たりがあるなら、そこを開いてみるといい。鍵はあんた自身だ。" },
    ],
    "湖畔の街ミルレ": [
      { name: "セリオ", role: "酒場の主人", dialogue: "湖風の街は噂もよく流れる。座って聞いていきなよ。" },
      { name: "占い師ティナ", role: "占い師", dialogue: "あんたの星には、まだ見ぬ職が浮かんでいる…。" },
      { name: "詩人ヤン", role: "旅の吟遊詩人", dialogue: "新しい歌を覚えたんだ、聴いていくかい？" },
    ],
    "霧の街ヴェルナ": [
      { name: "ボルト", role: "酒場の主人", dialogue: "霧の夜に来たな。ここでは冗談みたいな話が本当になる。" },
      { name: "司書クラエル", role: "占い師", dialogue: "禁書の写本が、また一冊消えた。読めない頁ほど消える。" },
      { name: "宿屋のミラ", role: "宿屋の主人", dialogue: "霧が濃い夜は、外を歩かない方がいい。" },
    ],
  };
  for (const [townName, npcs] of Object.entries(NPC_SEED)) {
    const town = await prisma.town.findUnique({ where: { name: townName } });
    if (!town) continue;
    for (const n of npcs) {
      const exists = await prisma.npc.findFirst({ where: { townId: town.id, name: n.name } });
      if (!exists) {
        await prisma.npc.create({ data: { townId: town.id, name: n.name, role: n.role, dialogue: n.dialogue } });
      }
    }
  }

  // Initial jobs (beginner) so new characters can adopt one
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

  // Pair each beginner job with one starter skill
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

  // ----- Items: weapons (with job affinities) + armor + consumables ---------
  // jobAffinity is JSON. Empty array = universal. Multi-archetype weapons get
  // bonuses for any matching wielder; non-matching wielders get half-bonus.
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

  // Initial castle (scaffolding for siege)
  const castle = await prisma.castle.findFirst({ where: { name: "アルダ城" } });
  if (!castle) {
    await prisma.castle.create({
      data: { name: "アルダ城", region: "中央", description: "中央地方を見下ろす由緒ある城。" },
    });
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
