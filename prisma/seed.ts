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

  // Starter items
  const items = [
    { name: "薬草", description: "HPを30回復する。", category: "consumable", rarity: "common", basePrice: 20, hpBonus: 30 },
    { name: "魔素草", description: "MPを15回復する。", category: "consumable", rarity: "common", basePrice: 30, mpBonus: 15 },
    { name: "古びた剣", description: "新人の最初の相棒。", category: "equip", slot: "weapon", rarity: "common", atkBonus: 3, basePrice: 30 },
    { name: "布の服", description: "最低限の防具。", category: "equip", slot: "body", rarity: "common", defBonus: 2, basePrice: 20 },
    { name: "革の兜", description: "頭を守る簡素な兜。", category: "equip", slot: "head", rarity: "common", defBonus: 1, basePrice: 25 },
    { name: "鉄の小手", description: "腕を守る軽い小手。", category: "equip", slot: "arm", rarity: "common", atkBonus: 1, defBonus: 1, basePrice: 35 },
    { name: "旅人の靴", description: "長旅に耐える丈夫な靴。", category: "equip", slot: "foot", rarity: "common", defBonus: 1, basePrice: 25 },
    { name: "見習いのローブ", description: "魔力を高める粗末なローブ。", category: "equip", slot: "body", rarity: "common", matBonus: 3, mdfBonus: 1, basePrice: 40 },
    { name: "守りの護符", description: "厄を払うと言われる小さな護符。", category: "equip", slot: "charm", rarity: "common", mdfBonus: 2, hpBonus: 5, basePrice: 60 },
  ];
  for (const it of items) {
    const exists = await prisma.item.findFirst({ where: { name: it.name } });
    if (!exists) await prisma.item.create({ data: it });
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
