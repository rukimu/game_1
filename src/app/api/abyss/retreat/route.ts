import { NextResponse } from "next/server";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { getActiveAbyssRun, retreatAbyss } from "@/lib/abyss";

export const dynamic = "force-dynamic";

// POST /api/abyss/retreat — bank the accumulated reward and end the run.
// Refuses if a battle is mid-flight.
export async function POST() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const run = await getActiveAbyssRun(c.id);
  if (!run) return NextResponse.json({ error: "no_active_run" }, { status: 400 });
  const result = await retreatAbyss(run.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({
    ok: true,
    floor: result.floor,
    paidGold: result.paidGold,
    paidExp: result.paidExp,
  });
}
