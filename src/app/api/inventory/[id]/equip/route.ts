import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { equipItem } from "@/lib/equipment";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  const character = await requireActiveCharacter().catch((r) => r);
  if (character instanceof Response) return character;
  const result = await equipItem(character.id, params.id);
  if (!result.ok) return NextResponse.json({ error: result.reason ?? "装備に失敗しました" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
