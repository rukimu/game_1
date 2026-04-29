import { redirect } from "next/navigation";
import Link from "next/link";
import Hud from "@/components/Hud";
import { prisma } from "@/lib/prisma";
import { getActiveCharacter } from "@/lib/activeCharacter";

export const dynamic = "force-dynamic";

// Cursed-souls registry. Lists every character currently bearing a curse so
// other players can find them and form a 3-person cleansing party. Without
// this page, cursed players were invisible — this is the social glue that
// makes "誰かが呪われた → ギルドの一大事" actually surface.
export default async function CursePage() {
  const me = await getActiveCharacter();
  if (!me) redirect("/characters");
  const cursed = await prisma.character.findMany({
    where: { isCursed: true },
    include: {
      partyMembers: { include: { party: { include: { members: { include: { character: true } } } } } },
    },
    orderBy: { name: "asc" },
  });
  // Resolve current job names in one extra query.
  const jobIds = Array.from(new Set(cursed.map((c) => c.currentJobId).filter((j): j is string => !!j)));
  const jobs = jobIds.length > 0
    ? await prisma.job.findMany({ where: { id: { in: jobIds } }, select: { id: true, name: true } })
    : [];
  const jobMap = new Map(jobs.map((j) => [j.id, j.name]));

  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 panel space-y-3">
          <h2 className="text-lg font-bold text-yellow-200">呪われし者の名簿</h2>
          <p className="text-xs text-yellow-200/80">
            呪い職に身を落とした者は、自力で道を戻せない。
            <span className="text-amber-200">解除には同じパーティーに集った 3 人の手が必要</span>。
            協力すれば手に職を取り戻し、世界に再び名が刻まれる。
          </p>
          <p className="text-xs text-yellow-200/60">
            解除手順: <span className="text-yellow-100">/party</span> で対象者を含むパーティーに参加 → <span className="text-yellow-100">/jobs</span> の解除フォームから対象を指定 → 3 人が同様にコールすると解除完了。協力者には報酬 200G が支払われる。
          </p>

          {cursed.length === 0 ? (
            <div className="panel bg-black/40 border-yellow-900/40">
              <div className="text-yellow-200/50 text-sm italic">今、呪われている者はいない。</div>
            </div>
          ) : (
            <ul className="space-y-2">
              {cursed.map((cu) => {
                const partyId = cu.partyMembers[0]?.partyId;
                const party = cu.partyMembers[0]?.party ?? null;
                const members = party?.members ?? [];
                const sharedParty = members.some((m) => m.characterId === me.id);
                return (
                  <li key={cu.id} className="border border-red-900/50 bg-red-950/20 rounded p-3 space-y-1">
                    <div className="flex justify-between items-baseline gap-2">
                      <div>
                        <span className="font-bold text-red-200">{cu.name}</span>
                        <span className="text-xs text-yellow-200/70 ml-2">Lv{cu.level}</span>
                        <span className="text-xs text-yellow-200/70 ml-2">{cu.currentJobId ? jobMap.get(cu.currentJobId) ?? "—" : "—"}</span>
                      </div>
                      {cu.id === me.id && <span className="text-xs text-amber-200">あなた自身</span>}
                    </div>
                    {cu.bio && <div className="text-xs text-yellow-200/70 italic">「{cu.bio}」</div>}
                    {party ? (
                      <div className="text-xs text-yellow-100/80">
                        所属パーティー: <span className="text-yellow-200">{party.name}</span>
                        ・メンバー {members.length} 人
                        {sharedParty && <span className="text-green-300 ml-2">[同行中]</span>}
                      </div>
                    ) : (
                      <div className="text-xs text-yellow-200/60">パーティー未所属。話しかけてみるべき。</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex gap-2 pt-2">
            <Link href="/party" className="btn">パーティー</Link>
            <Link href="/jobs" className="btn">転職施設</Link>
            <Link href="/town" className="btn">街に戻る</Link>
          </div>
        </div>
        <div className="space-y-3">
          <div className="panel">
            <div className="text-sm font-bold text-yellow-200 mb-1">呪い職とは</div>
            <p className="text-xs text-yellow-200/80">
              強大な力と引き換えに、自力では他職に転職できない。一度就いたら、世界の他者の手を借りるしかない。
              そのぶん攻撃面で常識外の数値を持つことが多い。覚悟があるか、本当に詰むか、入口の前で見極めること。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
