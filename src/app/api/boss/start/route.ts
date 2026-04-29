import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { getBossOfDay, partyHasClaimedBoss } from "@/lib/boss";
import { startBattleForParty } from "@/lib/battle";

// POST /api/boss/start — challenges today's boss with the active character's
// party. Boss runs in the same battle engine but with kind="boss" and
// pre-boosted stats. One win per party per day; further attempts return 409.
export async function POST() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const partyId = c.partyMembers[0]?.partyId;
  if (!partyId) {
    return NextResponse.json({ error: "ボス挑戦にはパーティーが必要です。/party から作成・参加してください。" }, { status: 400 });
  }
  const boss = await getBossOfDay();
  if (await partyHasClaimedBoss(partyId, boss.slug)) {
    return NextResponse.json({ error: "このパーティーは本日のボスを既に討伐しています。" }, { status: 409 });
  }
  // Check no other active battle for this party.
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
    },
  });
  return NextResponse.json({ battleId, boss });
}
