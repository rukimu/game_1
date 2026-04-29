import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { startBattleForParty } from "@/lib/battle";
import {
  getWeeklyBoss,
  partyHasClaimedWeeklyBoss,
  partyTierUnlocked,
  type WeeklyBossTier,
} from "@/lib/weeklyBoss";

const schema = z.object({ tier: z.union([z.literal(1), z.literal(2), z.literal(3)]) });

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "ティアの指定が不正です" }, { status: 400 });
  const tier = parsed.data.tier as WeeklyBossTier;

  const partyId = c.partyMembers[0]?.partyId;
  if (!partyId) {
    return NextResponse.json({ error: "週末ボス挑戦にはパーティーが必要です。/party から作成・参加してください。" }, { status: 400 });
  }

  const boss = getWeeklyBoss(tier);
  if (!(await partyTierUnlocked(partyId, tier))) {
    return NextResponse.json({ error: `T${tier} は前ティアの討伐後に挑戦可能です` }, { status: 400 });
  }
  if (await partyHasClaimedWeeklyBoss(partyId, boss.slug)) {
    return NextResponse.json({ error: "このパーティーは今週のこのティアを既に討伐しています" }, { status: 409 });
  }
  const active = await prisma.battle.findFirst({
    where: { partyId, status: "active" },
    select: { id: true },
  });
  if (active) {
    return NextResponse.json({ error: "進行中の戦闘があります。終了してから挑んでください。" }, { status: 409 });
  }

  const battleId = await startBattleForParty(partyId, {
    boss: {
      slug: boss.slug,
      name: boss.name,
      level: boss.level,
      hp: boss.hp,
      atk: boss.atk,
      def: boss.def,
      spd: boss.spd,
      element: boss.element,
      weakness: boss.weakness,
      expReward: boss.expReward,
      goldReward: boss.goldReward,
      creatureType: boss.creatureType,
      kind: "boss_weekly",
      tier: boss.tier,
    },
  });
  return NextResponse.json({ battleId, boss });
}
