import { NextResponse } from "next/server";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { dismissTutorial } from "@/lib/tutorial";

export async function POST() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  await dismissTutorial(c.id);
  return NextResponse.json({ ok: true });
}
