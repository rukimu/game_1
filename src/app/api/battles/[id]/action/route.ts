import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { submitAction } from "@/lib/battle";
import { withGuards } from "@/lib/withGuards";

const schema = z.object({
  actionType: z.enum(["attack", "skill", "defend"]),
  targetIndex: z.number().int().min(0).max(20).optional(),
  skillId: z.string().optional(),
});

// Cycle 57 (Phase 4-b 続): 戦闘アクション送信は最高頻度の mutation。
// withGuards で 認証 + ATTACK_SUBMIT rate limit (3 req / 1000ms) +
// audit を共通化し、不正連打 / bot 攻撃を soft 制限する。
// active character 取得 + battle engine 呼び出しは handler 側に残す
// (channel-specific access logic 同様、業務ロジックなので)。
export const POST = withGuards<Request>(
  async (req, ctx) => {
    const params = ctx.params as { id: string };
    const c = await requireActiveCharacter().catch((r) => r);
    if (c instanceof Response) return c;
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
    try {
      const result = await submitAction({
        battleId: params.id,
        characterId: c.id,
        ...parsed.data,
      });
      return NextResponse.json(result);
    } catch (e: any) {
      return NextResponse.json({ error: e.message ?? "error" }, { status: 400 });
    }
  },
  {
    requireAuth: true,
    rateLimit: { preset: "ATTACK_SUBMIT" },
    audit: { action: "battle_action", targetType: "battle" },
  },
);
