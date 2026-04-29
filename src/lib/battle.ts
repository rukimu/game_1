import { prisma } from "@/lib/prisma";
import { emitBattle } from "@/lib/socket";
import { awardExpAndGold } from "@/lib/leveling";
import { getContentGenerationService } from "@/lib/generation/service";
import { onDungeonBattleEnded } from "@/lib/dungeon";
import { rollClueDiscovery } from "@/lib/mystery";
import { rollItemInstance, tierLabel, type AggregatedEffects, type ItemInstance } from "@/lib/affixes";
import { computeCombatEffects, computeCombatStats } from "@/lib/equipment";

export type EnemyState = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  level: number;
  element: string | null;
  weakness: string | null;
  // Loose category for slay-bonus affixes. Stored on the JSON state, not on
  // the Enemy table — old battles without it default to "unknown".
  creatureType: "humanoid" | "beast" | "undead" | "magic" | "construct" | "unknown";
  expReward: number;
  goldReward: number;
  alive: boolean;
};

export type BattleLogEntry = {
  turn: number;
  text: string;
  ts: number;
};

const ELEMENT_BONUS = 1.5;
const ELEMENT_RESIST = 0.5;

export function applyDamage(atk: number, def: number, power: number, atkElement: string | null, defWeakness: string | null, defElement: string | null) {
  const base = Math.max(1, Math.floor((atk * (power / 10)) - def * 0.6));
  let mult = 1;
  if (atkElement && defWeakness && atkElement === defWeakness) mult *= ELEMENT_BONUS;
  if (atkElement && defElement && atkElement === defElement) mult *= ELEMENT_RESIST;
  // small randomness
  mult *= 0.85 + Math.random() * 0.3;
  return Math.max(1, Math.floor(base * mult));
}

const TURN_TIMEOUT_MS = 15000;
const turnTimers = new Map<string, NodeJS.Timeout>();

function scheduleTurnTimeout(battleId: string) {
  const existing = turnTimers.get(battleId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    autoFillAndResolve(battleId).catch((err) => console.error("auto resolve error", err));
    turnTimers.delete(battleId);
  }, TURN_TIMEOUT_MS);
  turnTimers.set(battleId, t);
}

function clearTurnTimeout(battleId: string) {
  const existing = turnTimers.get(battleId);
  if (existing) clearTimeout(existing);
  turnTimers.delete(battleId);
}

export async function startBattleForParty(partyId: string, opts?: { enemyCount?: number; level?: number; townId?: string | null }) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: { include: { character: true } } },
  });
  if (!party) throw new Error("party not found");
  if (party.members.length === 0) throw new Error("party empty");
  // Encounter scales with party size. Solo always faces 1 (still tough).
  // 2-3 person: 1-3 enemies. Larger: up to 5. Forming a party is a real choice.
  const partySize = party.members.length;
  const minE = partySize === 1 ? 1 : Math.max(1, partySize - 1);
  const maxE = partySize === 1 ? 1 : Math.min(5, partySize + 1);
  const enemyCount = opts?.enemyCount ?? minE + Math.floor(Math.random() * (maxE - minE + 1));
  const avgLevel = Math.max(1, Math.floor(party.members.reduce((a, m) => a + m.character.level, 0) / party.members.length));
  const level = opts?.level ?? avgLevel;
  const gen = getContentGenerationService();
  const enemies: EnemyState[] = [];
  for (let i = 0; i < enemyCount; i++) {
    const e = await gen.generateEnemy({ level, townId: opts?.townId ?? null, seed: `${partyId}-${Date.now()}-${i}` });
    const stored = await prisma.enemy.create({
      data: {
        name: e.name,
        description: e.description,
        level: e.level,
        hp: e.hp,
        atk: e.atk,
        def: e.def,
        spd: e.spd,
        element: e.element,
        weakness: e.weakness,
        expReward: e.expReward,
        goldReward: e.goldReward,
        townId: opts?.townId ?? null,
      },
    });
    enemies.push({
      id: stored.id,
      name: stored.name,
      hp: stored.hp,
      maxHp: stored.hp,
      atk: stored.atk,
      def: stored.def,
      spd: stored.spd,
      level: stored.level,
      element: stored.element,
      weakness: stored.weakness,
      creatureType: ((e as any).creatureType ?? "unknown") as EnemyState["creatureType"],
      expReward: stored.expReward,
      goldReward: stored.goldReward,
      alive: true,
    });
  }
  const log: BattleLogEntry[] = [{
    turn: 1,
    ts: Date.now(),
    text: `${party.members.length}人のパーティーが${enemies.map(e => e.name).join("、")}と遭遇した！`,
  }];
  const battle = await prisma.battle.create({
    data: {
      partyId,
      status: "active",
      turn: 1,
      enemyState: JSON.stringify(enemies),
      log: JSON.stringify(log),
    },
  });
  for (const m of party.members) {
    await prisma.battleParticipant.create({
      data: {
        battleId: battle.id,
        characterId: m.characterId,
        hp: m.character.hp,
        mp: m.character.mp,
        joinedTurn: 1,
      },
    });
  }
  scheduleTurnTimeout(battle.id);
  return battle.id;
}

