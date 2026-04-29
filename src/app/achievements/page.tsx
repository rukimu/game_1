import { redirect } from "next/navigation";
import Link from "next/link";
import Hud from "@/components/Hud";
import { getActiveCharacter } from "@/lib/activeCharacter";
import { getCharacterAchievements } from "@/lib/achievements";
import AchievementsClient from "./Client";

export const dynamic = "force-dynamic";

const RARITY_LABEL: Record<string, string> = {
  common: "並", rare: "良質", epic: "希少", legendary: "伝説", mythic: "神話",
};
const RARITY_CLASS: Record<string, string> = {
  common: "text-yellow-100/80",
  rare: "text-blue-300",
  epic: "text-purple-300",
  legendary: "text-orange-300",
  mythic: "text-pink-300",
};

export default async function AchievementsPage() {
  const c = await getActiveCharacter();
  if (!c) redirect("/characters");
  const items = await getCharacterAchievements(c.id);
  const earnedCount = items.filter((i) => i.earned).length;
  const titleOptions = items
    .filter((i) => i.earned && i.titleSlug)
    .map((i) => ({ slug: i.titleSlug!, title: i.title, rarity: i.rarity }));

  return (
    <main>
      <Hud />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 panel space-y-3">
          <h2 className="text-lg font-bold text-yellow-200">アチーブメント</h2>
          <div className="text-xs text-yellow-200/80">
            獲得 {earnedCount} / {items.length} 種
          </div>
          <ul className="space-y-1.5">
            {items.map((a) => (
              <li
                key={a.id}
                className={`border rounded p-2 ${a.earned ? "border-yellow-700/60 bg-black/40" : "border-yellow-900/30 bg-black/20 opacity-60"}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className={`font-bold ${a.earned ? RARITY_CLASS[a.rarity] : "text-yellow-200/60"}`}>
                      {a.title}
                      <span className="ml-2 text-xs text-yellow-200/60">
                        [{RARITY_LABEL[a.rarity] ?? a.rarity}]
                      </span>
                    </div>
                    <div className="text-xs text-yellow-100/70">{a.description}</div>
                    {a.titleSlug && a.earned && (
                      <div className="text-xs text-amber-200 mt-1">称号: {a.titleSlug}</div>
                    )}
                  </div>
                  <div className="text-xs text-yellow-200/60 whitespace-nowrap">
                    {a.earned
                      ? `獲得 ${a.earnedAt!.toString().slice(0, 10)}`
                      : "未獲得"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <Link href="/town" className="btn">街に戻る</Link>
          </div>
        </div>
        <div className="space-y-3">
          <div className="panel">
            <div className="text-sm font-bold text-yellow-200 mb-2">称号 (HUD 表示)</div>
            <AchievementsClient
              currentTitle={c.activeTitle ?? null}
              options={titleOptions}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
