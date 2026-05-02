import { NextResponse } from "next/server";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { getSiegeBattleView, startSiegeBattle } from "@/lib/siegeBattle";
import { maybeAdvancePhase } from "@/lib/siege";

export const dynamic = "force-dynamic";

// GET /api/siege/[id]/battle — return the live SiegeBattleView.
//
// If the SiegeEvent is in pending phase but its registration window is
// over, maybeAdvancePhase flips it to active. If the battle hasn't been
// created yet AND the siege is active, lazy-create it. This means a
// 1-2s polling client doesn't need a separate "start" trigger.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  await maybeAdvancePhase(params.id);
  let view = await getSiegeBattleView(params.id);
  if (!view) {
    await startSiegeBattle(params.id);
    view = await getSiegeBattleView(params.id);
  }
  if (!view) {
    return NextResponse.json({ error: "siege not in active phase or no registrations" }, { status: 404 });
  }
  return NextResponse.json(view);
}
