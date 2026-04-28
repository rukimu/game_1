import { NextResponse } from "next/server";

const COSMETICS = [
  { code: "slot+1", title: "キャラクター枠+1", price: 500, kind: "slot" },
  { code: "name-change", title: "キャラクター名変更", price: 200, kind: "name" },
  { code: "outfit-noble", title: "貴族風コスメ", price: 300, kind: "outfit" },
  { code: "outfit-pirate", title: "海賊風コスメ", price: 300, kind: "outfit" },
];

export async function GET() {
  return NextResponse.json({ items: COSMETICS });
}
