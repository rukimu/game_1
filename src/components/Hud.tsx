import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";

export default async function Hud() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const character = await getActiveCharacter();
  if (!character) redirect("/characters");
  const job = character.currentJobId
    ? await prisma.job.findUnique({ where: { id: character.currentJobId } })
    : null;
  return (
    <div className="panel mb-3">
      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
        <div className="font-bold text-yellow-200">{character.name}</div>
        <div>Lv{character.level}</div>
        <div>{job?.name ?? "—"}{character.isCursed && <span className="text-red-300">[呪]</span>}</div>
        <div>HP {character.hp}/{character.maxHp}</div>
        <div>MP {character.mp}/{character.maxMp}</div>
        <div>G {character.gold}</div>
        <div className="ml-auto flex gap-2">
          <Link href="/town" className="btn">街</Link>
          <Link href="/party" className="btn">PT</Link>
          <Link href="/guild" className="btn">ギルド</Link>
          <Link href="/auction" className="btn">市場</Link>
          <Link href="/shop" className="btn">店</Link>
          <Link href="/pvp" className="btn">闘技</Link>
          <Link href="/jobs" className="btn">転職</Link>
          {character.user.isAdmin && <Link href="/admin" className="btn">管理</Link>}
          <Link href="/characters" className="btn">選択</Link>
        </div>
      </div>
    </div>
  );
}
