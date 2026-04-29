import { NextResponse } from "next/server";
import { getRaidView, finalizeRaidIfDue } from "@/lib/raid";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // Lazy lifecycle advance — surfaces "expired" raids without a separate cron.
  await finalizeRaidIfDue(params.id);
  const view = await getRaidView(params.id);
  if (!view) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(view);
}
