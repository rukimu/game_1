import { NextResponse } from "next/server";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { enterAbyss } from "@/lib/abyss";

export const dynamic = "force-dynamic";

// POST /api/abyss/enter — start (or return) an active AbyssRun for the
// current character. Idempotent: returns the existing run if already in.
export async function POST() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  if (c.level < 50) {
    return NextResponse.json({ error: "奈落は Lv50 から挑戦できる" }, { status: 400 });
  }
  try {
    const run = await enterAbyss(c.id);
    return NextResponse.json({ ok: true, runId: run.id, currentFloor: run.currentFloor });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "enter_failed" }, { status: 400 });
  }
}