export async function getBattleState(battleId: string) {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: {
      participants: { include: { character: true } },
      actions: true,
    },
  });
  if (!battle) return null;
  const enemies = JSON.parse(battle.enemyState || "[]") as EnemyState[];
  const log = JSON.parse(battle.log || "[]") as BattleLogEntry[];
  return { battle, enemies, log };
}

type ActionInput = {
  battleId: string;
  characterId: string;
  actionType: "attack" | "skill" | "defend";
  targetIndex?: number;
  skillId?: string;
};

export async function submitAction(input: ActionInput) {
  const battle = await prisma.battle.findUnique({
    where: { id: input.battleId },
    include: { participants: true },
  });
  if (!battle || battle.status !== "active") throw new Error("battle inactive");
  const participant = battle.participants.find(p => p.characterId === input.characterId);
  if (!participant || !participant.alive) throw new Error("not in battle");
  const existing = await prisma.battleAction.findFirst({
    where: { battleId: battle.id, turn: battle.turn, characterId: input.characterId },
  });
  if (existing) return { queued: true, alreadySubmitted: true };
  await prisma.battleAction.create({
    data: {
      battleId: battle.id,
      turn: battle.turn,
      characterId: input.characterId,
      actionType: input.actionType,
      targetIndex: input.targetIndex ?? null,
      skillId: input.skillId ?? null,
    },
  });
  emitBattle(battle.id, "battle:action_submitted", { characterId: input.characterId });
  // Resolve when all alive participants have submitted
  const submitted = await prisma.battleAction.count({
    where: { battleId: battle.id, turn: battle.turn },
  });
  const aliveCount = battle.participants.filter(p => p.alive).length;
  if (submitted >= aliveCount) {
    await resolveTurn(battle.id);
  }
  return { queued: true };
}

export async function autoFillAndResolve(battleId: string) {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: { participants: true },
  });
  if (!battle || battle.status !== "active") return;
  const submitted = await prisma.battleAction.findMany({
    where: { battleId, turn: battle.turn },
  });
  const submittedSet = new Set(submitted.map(s => s.characterId));
  for (const p of battle.participants.filter(p => p.alive && !submittedSet.has(p.characterId))) {
    await prisma.battleAction.create({
      data: {
        battleId: battle.id,
        turn: battle.turn,
        characterId: p.characterId,
        actionType: "attack",
        targetIndex: 0,
      },
    });
  }
  await resolveTurn(battleId);
}

