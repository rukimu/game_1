import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveCharacter } from "@/lib/activeCharacter";

const schema = z.object({
  inventoryItemId: z.string(),
  // Consumables/materials can be split. Equipment ignores this and always
  // moves the whole row (since each row carries unique affixes).
  quantity: z.number().int().min(1).max(99).optional(),
});

export async function POST(req: Request) {
  const c = await requireActiveCharacter().catch((r) => r);
  if (c instanceof Response) return c;
  if (!c.guildMember) return NextResponse.json({ error: "ギルドに所属していません" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const inv = await prisma.inventoryItem.findUnique({
    where: { id: parsed.data.inventoryItemId },
    include: { item: true },
  });
  if (!inv || inv.characterId !== c.id) return NextResponse.json({ error: "アイテムが見つかりません" }, { status: 404 });
  if (inv.equipped) return NextResponse.json({ error: "装備中のアイテムは預けられません" }, { status: 400 });
  if (!inv.item.tradable) return NextResponse.json({ error: "預けられないアイテムです" }, { status: 400 });

  const isStackable = inv.item.category !== "equip";
  const moveQty = isStackable ? Math.min(inv.quantity, parsed.data.quantity ?? inv.quantity) : inv.quantity;
  if (moveQty <= 0) return NextResponse.json({ error: "数量が不正です" }, { status: 400 });

  const remaining = inv.quantity - moveQty;

  await prisma.$transaction(async (tx) => {
    if (remaining > 0 && isStackable) {
      await tx.inventoryItem.update({ where: { id: inv.id }, data: { quantity: remaining } });
    } else {
      await tx.inventoryItem.delete({ where: { id: inv.id } });
    }
    await tx.guildStorageItem.create({
      data: {
        guildId: c.guildMember!.guildId,
        itemId: inv.itemId,
        quantity: moveQty,
        displayName: inv.displayName,
        instanceJson: inv.instanceJson,
        depositedByCharacterId: c.id,
      },
    });
    await tx.auditLog.create({
      data: {
        actorType: "user",
        actorId: c.userId,
        action: "guild.storage.deposit",
        targetType: "guild",
        targetId: c.guildMember!.guildId,
        payload: JSON.stringify({ itemId: inv.itemId, quantity: moveQty }),
      },
    });
  });

  return NextResponse.json({ ok: true });
}
