import { NextResponse } from "next/server";
import { listActiveRaids } from "@/lib/raid";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const townId = url.searchParams.get("townId") ?? undefined;
  const raids = await listActiveRaids(townId);
  return NextResponse.json({ raids });
}
