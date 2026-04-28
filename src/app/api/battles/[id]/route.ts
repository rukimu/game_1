import { NextResponse } from "next/server";
import { getBattleState } from "@/lib/battle";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const state = await getBattleState(params.id);
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(state);
}
