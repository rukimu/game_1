import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import { LEVEL_CAP, expForLevel } from "@/lib/leveling";
import { countUnreadDms } from "@/lib/dm";
import HudMenu from "@/components/HudMenu";
import GameIcon from "@/components/GameIcon";
import IconsToggle from "@/components/IconsToggle";

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

  // Cycle 41-3: 「次の解放」予告。街の段階開放と機能ゲートをまとめて
  // 1 行で見せ、Day1 ユーザーに「あと少しで○○が来る」期待感を与える。
  const nextLockedTown = await prisma.town.findFirst({
    where: { unlockLevel: { gt: character.level } },
    orderBy: { unlockLevel: "asc" },
    select: { name: true, unlockLevel: true },
  });
  // HudMenu の unlock 条件と同期させた機能解放表。少ない方を取って
  // 「次のレベルで街と機能どちらが先に開くか」を表示する。
  const NEXT_FEATURE_GATES: Array<{ level: number; label: string }> = [
    { level: 3, label: "店 / ダンジョン" },
    { level: 4, label: "DM / 謎の手がかり" },
    { level: 5, label: "鍛冶 / 称号" },
    { level: 10, label: "転職 / 呪い" },
  ];
  const nextFeatureGate = NEXT_FEATURE_GATES.find((g) => g.level > character.level);

  return (
    <div className="panel mb-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm">
        <div className="font-bold text-yellow-200">{character.name}</div>
        {character.activeTitle && (
          <div className="text-amber-300 italic">「{character.activeTitle}」</div>
        )}
        <div>Lv{character.level}{isMaxLevel && " (MAX)"}</div>
        <div className="flex items-center gap-1">
          {job?.category && <GameIcon slug={`job:${job.category}`} size={14} alt={job.category} />}
          <span>{job?.name ?? "—"}</span>
          {job?.curated && (
            <span className="ml-1 text-purple-300 text-[10px]" title={job.quirk ? `癖: ${job.quirk}` : ""}>★固有</span>
          )}
          {character.isCursed && <span className="text-red-300">[呪]</span>}
        </div>
        {job?.curated && job.signatureOutfit && (
          <div className="text-purple-200/80 italic text-[10px] w-full sm:w-auto">《{job.signatureOutfit}》</div>
        )}

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
      <div className="flex justify-between items-center mt-1 flex-wrap gap-y-1">
        {!isMaxLevel ? (
          <div className="text-[10px] sm:text-xs text-yellow-200/60">
            次のLv{character.level + 1}まで残り{expRemaining}経験値
          </div>
        ) : <span />}
        <IconsToggle />
      </div>
      {(nextLockedTown || nextFeatureGate) && (
        <div className="mt-1 text-[10px] sm:text-xs text-yellow-200/60 flex flex-wrap gap-x-3 gap-y-0.5">
          {nextLockedTown && (
            <span>🔒 Lv{nextLockedTown.unlockLevel}: {nextLockedTown.name}</span>
          )}
          {nextFeatureGate && (
            <span>🔓 Lv{nextFeatureGate.level}: {nextFeatureGate.label}</span>
          )}
        </div>
      )}
    </div>
  );
}
