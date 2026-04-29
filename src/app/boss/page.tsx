import { redirect } from "next/navigation";
import Link from "next/link";
import Hud from "@/components/Hud";
import { prisma } from "@/lib/prisma";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { getBossOfDay, partyHasClaimedBoss } from "@/lib/boss";
import { jpElementName } from "@/lib/worldstate";
import BossClient from "./Client";

export const dynamic = "force-dynamic";

// Boss-of-the-day landing page. The boss is deterministic per date and
// shared across the whole world. A party can take one shot at it per day;
// after the kill, this page shows the result + first-killer announcement.
export default async function BossPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const boss = await getBossOfDay();
  const partyId = c.partyMembers[0]?.partyId ?? null;
  const claimed = partyId ? await partyHasClaimedBoss(partyId, boss.slug) : false;
  // First-kill announcement (if any).
  const firstKill = await prisma.announcement.findFirst({
    where: { title: { contains: `[本日のボス討伐] ${boss.slug}` } },
    select: { title: true, body: true, createdAt: true },
  });

  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 panel space-y-3">
          <h2 className="text-lg font-bold text-yellow-200">本日のボス</h2>
          <p className="text-xs text-yellow-200/70">
            {boss.date} に世界に現れた強敵。1 パーティーにつき 1 回まで挑戦可。
            倒した最初のパーティーは世界中に名を残し、報酬として希少装備を確実に手にする。
          </p>

          <div className="border-2 border-red-900/60 bg-red-950/15 rounded p-3 space-y-2">
            <div className="flex justify-between items-baseline">
              <div className="text-xl font-bold text-red-200">{boss.name}</div>
              <div className="text-xs text-yellow-200/70">Lv {boss.level}</div>
            </div>
            <div className="text-xs italic text-yellow-100/80">― {boss.flavor}</div>
            <div className="text-xs text-yellow-100/90 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-0.5 pt-1">
              <span>HP <span className="text-yellow-200 tabular-nums">{boss.hp}</span></span>
              <span>攻撃 <span className="text-yellow-200 tabular-nums">{boss.atk}</span></span>
              <span>防御 <span className="text-yellow-200 tabular-nums">{boss.def}</span></span>
              <span>速度 <span className="text-yellow-200 tabular-nums">{boss.spd}</span></span>
              <span>属性 <span className="text-yellow-200">{jpElementName(boss.element as any)}</span></span>
              <span>弱点 <span className="text-yellow-200">{jpElementName(boss.weakness as any)}</span></span>
              <span>報酬EXP <span className="text-yellow-200 tabular-nums">{boss.expReward}</span></span>
              <span>報酬G <span className="text-yellow-200 tabular-nums">{boss.goldReward}</span></span>
            </div>
          </div>

          <BossClient
            canChallenge={!!partyId && !claimed}
            partyId={partyId}
            claimed={claimed}
          />

          {firstKill && (
            <div className="panel bg-amber-950/20 border-amber-700/50">
              <div className="text-xs text-amber-300">★ {firstKill.createdAt.toString().slice(0, 16).replace("T", " ")}</div>
              <div className="text-sm font-bold text-amber-200">{firstKill.title}</div>
              <div className="text-xs text-yellow-200/80">{firstKill.body}</div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Link href="/party" className="btn">パーティー</Link>
            <Link href="/town" className="btn">街に戻る</Link>
          </div>
        </div>
        <div className="space-y-3">
          <div className="panel">
            <div className="text-sm font-bold text-yellow-200 mb-1">攻略のヒント</div>
            <ul className="text-xs text-yellow-200/80 list-disc pl-4 space-y-0.5">
              <li>HP/atk が通常の 3-4 倍。最低 2-3 人パーティー推奨。</li>
              <li>装備とアフィックスがそのまま反映される。<Link href="/inventory" className="underline">/inventory</Link> で見直しを。</li>
              <li>弱点属性を狙うスキルは大幅に効く。</li>
              <li>初討伐パーティーには世界告知 + 確定で希少 / 伝説装備が落ちる。</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
