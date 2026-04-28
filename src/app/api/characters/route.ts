import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { applyJobBaseStats } from "@/lib/leveling";
import { sanitizeName } from "@/lib/sanitize";

const schema = z.object({
  name: z.string().min(2).max(24),
  jobName: z.string().min(1).max(40),
});

export async function GET() {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  const characters = await prisma.character.findMany({
    where: { userId: user.id },
    include: { jobHistory: { include: { job: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ characters, slots: user.characterSlots });
}

export async function POST(req: Request) {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  const name = sanitizeName(parsed.data.name);
  if (!name) return NextResponse.json({ error: "名前が不正です" }, { status: 400 });
  const dup = await prisma.character.findUnique({ where: { name } });
  if (dup) return NextResponse.json({ error: "その名前は既に使われています" }, { status: 400 });
  const count = await prisma.character.count({ where: { userId: user.id } });
  if (count >= user.characterSlots) return NextResponse.json({ error: "キャラクター枠が一杯です" }, { status: 400 });
  const job = await prisma.job.findUnique({ where: { name: parsed.data.jobName } });
  if (!job) return NextResponse.json({ error: "職業が見つかりません" }, { status: 400 });
  const base = applyJobBaseStats(JSON.parse(job.baseStats));
  const town = await prisma.town.findFirst({ orderBy: { danger: "asc" } });
  const character = await prisma.character.create({
    data: {
      userId: user.id,
      name,
      ...base,
      currentJobId: job.id,
      currentTownId: town?.id,
      jobHistory: { create: [{ jobId: job.id }] },
      jobMastery: { create: [{ jobId: job.id, mastery: 0 }] },
    },
  });
  // grant starter equipment
  const starter = await prisma.item.findFirst({ where: { name: "薬草" } });
  if (starter) {
    await prisma.inventoryItem.create({ data: { characterId: character.id, itemId: starter.id, quantity: 5 } });
  }
  return NextResponse.json({ character });
}
