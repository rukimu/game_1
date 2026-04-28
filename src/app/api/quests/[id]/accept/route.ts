import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  const quest = await prisma.quest.findUnique({ where: { id: params.id } });
  if (!quest) return NextResponse.json({ error: "no quest" }, { status: 404 });
  const existing = await prisma.characterQuest.findUnique({
    where: { characterId_questId: { characterId: c.id, questId: quest.id } },
  });
  if (existing) return NextResponse.json({ error: "既に受注済みです" }, { status: 400 });
  const cq = await prisma.characterQuest.create({
    data: { characterId: c.id, questId: quest.id },
  });
  // If the request looks like a form submit, redirect back; otherwise return JSON.
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    return NextResponse.redirect(new URL("/town", req.url), { status: 303 });
  }
  return NextResponse.json({ characterQuest: cq });
}
