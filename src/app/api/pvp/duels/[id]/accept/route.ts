import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

// MVP: simulate the duel in-place and award the winner. PvP loss has no resource cost.
function simulate(a: any, b: any) {
  const log: string[] = [];
  let ahp = a.maxHp, bhp = b.maxHp;
  let turn = 1;
  while (ahp > 0 && bhp > 0 && turn < 30) {
    const aFirst = (a.spd + Math.random() * 5) >= (b.spd + Math.random() * 5);
    const order = aFirst ? [a, b] : [b, a];
    for (const attacker of order) {
      const defender = attacker === a ? b : a;
      const dmg = Math.max(1, Math.floor(attacker.atk * (1 + Math.random() * 0.4) - defender.def * 0.6));
      if (attacker === a) bhp -= dmg; else ahp -= dmg;
      log.push(`T${turn}: ${attacker.name}の攻撃 → ${defender.name}に${dmg}ダメージ`);
      if (ahp <= 0 || bhp <= 0) break;
    }
    turn++;
  }
  const winner = ahp > bhp ? a : b;
  log.push(`勝者: ${winner.name}`);
  return { winner, log };
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const duel = await prisma.duel.findUnique({
    where: { id: params.id },
    include: { challenger: true, opponent: true },
  });
  if (!duel || duel.status !== "pending") return NextResponse.json({ error: "不正な決闘" }, { status: 400 });
  if (duel.opponentCharacterId !== c.id) return NextResponse.json({ error: "あなた宛てではありません" }, { status: 403 });
  const { winner, log } = simulate(duel.challenger, duel.opponent);
  await prisma.duel.update({
    where: { id: duel.id },
    data: { status: "finished", winnerCharacterId: winner.id, log: JSON.stringify(log), resolvedAt: new Date() },
  });
  return NextResponse.json({ winnerName: winner.name, log });
}
