import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { previewForge } from "@/lib/forge";

const schema = z.object({
  inventoryItemId: z.string(),
  mode: z.enum(["reroll", "upgrade"]),
});

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const result = await previewForge(c.id, parsed.data.inventoryItemId, parsed.data.mode);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "preview failed" }, { status: 400 });
  return NextResponse.json(result);
}
