// World raid engine.
//
// Design summary (see docs/team/CYCLE29_WIP.md):
//
// - A raid is a town-scoped boss that any character in that town can join.
//   Lifecycle: joining (10 min lobby) → active (≤30 min combat) → ended.
// - Combat is an *async DPS race*. Each participant has individual cooldowns
//   (attack 5s, skill 15s, heal 10s). Boss HP is shared across attackers.
// - Boss retaliates per action (single-target counter on the actor) instead of
//   global AOE — cleaner for an MVP without a `lastBossTickMs` schema field.
//   AOE is a candidate for C29-b once we add a tick column.
// - KO: alive=false, reviveAt = now + 90s, lazily revives on next action.
// - Rewards on victory: top1 legendary, top2-5 epic, top6+ rare drop, plus
//   shared exp/gold via awardExpAndGold. Damage ranking comes from
//   participant.damageDealt.
//
// BigInt cooldown fields (`attackReadyAt`, etc.) are coerced to Number for
// comparison with Date.now(). API callers must coerce them again before
// JSON.stringify (BigInt is not serializable by default).
import { prisma } from "@/lib/prisma";
import { computeCombatStats, computeCombatEffects } from "@/lib/equipment";
import { applyDamage, rollEquipmentDrop } from "@/lib/battle";
import { awardExpAndGold } from "@/lib/leveling";
import { awardAchievement } from "@/lib/achievements";
import { tickDailyChallenge } from "@/lib/dailyChallenge";
import { getIO } from "@/lib/socket";

const JOIN_WINDOW_MS = 10 * 60 * 1000;
const COMBAT_WINDOW_MS = 30 * 60 * 1000;
const ATTACK_CD_MS = 5_000;
const SKILL_CD_MS = 15_000;
const HEAL_CD_MS = 10_000;
const REVIVE_MS = 90_000;
const SKILL_MP_COST = 10;
const HEAL_AMOUNT = 200;
const RESPAWN_COOLDOWN_MS = 60 * 60 * 1000;
const SPAWN_CHANCE = 0.10; // ~10% per check, gated by cooldown
const COMBAT_LOG_MAX = 100;

// Curated raid bestiary. Themed beasts that scale to the town's apparent
// average level (passed in from the spawn site). Element/weakness mirrors
// existing combat conventions.
const RAID_TEMPLATES: ReadonlyArray<{
  name: string;
  description: string;
  element: string | null;
  weakness: string | null;
  creatureType: string;
}> = [
  { name: "灰の唄を喰らう者", description: "歌声に引かれて街の影から這い出る巨獣。鈍色の喉が低く震える。", element: "dark", weakness: "light", creatureType: "magic" },
  { name: "塔陰の長腕鬼", description: "六本の長い腕で町を撫で回す影鬼。届くものは喰らう。", element: null, weakness: "fire", creatureType: "humanoid" },
  { name: "霜帝の落とし子", description: "極寒の使徒。触れた地面が即座に凍りつく。", element: "water", weakness: "fire", creatureType: "construct" },
  { name: "鏡映の双子姫", description: "ひとりはこちら、ひとりはあちら側。同じ顔で攻めてくる。", element: null, weakness: "light", creatureType: "humanoid" },
  { name: "黒水の大蛇", description: "深淵の井戸から首を伸ばして街路を呑む。鱗は錆色。", element: "water", weakness: "earth", creatureType: "beast" },
  { name: "封印の番犬", description: "誰かが封印を解いた。三つ首がそれぞれ別の方角を見ている。", element: "fire", weakness: "water", creatureType: "beast" },
  { name: "灯滅の鐘", description: "鳴るたびに街の灯がひとつ消える。動く青銅。", element: "dark", weakness: "light", creatureType: "construct" },
  { name: "忘却の図書司", description: "本に名前を書かれると、その者の存在が薄れていく。", element: "dark", weakness: "wind", creatureType: "magic" },
  { name: "竜骨の行進", description: "風化した竜骨が組み上がり、再び歩き始めた。", element: "earth", weakness: "wind", creatureType: "undead" },
  { name: "白竜の影", description: "本物ではない、と誰かが囁く。だが息は熱い。", element: "wind", weakness: "earth", creatureType: "magic" },
];

export type RaidActionResult =
  | { ok: true; damage?: number; healing?: number; counter?: number; ko?: boolean; victory?: boolean; log: string }
  | { ok: false; reason: string };

