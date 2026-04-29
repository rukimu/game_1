import Hud from "@/components/Hud";
import Chat from "@/components/Chat";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import GuildClient from "./Client";
import GuildStorageView from "./Storage";

export const dynamic = "force-dynamic";

export default async function GuildPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const myGuild = c.guildMember
    ? await prisma.guild.findUnique({
        where: { id: c.guildMember.guildId },
        include: { members: { include: { character: true } } },
      })
    : null;
  const guilds = await prisma.guild.findMany({ include: { members: true }, orderBy: { createdAt: "desc" }, take: 30 });

  // Storage view data: only loaded when the player is in a guild.
  const storageItems = myGuild
    ? await prisma.guildStorageItem.findMany({
        where: { guildId: myGuild.id },
        include: { item: true },
        orderBy: { depositedAt: "desc" },
      })
    : [];
  const myDepositable = myGuild
    ? await prisma.inventoryItem.findMany({
        where: {
          characterId: c.id,
          equipped: false,
          item: { tradable: true },
        },
        include: { item: true },
        orderBy: { acquiredAt: "desc" },
      })
    : [];

  // Pre-render names for deposited items: prefer instance displayName,
  // otherwise the base item name.
  const storageView = storageItems.map((s) => ({
    id: s.id,
    name: s.displayName ?? s.item.name,
    category: s.item.category,
    rarity: s.item.rarity,
    quantity: s.quantity,
    slot: s.item.slot,
    depositedByCharacterId: s.depositedByCharacterId,
    depositedAt: s.depositedAt.toISOString(),
  }));
  const depositableView = myDepositable.map((inv) => ({
    id: inv.id,
    name: inv.displayName ?? inv.item.name,
    category: inv.item.category,
    rarity: inv.item.rarity,
    quantity: inv.quantity,
    slot: inv.item.slot,
  }));

  // Resolve depositor names (best effort).
  const depositorIds = Array.from(new Set(storageItems.map((s) => s.depositedByCharacterId).filter((x): x is string => !!x)));
  const depositors = depositorIds.length
    ? await prisma.character.findMany({ where: { id: { in: depositorIds } }, select: { id: true, name: true } })
    : [];
  const depositorMap: Record<string, string> = {};
  for (const d of depositors) depositorMap[d.id] = d.name;

  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 panel space-y-3">
          <h2 className="text-lg font-bold text-yellow-200">ギルド</h2>
          <GuildClient
            myGuild={myGuild}
            guilds={guilds.map((g) => ({ id: g.id, name: g.name, description: g.description, memberCount: g.members.length, masterId: g.masterCharacterId }))}
            myCharacterId={c.id}
            myLevel={c.level}
            myGold={c.gold}
          />
          {myGuild && (
            <GuildStorageView
              storage={storageView}
              depositable={depositableView}
              depositorMap={depositorMap}
            />
          )}
        </div>
        <div>
          {myGuild && <Chat channel={`guild:${myGuild.id}`} title={`${myGuild.name} ギルドチャット`} />}
        </div>
      </div>
    </main>
  );
}
