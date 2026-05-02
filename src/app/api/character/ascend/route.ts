import { NextResponse } from "next/server";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { ascendCharacter } from "@/lib/ascension";

export const dynamic = "force-dynamic";

// POST /api/character/ascend — reset to Lv1 with the current job's base
// stats + cumulative ascension bonus. Refuses if not Lv50 or cursed.
export async function POST() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const result = await ascendCharacter(c.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, generation: result.generation, bonus: result.bonus });
}