export type RaidParticipantView = {
  characterId: string;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  damageDealt: number;
  healingDone: number;
  alive: boolean;
  reviveAt: number; // ms epoch
  attackReadyAt: number;
  skillReadyAt: number;
  healReadyAt: number;
};

export type RaidView = {
  id: string;
  townId: string | null;
  name: string;
  description: string;
  level: number;
  hp: number;
  maxHp: number;
  element: string | null;
  weakness: string | null;
  creatureType: string;
  status: "joining" | "active" | "ended";
  result: string | null;
  startsAt: number;
  joinDeadline: number;
  combatEndsAt: number;
  endedAt: number | null;
  participants: RaidParticipantView[];
  log: Array<{ at: number; actor: string; line: string }>;
  rewards: Array<{ characterId: string; name: string; damage: number; healing: number; rewardTier: string; drop: string | null }>;
};

// Lazy spawn check, called by /town. Returns the new raid or null.
export async function spawnRaidIfDue(townId: string): Promise<{ id: string; name: string } | null> {
  const now = Date.now();
  const existing = await prisma.raid.findFirst({
    where: { townId, status: { in: ["joining", "active"] } },
    select: { id: true },
  });
  if (existing) return null;

  const recent = await prisma.raid.findFirst({
    where: {
      townId,
      status: "ended",
      endedAt: { gte: new Date(now - RESPAWN_COOLDOWN_MS) },
    },
    select: { id: true },
  });
  if (recent) return null;

  if (Math.random() >= SPAWN_CHANCE) return null;

  // Approximate level from the average of recent visitors. If the town has
  // no recent activity, fall back to 15.
  const recentChars = await prisma.character.findMany({
    where: { currentTownId: townId },
    select: { level: true },
    take: 20,
    orderBy: { createdAt: "desc" },
  });
  const avgLevel = recentChars.length > 0
    ? Math.round(recentChars.reduce((a, c) => a + c.level, 0) / recentChars.length)
    : 15;
  const level = Math.max(5, Math.min(60, avgLevel + Math.floor(Math.random() * 5) - 2));

  const tpl = RAID_TEMPLATES[Math.floor(Math.random() * RAID_TEMPLATES.length)];
  const maxHp = level * 220 + 800;
  const atk = Math.floor(level * 2.4 + 8);
  const defense = Math.floor(level * 0.9 + 4);

  const startsAt = new Date(now);
  const joinDeadline = new Date(now + JOIN_WINDOW_MS);
  const combatEndsAt = new Date(now + JOIN_WINDOW_MS + COMBAT_WINDOW_MS);

  const raid = await prisma.raid.create({
    data: {
      townId,
      name: tpl.name,
      description: tpl.description,
      level,
      maxHp,
      hp: maxHp,
      atk,
      defense,
      element: tpl.element,
      weakness: tpl.weakness,
      creatureType: tpl.creatureType,
      status: "joining",
      startsAt,
      joinDeadline,
      combatEndsAt,
    },
    select: { id: true, name: true, townId: true },
  });

  // Broadcast announcement (best-effort).
  try {
    const a = await prisma.announcement.create({
      data: {
        title: `[レイド出現] ${tpl.name}`,
        body: `${tpl.description} 集合まで残り 10 分。`,
      },
    });
    getIO()?.emit("system:announcement", a);
    if (raid.townId) getIO()?.to(`town:${raid.townId}`).emit("raid:spawn", { raidId: raid.id });
  } catch { /* non-fatal */ }

  return { id: raid.id, name: raid.name };
}

export async function joinRaid(raidId: string, characterId: string): Promise<{ ok: boolean; reason?: string; firstJoin?: boolean }> {
  const raid = await prisma.raid.findUnique({ where: { id: raidId } });
  if (!raid) return { ok: false, reason: "そのレイドは存在しない" };
  if (raid.status === "ended") return { ok: false, reason: "もう決着している" };

  // Already joined?
  const existing = await prisma.raidParticipant.findUnique({
    where: { raidId_characterId: { raidId, characterId } },
  });
  if (existing) return { ok: true, firstJoin: false };

  const stats = await computeCombatStats(characterId);
  if (!stats) return { ok: false, reason: "キャラクターが見つからない" };

  await prisma.raidParticipant.create({
    data: {
      raidId,
      characterId,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      mp: stats.maxMp,
      maxMp: stats.maxMp,
    },
  });

  // Cross-cutting hooks (Cycle 29-d). Best-effort — never block the join.
  try { await awardAchievement("raid_first", characterId); } catch { /* ignore */ }
  try { await tickDailyChallenge({ characterId, goalType: "raid_join", delta: 1 }); } catch { /* ignore */ }

  return { ok: true, firstJoin: true };
}

