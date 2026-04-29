import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { getEquipmentBonuses } from "@/lib/equipment";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const inv = await prisma.inventoryItem.findFirst({
    where: { id: params.id, characterId: c.id },
    include: { item: true },
  });
  if (!inv) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (inv.item.category !== "consumable") {
    return NextResponse.json({ error: "使用できないアイテムです" }, { status: 400 });
  }
  if (inv.quantity <= 0) return NextResponse.json({ error: "数量が足りません" }, { status: 400 });

  // Block use while in an active battle to keep MVP simple.
  const inBattle = await prisma.battleParticipant.findFirst({
    where: { characterId: c.id, alive: true, battle: { status: "active" } },
  });
  if (inBattle) return NextResponse.json({ error: "戦闘中は使用できません" }, { status: 400 });

  const bonuses = await getEquipmentBonuses(c.id);
  const effectiveMaxHp = c.maxHp + bonuses.hp;
  const effectiveMaxMp = c.maxMp + bonuses.mp;
  const healHp = inv.item.hpBonus;
  const healMp = inv.item.mpBonus;
  if (healHp <= 0 && healMp <= 0) {
    return NextResponse.json({ error: "効果のないアイテムです" }, { status: 400 });
  }

  const newHp = Math.min(effectiveMaxHp, c.hp + healHp);
  const newMp = Math.min(effectiveMaxMp, c.mp + healMp);

  await prisma.$transaction([
    prisma.character.update({
      where: { id: c.id },
      data: { hp: newHp, mp: newMp },
    }),
    inv.quantity > 1
      ? prisma.inventoryItem.update({ where: { id: inv.id }, data: { quantity: inv.quantity - 1 } })
      : prisma.inventoryItem.delete({ where: { id: inv.id } }),
  ]);

  return NextResponse.json({
    ok: true,
    healedHp: newHp - c.hp,
    healedMp: newMp - c.mp,
    hp: newHp,
    mp: newMp,
  });
}
