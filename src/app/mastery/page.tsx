import Hud from "@/components/Hud";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { prisma } from "@/lib/prisma";
import { listMasteryQuests, masteryDefsFor } from "@/lib/mastery";
import { ARCHETYPE_LABEL_JP } from "@/lib/itemGen";

export const dynamic = "force-dynamic";

const GOAL_LABEL: Record<string, string> = {
  defeat_enemy: "敵討伐",
  win_battles: "勝利数",
  use_skill_count: "スキル詠唱",
  clear_themed_dungeon: "専用ダンジョン踏破",
  explore_towns: "街巡り",
};

export default async function MasteryPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const job = c.currentJobId
    ? await prisma.job.findUnique({ where: { id: c.currentJobId }, select: { category: true, name: true } })
    : null;
  const archetype = job?.category ?? null;
  const quests = await listMasteryQuests(c.id);
  const defs = archetype ? masteryDefsFor(archetype) : [];

  // Map quests by tier so we can render alongside locked tiers.
  const questByTier = new Map(quests.filter((q) => q.jobCategory === archetype).map((q) => [q.tier, q]));

  return (
    <main>
      <Hud />
      <div className="panel space-y-3">
        <h2 className="text-lg font-bold text-yellow-200">修練クエスト</h2>
        <p className="text-xs text-yellow-200/80">
          現在の職業に応じた長期的な修練。クリアごとに <span className="text-amber-200">永続ステ強化</span> + <span className="text-amber-200">専用称号</span> が手に入る。
          {archetype && <> 現在の適性: <span className="text-yellow-100">{job?.name}（{ARCHETYPE_LABEL_JP[archetype] ?? archetype}）</span></>}
        </p>

        {!archetype ? (
          <div className="text-yellow-200/70 text-sm">職業未設定。/characters から再選択してください。</div>
        ) : defs.length === 0 ? (
          <div className="text-yellow-200/70 text-sm">この職業カテゴリの修練クエストは未定義です。</div>
        ) : (
          <ol className="space-y-2">
            {defs.map((def) => {
              const q = questByTier.get(def.tier);
              const unlocked = c.level >= def.unlockLevel;
              const completed = !!q?.completedAt;
              const pct = q ? Math.min(100, Math.floor((q.progress / def.goalCount) * 100)) : 0;
              return (
                <li
                  key={def.tier}
                  className={`border rounded p-3 ${
                    completed
                      ? "border-green-700/60 bg-green-950/15"
                      : unlocked
                        ? def.tier === 3
                          ? "border-amber-700/60 bg-amber-950/15"
                          : "border-yellow-900/40 bg-black/30"
                        : "border-yellow-900/40 bg-black/20 opacity-60"
                  }`}
                >
                  <div className="flex justify-between items-baseline">
                    <div className="text-sm font-bold text-yellow-100">
                      {def.title}
                      <span className="text-[10px] text-yellow-200/70 ml-2">[Lv{def.unlockLevel}〜]</span>
                    </div>
                    {completed ? (
                      <span className="text-xs text-green-300">★ 達成済</span>
                    ) : unlocked ? (
                      <span className="text-xs text-yellow-300/80">進行中 {q?.progress ?? 0}/{def.goalCount}</span>
                    ) : (
                      <span className="text-xs text-yellow-200/50">🔒 Lv{def.unlockLevel}で開放</span>
                    )}
                  </div>
                  <div className="text-xs text-yellow-100/80 mt-1">{def.description}</div>
                  <div className="text-[10px] text-yellow-200/70 mt-1">
                    目的: {GOAL_LABEL[def.goalType] ?? def.goalType}
                    {def.goalParam && ` (${def.goalParam})`} ×{def.goalCount}
                  </div>
                  {unlocked && !completed && q && (
                    <div className="mt-1 h-1 bg-black/50 border border-yellow-900/40 rounded overflow-hidden">
                      <div className="h-full bg-yellow-500" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <div className="text-[10px] text-yellow-300/80 mt-1 flex flex-wrap gap-x-3">
                    <span>EXP +{def.rewardExp}</span>
                    <span>G +{def.rewardGold}</span>
                    {def.rewardStat && <span>永続 {def.rewardStat}</span>}
                    {def.rewardTitleSlug && <span>称号「{def.rewardTitleSlug}」</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="flex gap-2 pt-2">
          <Link href="/jobs" className="btn">転職</Link>
          <Link href="/town" className="btn">街に戻る</Link>
        </div>
      </div>
    </main>
  );
}