async function resolveTurn(battleId: string) {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: {
      participants: { include: { character: true } },
      actions: { where: { turn: { equals: undefined } } }, // placeholder
    },
  });
  if (!battle || battle.status !== "active") return;
  const turnActions = await prisma.battleAction.findMany({
    where: { battleId, turn: battle.turn },
  });
  let enemies: EnemyState[] = JSON.parse(battle.enemyState || "[]");
  let log: BattleLogEntry[] = JSON.parse(battle.log || "[]");

  // Build participant runtime state. Combat stats AND structured effects are
  // pulled from equipped gear + per-instance affixes + job affinity, so a
  // freshly looted weapon actually changes how hard you hit this very next
  // turn (and lifesteal/crits/slay all light up immediately).
  type PartActor = {
    id: string; hp: number; mp: number; maxHp: number; defending: boolean; alive: boolean;
    spd: number; atk: number; mat: number; def: number; mdf: number; name: string;
    effects: AggregatedEffects;
  };
  const partState = new Map<string, PartActor>();
  for (const p of battle.participants) {
    const eqStats = await computeCombatStats(p.characterId);
    const effects = await computeCombatEffects(p.characterId);
    partState.set(p.characterId, {
      id: p.characterId,
      hp: p.hp,
      mp: p.mp,
      maxHp: eqStats?.maxHp ?? p.character.maxHp,
      defending: false,
      alive: p.alive,
      spd: eqStats?.spd ?? p.character.spd,
      atk: eqStats?.atk ?? p.character.atk,
      mat: eqStats?.mat ?? p.character.mat,
      def: eqStats?.def ?? p.character.def,
      mdf: eqStats?.mdf ?? p.character.mdf,
      name: p.character.name,
      effects,
    });
  }

  // Order: by spd desc (player phase), then enemies
  const ordered = [...turnActions].sort((a, b) => {
    const sa = partState.get(a.characterId)?.spd ?? 0;
    const sb = partState.get(b.characterId)?.spd ?? 0;
    return sb - sa;
  });

  for (const action of ordered) {
    const actor = partState.get(action.characterId);
    if (!actor || !actor.alive) continue;
    if (action.actionType === "defend") {
      actor.defending = true;
      log.push({ turn: battle.turn, ts: Date.now(), text: `${actor.name}は身を守った。` });
      continue;
    }
    if (action.actionType === "skill" && action.skillId) {
      const skill = await prisma.skill.findUnique({ where: { id: action.skillId } });
      if (!skill || actor.mp < skill.cost) {
        log.push({ turn: battle.turn, ts: Date.now(), text: `${actor.name}はスキルを使えなかった。` });
        continue;
      }
      actor.mp -= skill.cost;
      if (skill.type === "heal") {
        const healAmount = skill.power + Math.floor(actor.mat * 0.4);
        // heal target: lowest hp ally
        const targets = [...partState.values()].filter(t => t.alive).sort((a, b) => a.hp - b.hp);
        const t = targets[0];
        if (t) {
          t.hp = Math.min(t.hp + healAmount, await getMaxHp(t.id));
          log.push({ turn: battle.turn, ts: Date.now(), text: `${actor.name}の${skill.name}！${t.name}のHPが${healAmount}回復した。` });
        }
      } else if (skill.type === "buff") {
        actor.atk = Math.floor(actor.atk * 1.2);
        log.push({ turn: battle.turn, ts: Date.now(), text: `${actor.name}は${skill.name}で力を高めた！` });
      } else {
        // attack/debuff/special => damage to enemy
        const idx = action.targetIndex ?? enemies.findIndex(e => e.alive);
        const target = enemies[idx];
        if (!target || !target.alive) {
          log.push({ turn: battle.turn, ts: Date.now(), text: `${actor.name}の${skill.name}は対象が居なかった。` });
          continue;
        }
        const baseDmg = applyDamage(Math.max(actor.atk, actor.mat), target.def, skill.power, skill.element, target.weakness, target.element);
        const result = applyEffects(baseDmg, actor, target);
        target.hp -= result.damage;
        if (result.lifesteal > 0) {
          actor.hp = Math.min(actor.hp + result.lifesteal, actor.maxHp);
        }
        log.push({
          turn: battle.turn,
          ts: Date.now(),
          text: `${actor.name}の${skill.name}！${target.name}に${result.damage}のダメージ。${result.tagText}`,
        });
        if (result.lifesteal > 0) {
          log.push({ turn: battle.turn, ts: Date.now(), text: `  └ ${actor.name}は ${result.lifesteal} HP を吸収した。` });
        }
        if (target.hp <= 0) {
          target.hp = 0;
          target.alive = false;
          log.push({ turn: battle.turn, ts: Date.now(), text: `${target.name}を倒した！` });
        }
      }
      continue;
    }
    // attack
    const idx = action.targetIndex ?? enemies.findIndex(e => e.alive);
    const target = enemies[idx];
    if (!target || !target.alive) {
      log.push({ turn: battle.turn, ts: Date.now(), text: `${actor.name}は攻撃する敵が居なかった。` });
      continue;
    }
    const baseDmg = applyDamage(actor.atk, target.def, 10, null, target.weakness, target.element);
    const result = applyEffects(baseDmg, actor, target);
    target.hp -= result.damage;
    if (result.lifesteal > 0) {
      actor.hp = Math.min(actor.hp + result.lifesteal, actor.maxHp);
    }
    log.push({
      turn: battle.turn,
      ts: Date.now(),
      text: `${actor.name}の攻撃！${target.name}に${result.damage}のダメージ。${result.tagText}`,
    });
    if (result.lifesteal > 0) {
      log.push({ turn: battle.turn, ts: Date.now(), text: `  └ ${actor.name}は ${result.lifesteal} HP を吸収した。` });
    }
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      log.push({ turn: battle.turn, ts: Date.now(), text: `${target.name}を倒した！` });
    }
  }

  // Enemy phase
  const aliveEnemies = enemies.filter(e => e.alive);
  if (aliveEnemies.length > 0) {
    const aliveParts = [...partState.values()].filter(p => p.alive);
    for (const enemy of aliveEnemies) {
      if (aliveParts.length === 0) break;
      const target = aliveParts[Math.floor(Math.random() * aliveParts.length)];
      const def = target.defending ? Math.floor(target.def * 1.6) : target.def;
      const dmg = applyDamage(enemy.atk, def, 10, enemy.element, null, null);
      target.hp -= dmg;
      log.push({ turn: battle.turn, ts: Date.now(), text: `${enemy.name}の攻撃！${target.name}に${dmg}のダメージ。` });
      if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
        log.push({ turn: battle.turn, ts: Date.now(), text: `${target.name}は倒れた…。` });
      }
    }
  }

  // Persist participant updates
  for (const ps of partState.values()) {
    await prisma.battleParticipant.update({
      where: { battleId_characterId: { battleId: battle.id, characterId: ps.id } },
      data: { hp: Math.max(0, ps.hp), mp: Math.max(0, ps.mp), alive: ps.hp > 0 },
    });
  }

  // Determine end conditions
  const allEnemiesDown = enemies.every(e => !e.alive);
  const allPartyDown = [...partState.values()].every(p => !p.alive);

  if (allEnemiesDown) {
    clearTurnTimeout(battle.id);
    log.push({ turn: battle.turn, ts: Date.now(), text: `戦闘に勝利した！` });
    const totalExp = enemies.reduce((a, e) => a + e.expReward, 0);
    const totalGold = enemies.reduce((a, e) => a + e.goldReward, 0);
    const aliveParticipants = [...partState.values()].filter(p => p.alive);
    const share = aliveParticipants.length || 1;
    const isDungeonBattle = !!battle.dungeonRunId;
    // Apply post-battle regen from equipped instances (e.g. 聖印の prefix).
    for (const p of aliveParticipants) {
      const regen = p.effects.postBattleRegen;
      if (regen > 0) {
        const before = p.hp;
        p.hp = Math.min(p.hp + regen, p.maxHp);
        const healed = p.hp - before;
        if (healed > 0) {
          log.push({ turn: battle.turn, ts: Date.now(), text: `${p.name}は装備の力で${healed}HP回復した。` });
        }
      }
    }
    const avgEnemyLevel = enemies.length > 0
      ? Math.max(1, Math.round(enemies.reduce((a, e) => a + e.level, 0) / enemies.length))
      : 1;
    for (const p of aliveParticipants) {
      const before = await prisma.character.findUnique({ where: { id: p.id }, select: { level: true } });
      const priorStreak = await countWinStreak(p.id);
      const onStreak = priorStreak >= 2; // this win is the 3rd or later in a row
      const expMult = onStreak ? 1.2 : 1.0;
      const goldMult = onStreak ? 1.1 : 1.0;
      const expGain = Math.ceil((totalExp / share) * expMult);
      const goldGain = Math.ceil((totalGold / share) * goldMult);
      if (onStreak) {
        log.push({
          turn: battle.turn,
          ts: Date.now(),
          text: `${p.name}の連戦は${priorStreak + 1}戦目！冴え渡る勘で経験値+20%・ゴールド+10%。`,
        });
      }
      if (isDungeonBattle) {
        // dungeon mode: rewards are pooled in DungeonRun, paid out only on retreat or full clear
        log.push({
          turn: battle.turn,
          ts: Date.now(),
          text: `${p.name}はこの階で経験値${expGain}とゴールド${goldGain}を獲得した（持ち帰るには撤退すること）。`,
        });
      } else {
        const updated = await awardExpAndGold(p.id, expGain, goldGain);
        const leveledUp = updated && before && updated.level > before.level;
        log.push({
          turn: battle.turn,
          ts: Date.now(),
          text: `${p.name}は経験値${expGain}とゴールド${goldGain}を得た。${leveledUp ? `レベルが上がった！(Lv${before!.level}→Lv${updated!.level})` : ""}`,
        });
        // small chance to discover a season clue from a hard-fought battle
        try {
          const clue = await rollClueDiscovery(p.id, "battle", 0.08);
          if (clue) {
            log.push({
              turn: battle.turn,
              ts: Date.now(),
              text: `${p.name}は戦いの中で何かに気付いた──「${clue.text}」`,
            });
          }
        } catch (e) { /* non-fatal */ }
        // chance to drop a piece of equipment (non-dungeon only — dungeon loot is pooled)
        try {
          const drop = await rollEquipmentDrop(p.id, avgEnemyLevel);
          if (drop) {
            const flair = drop.tier !== "common" ? `《${tierLabel(drop.tier)}》 ` : "";
            log.push({
              turn: battle.turn,
              ts: Date.now(),
              text: `${p.name}は戦利品 ${flair}『${drop.displayName}』を手に入れた！`,
            });
          }
        } catch (e) { /* non-fatal */ }
      }
      // update quest progress for defeat_enemy quests
      const cqs = await prisma.characterQuest.findMany({ where: { characterId: p.id, completedAt: null }, include: { quest: true } });
      for (const cq of cqs) {
        if (cq.quest.goalType === "defeat_enemy") {
          const inc = enemies.length;
          const newProg = cq.progress + inc;
          if (newProg >= cq.quest.goalCount) {
            await prisma.characterQuest.update({ where: { id: cq.id }, data: { progress: newProg, completedAt: new Date() } });
            const beforeQ = await prisma.character.findUnique({ where: { id: p.id }, select: { level: true } });
            const updatedQ = await awardExpAndGold(p.id, cq.quest.expReward, cq.quest.goldReward);
            const leveledQ = updatedQ && beforeQ && updatedQ.level > beforeQ.level;
            log.push({ turn: battle.turn, ts: Date.now(), text: `${p.name}はクエスト「${cq.quest.title}」を達成した！${leveledQ ? `(Lv${beforeQ!.level}→Lv${updatedQ!.level})` : ""}` });
          } else {
            await prisma.characterQuest.update({ where: { id: cq.id }, data: { progress: newProg } });
          }
        }
      }
      // update job change quest progress
      const jcqs = await prisma.jobChangeQuest.findMany({ where: { characterId: p.id, completedAt: null } });
      for (const jcq of jcqs) {
        if (jcq.goalType !== "defeat_enemy") continue;
        const matchCount = jcq.goalParam
          ? enemies.filter((e) => e.name.includes(jcq.goalParam!) || jcq.goalParam!.includes(e.name)).length || enemies.length
          : enemies.length;
        const newProg = jcq.progress + matchCount;
        if (newProg >= jcq.goalCount) {
          await prisma.jobChangeQuest.update({ where: { id: jcq.id }, data: { progress: newProg, completedAt: new Date() } });
          log.push({ turn: battle.turn, ts: Date.now(), text: `${p.name}は転職課題を達成した！転職施設で転職可能。` });
        } else {
          await prisma.jobChangeQuest.update({ where: { id: jcq.id }, data: { progress: newProg } });
        }
      }
    }
    if (isDungeonBattle && battle.dungeonRunId) {
      try {
        await onDungeonBattleEnded({
          runId: battle.dungeonRunId,
          result: "win",
          totalExp,
          totalGold,
        });
      } catch (e) { /* non-fatal */ }
    }
    await prisma.battle.update({
      where: { id: battle.id },
      data: { status: "ended", endedAt: new Date(), result: "win", enemyState: JSON.stringify(enemies), log: JSON.stringify(log) },
    });
    emitBattle(battle.id, "battle:state", await getBattleState(battle.id));
    return;
  }
  if (allPartyDown) {
    clearTurnTimeout(battle.id);
    log.push({ turn: battle.turn, ts: Date.now(), text: `パーティーは敗北した…。` });
    if (battle.dungeonRunId) {
      try {
        await onDungeonBattleEnded({ runId: battle.dungeonRunId, result: "lose", totalExp: 0, totalGold: 0 });
        log.push({ turn: battle.turn, ts: Date.now(), text: `ダンジョンの探索は途絶え、累積報酬の半分が霧散した。` });
      } catch (e) { /* non-fatal */ }
    }
    // penalties: lose 10% gold, no exp loss for MVP friendliness, revive at 1 HP at inn (next route)
    for (const p of partState.values()) {
      const character = await prisma.character.findUnique({ where: { id: p.id } });
      if (!character) continue;
      const lostGold = Math.floor(character.gold * 0.1);
      await prisma.character.update({
        where: { id: p.id },
        data: { gold: Math.max(0, character.gold - lostGold), hp: 1, mp: 1 },
      });
      log.push({ turn: battle.turn, ts: Date.now(), text: `${character.name}は宿屋で目覚めた。${lostGold}ゴールドを失った。` });
    }
    await prisma.battle.update({
      where: { id: battle.id },
      data: { status: "ended", endedAt: new Date(), result: "lose", enemyState: JSON.stringify(enemies), log: JSON.stringify(log) },
    });
    emitBattle(battle.id, "battle:state", await getBattleState(battle.id));
    return;
  }
  // Next turn
  await prisma.battle.update({
    where: { id: battle.id },
    data: { turn: battle.turn + 1, enemyState: JSON.stringify(enemies), log: JSON.stringify(log) },
  });
  emitBattle(battle.id, "battle:state", await getBattleState(battle.id));
  emitBattle(battle.id, "battle:turn_started", { turn: battle.turn + 1, deadline: Date.now() + TURN_TIMEOUT_MS });
  scheduleTurnTimeout(battle.id);
}

