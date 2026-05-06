import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { quoteForge, runForge } from "@/lib/forge";
import { withGuards } from "@/lib/withGuards";

const schema = z.object({
  inventoryItemId: z.string(),
  mode: z.enum(["reroll", "upgrade"]),
  preview: z.boolean().optional(),
});

// Cycle 57 (Phase 4-b 続): forge は高価値 mutation (素材 5 個 + Gold
// 消費 + 装備 affix 上書き)。withGuards で 認証 + GENERIC_API rate
// limit (10 / 1000ms) + audit を共通化。preview モードは read-only
// なので audit からは action を別名にしたいが、shared schema で簡素化。
export const POST = withGuards<Request>(
  async (req) => {
    const c = await requireActiveCharacter().catch((r) => r);
    if (c instanceof Response) return c;
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
    if (parsed.data.preview) {
      const q = await quoteForge(c.id, parsed.data.inventoryItemId, parsed.data.mode);
      if (!q.ok) return NextResponse.json({ error: q.error }, { status: 400 });
      return NextResponse.json(q);
    }
    const result = await runForge(c.id, parsed.data.inventoryItemId, parsed.data.mode);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  },
  {
    requireAuth: true,
    rateLimit: { preset: "GENERIC_API" },
    audit: { action: "forge", targetType: "inventoryItem" },
  },
);
