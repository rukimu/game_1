import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { quoteForge, runForge } from "@/lib/forge";

const schema = z.object({
  inventoryItemId: z.string(),
  mode: z.enum(["reroll", "upgrade"]),
  preview: z.boolean().optional(),
});

export async function POST(req: Request) {
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
}
