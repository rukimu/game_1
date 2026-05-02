import { NextResponse } from "next/server";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { advanceAbyssFloor, getActiveAbyssRun } from "@/lib/abyss";

export const dynamic = "force-dynamic";

// POST /api/abyss/advance — advance the current run to the next floor.
// Returns the spawned battleId so the client can route to /battle/[id].
export async function POST() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const run = await getActiveAbyssRun(c.id);
  if (!run) return NextResponse.json({ error: "no_active_run" }, { status: 400 });
  try {
    const battle = await advanceAbyssFloor(run.id);
    return NextResponse.json({ ok: true, battleId: battle?.id, floor: run.currentFloor + 1 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "advance_failed" }, { status: 400 });
  }
}
