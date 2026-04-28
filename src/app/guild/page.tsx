import Hud from "@/components/Hud";
import Chat from "@/components/Chat";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import GuildClient from "./Client";

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
        </div>
        <div>
          {myGuild && <Chat channel={`guild:${myGuild.id}`} title={`${myGuild.name} ギルドチャット`} />}
        </div>
      </div>
    </main>
  );
}