async function getMaxHp(characterId: string) {
  const c = await prisma.character.findUnique({ where: { id: characterId } });
  return c?.maxHp ?? 30;
}

// Layer crit + slay + lifesteal on top of an already-computed base damage.
// Pure function over the actor/target snapshots — does not mutate them. The
// caller subtracts `damage` from target.hp and adds `lifesteal` to actor.hp.
function applyEffects(
  baseDmg: number,
  actor: { effects: AggregatedEffects },
  target: EnemyState,
): { damage: number; lifesteal: number; isCrit: boolean; tagText: string } {
  const slayBonus = actor.effects.slay[target.creatureType] ?? 0;
  const slayMult = 1 + slayBonus / 100;
  const baseCritRate = 5; // 5% baseline for everyone
  const critRate = Math.min(60, baseCritRate + actor.effects.critRateBonus);
  const isCrit = Math.random() * 100 < critRate;
  const critMult = isCrit ? 1.5 + actor.effects.critDamageBonus / 100 : 1.0;
  const damage = Math.max(1, Math.floor(baseDmg * slayMult * critMult));
  const lifesteal = actor.effects.lifestealPercent > 0
    ? Math.max(0, Math.floor(damage * actor.effects.lifestealPercent / 100))
    : 0;
  const tags: string[] = [];
  if (isCrit) tags.push("【クリティカル！】");
  if (slayBonus > 0) tags.push(`【特効 ×${(slayMult).toFixed(2)}】`);
  return { damage, lifesteal, isCrit, tagText: tags.join("") };
}

