import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import { LEVEL_CAP, expForLevel } from "@/lib/leveling";
import { countUnreadDms } from "@/lib/dm";
import HudMenu from "@/components/HudMenu";

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    // On <sm screens the bar grows to fill the row so each stat reads cleanly.
    // On >=sm we keep a fixed width so the inline HUD stays compact.
    <div className="flex-1 sm:flex-none w-auto sm:w-28 h-2 bg-black/50 border border-yellow-900/50 rounded overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function Hud() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const character = await getActiveCharacter();
  if (!character) redirect("/characters");
  const job = character.currentJobId
    ? await prisma.job.findUnique({ where: { id: character.currentJobId } })
    : null;
  const isMaxLevel = character.level >= LEVEL_CAP;
  const expNeeded = isMaxLevel ? 0 : expForLevel(character.level);
  const expRemaining = Math.max(0, expNeeded - character.exp);
  const unreadDms = await countUnreadDms(character.id);

  return (
    <div className="panel mb-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm">
        <div className="font-bold text-yellow-200">{character.name}</div>
        {character.activeTitle && (
          <div className="text-amber-300 italic">「{character.activeTitle}」</div>
        )}
        <div>Lv{character.level}{isMaxLevel && " (MAX)"}</div>
        <div>{job?.name ?? "—"}{character.isCursed && <span className="text-red-300">[呪]</span>}</div>

        <div className="flex items-center gap-1 w-full sm:w-auto" title={`HP ${character.hp}/${character.maxHp}`}>
          <span className="text-red-300 w-8 sm:w-auto">HP</span>
          <Bar value={character.hp} max={character.maxHp} color="bg-red-600" />
          <span className="tabular-nums w-20 sm:w-auto text-right sm:text-left">{character.hp}/{character.maxHp}</span>
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto" title={`MP ${character.mp}/${character.maxMp}`}>
          <span className="text-blue-300 w-8 sm:w-auto">MP</span>
          <Bar value={character.mp} max={character.maxMp} color="bg-blue-500" />
          <span className="tabular-nums w-20 sm:w-auto text-right sm:text-left">{character.mp}/{character.maxMp}</span>
        </div>

        <div
          className="flex items-center gap-1 w-full sm:w-auto"
          title={
            isMaxLevel
              ? "最大レベルです"
              : `次のレベルまで ${expRemaining} 経験値`
          }
        >
          <span className="text-yellow-300 w-8 sm:w-auto">EXP</span>
          <Bar value={isMaxLevel ? 1 : character.exp} max={isMaxLevel ? 1 : expNeeded} color="bg-yellow-400" />
          <span className="tabular-nums w-20 sm:w-auto text-right sm:text-left">
            {isMaxLevel ? "MAX" : `${character.exp}/${expNeeded}`}
          </span>
        </div>

        <div title={`所持金 ${character.gold}G`}>G {character.gold}</div>

        <HudMenu
          isAdmin={!!character.user.isAdmin}
          unreadDms={unreadDms}
          level={character.level}
          inGuild={!!character.guildMember}
        />
      </div>
      {!isMaxLevel && (
        <div className="text-[10px] sm:text-xs text-yellow-200/60 mt-1">
          次のLv{character.level + 1}まで残り{expRemaining}経験値
        </div>
      )}
    </div>
  );
}
