import { NextResponse } from "next/server";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { getCharacterMystery } from "@/lib/mystery";

export async function GET() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const m = await getCharacterMystery(c.id);
  if (!m) return NextResponse.json({ error: "no season" }, { status: 404 });
  return NextResponse.json(m);
}
