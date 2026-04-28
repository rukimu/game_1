import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { submitAction } from "@/lib/battle";

const schema = z.object({
  actionType: z.enum(["attack", "skill", "defend"]),
  targetIndex: z.number().int().min(0).max(20).optional(),
  skillId: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
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
}
