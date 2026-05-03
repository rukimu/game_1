// Cycle 37: thin wrapper over the AuditLog model. Sensitive write
// paths (battle resolve, trade complete, auction settle, equip change,
// ascend, forge) call recordAudit so post-mortems and abuse
// investigations have a paper trail.
//
// Soft non-blocking: errors are swallowed (best-effort). Adding the
// hook should never bring down the action it's auditing.

import { prisma } from "@/lib/prisma";

export type AuditEntry = {
  actorType: "user" | "system" | "admin";
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  payload?: Record<string, unknown>;
};

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        payload: JSON.stringify(entry.payload ?? {}),
      },
    });
  } catch { /* non-fatal — audit must never block the user's action */ }
}

// Convenience wrappers for common hooks.
export async function auditBattleEnd(characterId: string, battleId: string, result: "win" | "lose") {
  await recordAudit({
    actorType: "user",
    actorId: characterId,
    action: "battle_end",
    targetType: "battle",
    targetId: battleId,
    payload: { result },
  });
}

export async function auditTrade(characterAId: string, characterBId: string, tradeId: string) {
  await recordAudit({
    actorType: "user",
    actorId: characterAId,
    action: "trade_complete",
    targetType: "trade",
    targetId: tradeId,
    payload: { partner: characterBId },
  });
}

export async function auditEquip(characterId: string, inventoryItemId: string, equipped: boolean) {
  await recordAudit({
    actorType: "user",
    actorId: characterId,
    action: equipped ? "equip" : "unequip",
    targetType: "inventoryItem",
    targetId: inventoryItemId,
  });
}

export async function auditAscend(characterId: string, generation: number) {
  await recordAudit({
    actorType: "user",
    actorId: characterId,
    action: "ascend",
    targetType: "character",
    targetId: characterId,
    payload: { generation },
  });
}