// Manual early start (any participant can pull the trigger once 5+ joined).
export async function startRaidNow(raidId: string, _characterId: string): Promise<{ ok: boolean; reason?: string }> {
  const raid = await prisma.raid.findUnique({
    where: { id: raidId },
    include: { _count: { select: { participants: true } } },
  });
  if (!raid) return { ok: false, reason: "そのレイドは存在しない" };
  if (raid.status !== "joining") return { ok: false, reason: "既に戦闘が始まっている" };
  if (raid._count.participants < 5) return { ok: false, reason: "5 人以上で開始可能" };

  await prisma.raid.update({
    where: { id: raidId },
    data: { status: "active" },
  });
  getIO()?.to(`raid:${raidId}`).emit("raid:start", { raidId });
  return { ok: true };
}

// Auto-promote joining → active when joinDeadline passes. Idempotent.
async function promoteIfDue(raidId: string): Promise<void> {
  const raid = await prisma.raid.findUnique({
    where: { id: raidId },
    select: { status: true, joinDeadline: true },
  });
  if (!raid) return;
  if (raid.status !== "joining") return;
  if (Date.now() < raid.joinDeadline.getTime()) return;
  await prisma.raid.update({
    where: { id: raidId },
    data: { status: "active" },
  });
}

export async function attackRaid(raidId: string, characterId: string): Promise<RaidActionResult> {
  await promoteIfDue(raidId);
  const ctx = await loadActionContext(raidId, characterId);
  if (!ctx.ok) return ctx;
  const { raid, participant, eqStats, effects, name } = ctx;

  const now = Date.now();
  if (Number(participant.attackReadyAt) > now) {
    return { ok: false, reason: `クールダウン中（あと ${Math.ceil((Number(participant.attackReadyAt) - now) / 1000)} 秒）` };
  }

  const baseDmg = applyDamage(eqStats.atk, raid.defense, 10, null, raid.weakness ?? null, raid.element ?? null);
  // Slay/crit/lifesteal (mirrors battle.ts applyEffects without the curse path,
  // since raid actors don't have a status table yet).
  const slayBonus = effects.slay[raid.creatureType as keyof typeof effects.slay] ?? 0;
  const critRate = Math.min(60, 5 + effects.critRateBonus);
  const isCrit = Math.random() * 100 < critRate;
  const critMult = isCrit ? 1.5 + effects.critDamageBonus / 100 : 1.0;
  const slayMult = 1 + slayBonus / 100;
  const damage = Math.max(1, Math.floor(baseDmg * slayMult * critMult));
  const lifesteal = effects.lifestealPercent > 0
    ? Math.max(0, Math.floor(damage * effects.lifestealPercent / 100))
    : 0;

  // Counter-strike from boss to actor.
  const counter = Math.max(1, raid.atk - Math.floor(eqStats.def * 0.6));

  const newBossHp = Math.max(0, raid.hp - damage);
  const newActorHp = Math.max(0, participant.hp - counter + lifesteal);
  const ko = newActorHp <= 0;
  const tags: string[] = [];
  if (isCrit) tags.push("【CRIT】");
  if (slayBonus > 0) tags.push(`【特効】`);
  const line = `${name} の通常攻撃 ${tags.join("")} → ${damage} ダメージ${lifesteal > 0 ? ` (吸収 ${lifesteal})` : ""} / 反撃 ${counter}${ko ? "（撃沈！）" : ""}`;

  await prisma.$transaction(async (tx) => {
    await tx.raid.update({
      where: { id: raidId },
      data: {
        hp: newBossHp,
        combatLogJson: appendLog(raid.combatLogJson, name, line),
      },
    });
    await tx.raidParticipant.update({
      where: { id: participant.id },
      data: {
        hp: newActorHp,
        damageDealt: { increment: damage },
        attackReadyAt: BigInt(now + ATTACK_CD_MS),
        alive: !ko,
        reviveAt: ko ? BigInt(now + REVIVE_MS) : participant.reviveAt,
      },
    });
  });

  let victory = false;
  if (newBossHp <= 0) {
    victory = true;
    await finalizeRaidIfDue(raidId);
  }
  emitTick(raidId);
  return { ok: true, damage, counter, ko, victory, log: line };
}

