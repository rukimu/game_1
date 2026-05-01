import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { setInheritedSkills } from "@/lib/skillInherit";

export const dynamic = "force-dynamic";

const schema = z.object({
  skillIds: z.array(z.string()).max(8),
});

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  try {
    await setInheritedSkills(c.id, parsed.data.skillIds);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "inherit_failed" }, { status: 400 });
  }
}
