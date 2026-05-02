import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { submitSiegeAction } from "@/lib/siegeBattle";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["attack", "aoe", "heavy", "support", "rally", "cure"]),
  targetGuildId: z.string().optional(),
});

// POST /api/siege/[id]/battle/action — submit one action for the active turn.
// `id` is the siegeId; we resolve the SiegeBattle row server-side so callers
// don't need to know about it. Errors from submitSiegeAction surface as
// 400 { error } with the engine's explicit code (rally_requires_master,
// already_acted_this_turn, invalid_target, …).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const battle = await prisma.siegeBattle.findUnique({ where: { siegeId: params.id } });
  if (!battle) return NextResponse.json({ error: "battle_not_started" }, { status: 400 });

  const result = await submitSiegeAction(battle.id, c.id, parsed.data.action, parsed.data.targetGuildId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