export async function skillRaid(raidId: string, characterId: string, _skillId?: string): Promise<RaidActionResult> {
  await promoteIfDue(raidId);
  const ctx = await loadActionContext(raidId, characterId);
  if (!ctx.ok) return ctx;
  const { raid, participant, eqStats, effects, name } = ctx;
  const now = Date.now();
  if (Number(participant.skillReadyAt) > now) {
    return { ok: false, reason: `スキル準備中（あと ${Math.ceil((Number(participant.skillReadyAt) - now) / 1000)} 秒）` };
  }
  if (participant.mp < SKILL_MP_COST) {
    return { ok: false, reason: `MP が足りない（${SKILL_MP_COST} 必要）` };
  }

  const baseDmg = applyDamage(Math.max(eqStats.atk, eqStats.mat), raid.defense, 22, null, raid.weakness ?? null, raid.element ?? null);
  const slayBonus = effects.slay[raid.creatureType as keyof typeof effects.slay] ?? 0;
  const critRate = Math.min(60, 5 + effects.critRateBonus);
  const isCrit = Math.random() * 100 < critRate;
  const critMult = isCrit ? 1.5 + effects.critDamageBonus / 100 : 1.0;
  const damage = Math.max(1, Math.floor(baseDmg * (1 + slayBonus / 100) * critMult));

  const counter = Math.max(1, Math.floor((raid.atk - Math.floor(eqStats.def * 0.6)) * 0.7));
  const newBossHp = Math.max(0, raid.hp - damage);
  const newActorHp = Math.max(0, participant.hp - counter);
  const ko = newActorHp <= 0;
  const line = `${name} の特技 ${isCrit ? "【CRIT】" : ""} → ${damage} ダメージ / 反撃 ${counter}${ko ? "（撃沈！）" : ""}`;

  await prisma.$transaction(async (tx) => {
    await tx.raid.update({
      where: { id: raidId },
      data: {
        hp: newBossHp,
        combatLogJson: appendLog(raid.combatLogJson, name, line),
      },
    });
    await tx.raidParticipant.update({
      where: { id: participant.id },
      data: {
        hp: newActorHp,
        mp: Math.max(0, participant.mp - SKILL_MP_COST),
        damageDealt: { increment: damage },
        skillReadyAt: BigInt(now + SKILL_CD_MS),
        alive: !ko,
        reviveAt: ko ? BigInt(now + REVIVE_MS) : participant.reviveAt,
      },
    });
  });

  let victory = false;
  if (newBossHp <= 0) {
    victory = true;
    await finalizeRaidIfDue(raidId);
  }
  emitTick(raidId);
  return { ok: true, damage, counter, ko, victory, log: line };
}

export async function healRaid(raidId: string, characterId: string): Promise<RaidActionResult> {
  await promoteIfDue(raidId);
  const ctx = await loadActionContext(raidId, characterId);
  if (!ctx.ok) return ctx;
  const { raid, participant, name } = ctx;
  const now = Date.now();
  if (Number(participant.healReadyAt) > now) {
    return { ok: false, reason: `回復準備中（あと ${Math.ceil((Number(participant.healReadyAt) - now) / 1000)} 秒）` };
  }

  // Find lowest-hp alive ally (including self).
  const allies = await prisma.raidParticipant.findMany({
    where: { raidId, alive: true },
    include: { character: { select: { name: true } } },
  });
  if (allies.length === 0) return { ok: false, reason: "対象がいない" };
  let target = allies[0];
  let minRatio = target.hp / Math.max(1, target.maxHp);
  for (const a of allies) {
    const r = a.hp / Math.max(1, a.maxHp);
    if (r < minRatio) { minRatio = r; target = a; }
  }

  const healed = Math.min(HEAL_AMOUNT, target.maxHp - target.hp);
  const line = `${name} の救援詠唱 → ${target.character.name} に ${healed} 回復`;

  await prisma.$transaction(async (tx) => {
    await tx.raid.update({
      where: { id: raidId },
      data: { combatLogJson: appendLog(raid.combatLogJson, name, line) },
    });
    await tx.raidParticipant.update({
      where: { id: target.id },
      data: { hp: target.hp + healed },
    });
    await tx.raidParticipant.update({
      where: { id: participant.id },
      data: {
        healingDone: { increment: healed },
        healReadyAt: BigInt(now + HEAL_CD_MS),
      },
    });
  });
  emitTick(raidId);
  return { ok: true, healing: healed, log: line };
}

