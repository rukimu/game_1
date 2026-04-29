import { NextResponse } from "next/server";
import { requireActiveCharacter } from "@/lib/activeCharacter";
import { listDmThreads, countUnreadDms } from "@/lib/dm";

export async function GET() {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const threads = await listDmThreads(c.id);
  const unreadTotal = await countUnreadDms(c.id);
  return NextResponse.json({ threads, unreadTotal });
}
