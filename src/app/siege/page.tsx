import { redirect } from "next/navigation";
import Link from "next/link";
import Hud from "@/components/Hud";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { getSiegeViewForAllCastles } from "@/lib/siege";
import SiegeClient from "./Client";

export const dynamic = "force-dynamic";

export default async function SiegePage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const sieges = await getSiegeViewForAllCastles();
  const myGuildMember = c.guildMember;
  const myRole = myGuildMember?.role ?? null;
  const myGuildId = myGuildMember?.guildId ?? null;

  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 panel space-y-3">
          <h2 className="text-lg font-bold text-yellow-200">攻城戦</h2>
          <p className="text-xs text-yellow-200/80">
            各城には常に 1 つ攻城戦が走っている。最初の 24 時間は登録期間 (ギルドマスター・サブのみ登録可)、
            続く 3 時間が戦闘期間で自動決着。各ギルドのスコアはメンバー Lv と決闘勝利数で決まる。
            最終的に最高スコアのギルドが城の主となり、世界に告知される。
          </p>
          <SiegeClient
            sieges={sieges.map((s) => ({
              id: s.id,
              castleName: s.castleName,
              region: s.region,
              status: s.status,
              startsAt: s.startsAt.toISOString().slice(0, 16).replace("T", " "),
              endsAt: s.endsAt ? s.endsAt.toISOString().slice(0, 16).replace("T", " ") : null,
              registrations: s.registrations,
              winningGuildName: s.winningGuildName,
              currentOwnerName: s.currentOwnerName,
              battleLog: s.battleLog,
              myGuildRegistered: !!myGuildId && s.registrations.some((r) => r.guildId === myGuildId),
              canRegister: s.status === "pending" && (myRole === "master" || myRole === "sub"),
            }))}
          />
          <div className="pt-2">
            <Link href="/town" className="btn">街に戻る</Link>
          </div>
        </div>
        <div className="space-y-3">
          <div className="panel">
            <div className="text-sm font-bold text-yellow-200 mb-1">城を持つ意味</div>
            <ul className="text-xs text-yellow-200/80 list-disc pl-4 space-y-0.5">
              <li>世界全体への告知 (ギルドの名が刻まれる)</li>
              <li>関連街への影響 (今後追加予定)</li>
              <li>専用クエスト・ショップ (今後追加予定)</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