// Promote → finalize on timeout / hp<=0. Returns final state.
export async function finalizeRaidIfDue(raidId: string): Promise<"victory" | "expired" | "active" | "joining" | "ended"> {
  await promoteIfDue(raidId);
  const raid = await prisma.raid.findUnique({
    where: { id: raidId },
    include: { participants: { include: { character: { select: { id: true, name: true } } } } },
  });
  if (!raid) return "ended";
  if (raid.status === "ended") return "ended";

  const now = Date.now();
  const timedOut = now >= raid.combatEndsAt.getTime();
  const dead = raid.hp <= 0;
  if (!timedOut && !dead) return raid.status as "joining" | "active";

  const result: "victory" | "expired" = dead ? "victory" : "expired";

  // Damage ranking.
  const ranked = [...raid.participants].sort((a, b) => b.damageDealt - a.damageDealt);

  type Reward = { characterId: string; name: string; damage: number; healing: number; rewardTier: string; drop: string | null };
  const rewards: Reward[] = [];

  for (let i = 0; i < ranked.length; i++) {
    const p = ranked[i];
    let tier: "common" | "rare" | "epic" | "legendary" = "common";
    if (result === "victory") {
      if (i === 0) tier = "legendary";
      else if (i < 5) tier = "epic";
      else tier = "rare";
    }
    let drop: string | null = null;
    if (result === "victory") {
      try {
        const r = await rollEquipmentDrop(p.characterId, raid.level, { forcedTier: tier, alwaysDrop: true });
        drop = r?.displayName ?? null;
      } catch { /* ignore */ }
      try {
        const exp = Math.floor(raid.level * 30 + p.damageDealt * 0.05);
        const gold = Math.floor(raid.level * 12 + p.damageDealt * 0.02);
        await awardExpAndGold(p.characterId, exp, gold);
      } catch { /* ignore */ }
      // Achievements (best-effort).
      try {
        if (i === 0) await awardAchievement("raid_top_dmg", p.characterId);
        if (p.damageDealt >= 5000) await awardAchievement("raid_legend", p.characterId);
        // Lifetime victory count includes this raid (status will be flipped
        // to ended below; counting now means we look at completed raids
        // strictly before this one and add 1).
        const priorVictories = await prisma.raidParticipant.count({
          where: {
            characterId: p.characterId,
            raid: { result: "victory", id: { not: raidId } },
          },
        });
        if (priorVictories + 1 >= 5) await awardAchievement("raid_5_kills", p.characterId);
      } catch { /* ignore */ }
    }
    rewards.push({
      characterId: p.characterId,
      name: p.character.name,
      damage: p.damageDealt,
      healing: p.healingDone,
      rewardTier: tier,
      drop,
    });
  }

  await prisma.raid.update({
    where: { id: raidId },
    data: {
      status: "ended",
      result,
      endedAt: new Date(now),
      hp: Math.max(0, raid.hp),
      rewardsJson: JSON.stringify(rewards),
    },
  });

  try {
    const a = await prisma.announcement.create({
      data: {
        title: result === "victory" ? `[レイド討伐] ${raid.name}` : `[レイド消失] ${raid.name}`,
        body: result === "victory"
          ? `${ranked[0]?.character.name ?? "誰か"} を筆頭に ${ranked.length} 名が ${raid.name} を討伐した。`
          : `${raid.name} は時を満たし、影に戻っていった。`,
      },
    });
    getIO()?.emit("system:announcement", a);
    getIO()?.to(`raid:${raidId}`).emit("raid:end", { raidId, result });
  } catch { /* non-fatal */ }

  return result;
}

export async function listActiveRaids(townId?: string): Promise<RaidView[]> {
  const raids = await prisma.raid.findMany({
    where: {
      status: { in: ["joining", "active"] },
      ...(townId ? { townId } : {}),
    },
    orderBy: { startsAt: "desc" },
  });
  const views: RaidView[] = [];
  for (const r of raids) {
    const v = await getRaidView(r.id);
    if (v) views.push(v);
  }
  return views;
}

