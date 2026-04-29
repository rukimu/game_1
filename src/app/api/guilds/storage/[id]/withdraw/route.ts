import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  if (!c.guildMember) return NextResponse.json({ error: "ギルドに所属していません" }, { status: 400 });

  const stored = await prisma.guildStorageItem.findUnique({
    where: { id: params.id },
    include: { item: true },
  });
  if (!stored) return NextResponse.json({ error: "アイテムが見つかりません" }, { status: 404 });
  if (stored.guildId !== c.guildMember.guildId) {
    return NextResponse.json({ error: "別のギルドの倉庫です" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.create({
      data: {
        characterId: c.id,
        itemId: stored.itemId,
        quantity: stored.quantity,
        displayName: stored.displayName,
        instanceJson: stored.instanceJson,
      },
    });
    await tx.guildStorageItem.delete({ where: { id: stored.id } });
    await tx.auditLog.create({
      data: {
        actorType: "user",
        actorId: c.userId,
        action: "guild.storage.withdraw",
        targetType: "guild",
        targetId: c.guildMember!.guildId,
        payload: JSON.stringify({ itemId: stored.itemId, quantity: stored.quantity }),
      },
    });
  });

  return NextResponse.json({ ok: true });
}
