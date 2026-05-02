import Hud from "@/components/Hud";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { bonusForGeneration, parseAscensionBonus } from "@/lib/ascension";
import AscensionClient from "./Client";

export const dynamic = "force-dynamic";

export default async function AscensionPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const currentBonus = parseAscensionBonus(c.ascensionBonusJson);
  const nextBonus = bonusForGeneration(c.generation + 1);
  return (
    <main className="space-y-3">
      <Hud />
      <div className="panel space-y-2">
        <div className="text-xs">
          <Link href="/town" className="underline text-yellow-300/80">街に戻る</Link>
        </div>
        <h2 className="text-lg font-bold text-yellow-200">転生 (アセンション)</h2>
        <p className="text-xs text-yellow-100/85">
          Lv50 に到達したキャラクターは「世代を進める」ことができる。
          レベルは 1 にリセットされるが、世代ごとの永久ボーナスが累積する。
          称号・アチーブメントは引き継がれる。
        </p>
      </div>
      <AscensionClient
        characterName={c.name}
        level={c.level}
        isCursed={c.isCursed}
        generation={c.generation}
        currentBonus={currentBonus}
        nextBonus={nextBonus}
      />
    </main>
  );
}
