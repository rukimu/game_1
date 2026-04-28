import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const character = await requireActiveCharacter().catch((r) => r);
  if (character instanceof Response) return character;
  const town = await prisma.town.findUnique({ where: { id: params.id } });
  if (!town) return NextResponse.json({ error: "no town" }, { status: 404 });
  if (character.gold < town.innFee) return NextResponse.json({ error: "ゴールドが足りません" }, { status: 400 });
  const updated = await prisma.character.update({
    where: { id: character.id },
    data: { gold: character.gold - town.innFee, hp: character.maxHp, mp: character.maxMp, currentTownId: town.id },
  });
  return NextResponse.json({ character: updated });
}
