import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import { LEVEL_CAP, expForLevel } from "@/lib/leveling";

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="w-20 sm:w-28 h-2 bg-black/50 border border-yellow-900/50 rounded overflow-hidden">
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

  return (
    <div className="panel mb-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm">
        <div className="font-bold text-yellow-200">{character.name}</div>
        {character.activeTitle && (
          <div className="text-amber-300 italic">「{character.activeTitle}」</div>
        )}
        <div>Lv{character.level}{isMaxLevel && " (MAX)"}</div>
        <div>{job?.name ?? "—"}{character.isCursed && <span className="text-red-300">[呪]</span>}</div>

        <div className="flex items-center gap-1" title={`HP ${character.hp}/${character.maxHp}`}>
          <span className="text-red-300">HP</span>
          <Bar value={character.hp} max={character.maxHp} color="bg-red-600" />
          <span className="tabular-nums">{character.hp}/{character.maxHp}</span>
        </div>

        <div className="flex items-center gap-1" title={`MP ${character.mp}/${character.maxMp}`}>
          <span className="text-blue-300">MP</span>
          <Bar value={character.mp} max={character.maxMp} color="bg-blue-500" />
          <span className="tabular-nums">{character.mp}/{character.maxMp}</span>
        </div>

        <div
          className="flex items-center gap-1"
          title={
            isMaxLevel
              ? "最大レベルです"
              : `次のレベルまで ${expRemaining} 経験値`
          }
        >
          <span className="text-yellow-300">EXP</span>
          <Bar value={isMaxLevel ? 1 : character.exp} max={isMaxLevel ? 1 : expNeeded} color="bg-yellow-400" />
          <span className="tabular-nums">
            {isMaxLevel ? "MAX" : `${character.exp}/${expNeeded}`}
          </span>
        </div>

        <div title={`所持金 ${character.gold}G`}>G {character.gold}</div>

        <div className="ml-auto flex gap-2 flex-wrap">
          <Link href="/town" className="btn">街</Link>
          <Link href="/inventory" className="btn">所持品</Link>
          <Link href="/forge" className="btn">鍛冶</Link>
          <Link href="/dungeon" className="btn">ダンジョン</Link>
          <Link href="/boss" className="btn">ボス</Link>
          <Link href="/party" className="btn">PT</Link>
          <Link href="/guild" className="btn">ギルド</Link>
          <Link href="/mystery" className="btn">謎</Link>
          <Link href="/auction" className="btn">市場</Link>
          <Link href="/shop" className="btn">店</Link>
          <Link href="/pvp" className="btn">闘技</Link>
          <Link href="/jobs" className="btn">転職</Link>
          <Link href="/curse" className="btn">呪い</Link>
          <Link href="/achievements" className="btn">称号</Link>
          {character.user.isAdmin && <Link href="/admin" className="btn">管理</Link>}
          <Link href="/characters" className="btn">選択</Link>
        </div>
      </div>
      {!isMaxLevel && (
        <div className="text-[10px] sm:text-xs text-yellow-200/60 mt-1">
          次のLv{character.level + 1}まで残り{expRemaining}経験値
        </div>
      )}
    </div>
  );
}