// Count consecutive recent wins for this character. Resets on the first non-win.
async function countWinStreak(characterId: string): Promise<number> {
  const recent = await prisma.battle.findMany({
    where: {
      status: "ended",
      participants: { some: { characterId } },
    },
    orderBy: { endedAt: "desc" },
    take: 12,
    select: { result: true },
  });
  let streak = 0;
  for (const b of recent) {
    if (b.result === "win") streak++;
    else break;
  }
  return streak;
}

// Hack-and-slash drop. We pick a base item from the equip pool, weighted by
// the character's archetype so they tend to find weapons that are *for them*
// (not exclusively — variety still matters), then layer affixes on top to
// produce a unique instance. Two players who both find a "古びた剣" will see
// genuinely different weapons.
async function rollEquipmentDrop(characterId: string, enemyLevel: number) {
  const chance = Math.min(0.05 + enemyLevel * 0.005, 0.13);
  if (Math.random() >= chance) return null;

  // Resolve the character's archetype so we can bias the loot table.
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { currentJobId: true },
  });
  let archetype: string | null = null;
  if (character?.currentJobId) {
    const job = await prisma.job.findUnique({
      where: { id: character.currentJobId },
      select: { category: true },
    });
    archetype = job?.category ?? null;
  }

  // Pull the equip pool. Weight items whose jobAffinity contains the player's
  // archetype 3x; non-affine items still appear so the hunt for "the right
  // weapon" stays meaningful.
  const candidates = await prisma.item.findMany({
    where: { category: "equip" },
    select: { id: true, name: true, jobAffinity: true, weaponClass: true, slot: true },
  });
  if (candidates.length === 0) return null;

  const weighted: Array<{ id: string; name: string; weight: number }> = [];
  for (const c of candidates) {
    let weight = 1;
    if (archetype) {
      try {
        const arr = JSON.parse(c.jobAffinity ?? "[]");
        if (Array.isArray(arr) && arr.includes(archetype)) weight = 3;
        // Slight push toward weapons over chest/legs so weapons are the
        // signature drop. Ratio chosen by feel, not theory.
        if (c.slot === "weapon") weight *= 1.3;
      } catch { /* ignore malformed affinity */ }
    }
    weighted.push({ id: c.id, name: c.name, weight });
  }
  const total = weighted.reduce((a, w) => a + w.weight, 0);
  let r = Math.random() * total;
  let chosen = weighted[0];
  for (const w of weighted) {
    r -= w.weight;
    if (r <= 0) { chosen = w; break; }
  }

  // Roll affixes for this specific instance.
  const instance: ItemInstance = rollItemInstance({
    baseName: chosen.name,
    enemyLevel,
    seed: `${characterId}-${chosen.id}-${Date.now()}-${Math.random()}`,
  });
  await prisma.inventoryItem.create({
    data: {
      characterId,
      itemId: chosen.id,
      quantity: 1,
      displayName: instance.displayName,
      instanceJson: JSON.stringify(instance),
    },
  });
  return { name: chosen.name, displayName: instance.displayName, tier: instance.tier };
}