export async function getRaidView(raidId: string): Promise<RaidView | null> {
  const raid = await prisma.raid.findUnique({
    where: { id: raidId },
    include: {
      participants: {
        include: { character: { select: { id: true, name: true } } },
        orderBy: { damageDealt: "desc" },
      },
    },
  });
  if (!raid) return null;

  let log: Array<{ at: number; actor: string; line: string }> = [];
  try { log = JSON.parse(raid.combatLogJson || "[]"); } catch { log = []; }
  let rewards: RaidView["rewards"] = [];
  try { rewards = JSON.parse(raid.rewardsJson || "[]"); } catch { rewards = []; }

  return {
    id: raid.id,
    townId: raid.townId,
    name: raid.name,
    description: raid.description,
    level: raid.level,
    hp: raid.hp,
    maxHp: raid.maxHp,
    element: raid.element,
    weakness: raid.weakness,
    creatureType: raid.creatureType,
    status: raid.status as "joining" | "active" | "ended",
    result: raid.result,
    startsAt: raid.startsAt.getTime(),
    joinDeadline: raid.joinDeadline.getTime(),
    combatEndsAt: raid.combatEndsAt.getTime(),
    endedAt: raid.endedAt ? raid.endedAt.getTime() : null,
    participants: raid.participants.map((p) => ({
      characterId: p.characterId,
      name: p.character.name,
      hp: p.hp,
      maxHp: p.maxHp,
      mp: p.mp,
      maxMp: p.maxMp,
      damageDealt: p.damageDealt,
      healingDone: p.healingDone,
      alive: p.alive,
      reviveAt: Number(p.reviveAt),
      attackReadyAt: Number(p.attackReadyAt),
      skillReadyAt: Number(p.skillReadyAt),
      healReadyAt: Number(p.healReadyAt),
    })),
    log,
    rewards,
  };
}

// ----- helpers -----

type ActionContext =
  | { ok: true; raid: { id: string; hp: number; maxHp: number; defense: number; atk: number; element: string | null; weakness: string | null; creatureType: string; status: string; combatLogJson: string }; participant: { id: string; hp: number; maxHp: number; mp: number; maxMp: number; alive: boolean; reviveAt: bigint; attackReadyAt: bigint; skillReadyAt: bigint; healReadyAt: bigint }; eqStats: { atk: number; def: number; mat: number; mdf: number; spd: number; maxHp: number; maxMp: number }; effects: import("@/lib/affixes").AggregatedEffects; name: string }
  | { ok: false; reason: string };

async function loadActionContext(raidId: string, characterId: string): Promise<ActionContext> {
  const raid = await prisma.raid.findUnique({
    where: { id: raidId },
    select: {
      id: true, hp: true, maxHp: true, defense: true, atk: true,
      element: true, weakness: true, creatureType: true, status: true,
      combatLogJson: true,
    },
  });
  if (!raid) return { ok: false, reason: "レイドが見つからない" };
  if (raid.status === "ended") return { ok: false, reason: "もう決着している" };
  if (raid.status === "joining") return { ok: false, reason: "まだ集合中" };

  const participant = await prisma.raidParticipant.findUnique({
    where: { raidId_characterId: { raidId, characterId } },
    select: {
      id: true, hp: true, maxHp: true, mp: true, maxMp: true,
      alive: true, reviveAt: true,
      attackReadyAt: true, skillReadyAt: true, healReadyAt: true,
    },
  });
  if (!participant) return { ok: false, reason: "参戦していない" };

  const now = Date.now();
  let alive = participant.alive;
  let hp = participant.hp;
  // Lazy revive on action.
  if (!alive && Number(participant.reviveAt) <= now) {
    alive = true;
    hp = Math.floor(participant.maxHp * 0.5);
    await prisma.raidParticipant.update({
      where: { id: participant.id },
      data: { alive: true, hp },
    });
  }
  if (!alive) {
    return { ok: false, reason: `撃沈中。あと ${Math.ceil((Number(participant.reviveAt) - now) / 1000)} 秒で復帰` };
  }

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { name: true },
  });
  if (!character) return { ok: false, reason: "キャラクターが見つからない" };

  const eqStats = await computeCombatStats(characterId);
  const effects = await computeCombatEffects(characterId);
  if (!eqStats) return { ok: false, reason: "ステータス計算失敗" };

  return {
    ok: true,
    raid,
    participant: { ...participant, hp, alive },
    eqStats,
    effects,
    name: character.name,
  };
}

function appendLog(prevJson: string, actor: string, line: string): string {
  let arr: Array<{ at: number; actor: string; line: string }> = [];
  try {
    const parsed = JSON.parse(prevJson || "[]");
    if (Array.isArray(parsed)) arr = parsed;
  } catch { arr = []; }
  arr.push({ at: Date.now(), actor, line });
  if (arr.length > COMBAT_LOG_MAX) arr = arr.slice(-COMBAT_LOG_MAX);
  return JSON.stringify(arr);
}

function emitTick(raidId: string): void {
  try { getIO()?.to(`raid:${raidId}`).emit("raid:tick", { raidId }); } catch { /* ignore */ }
}
