// Season rotation. Lazily evaluated — the same getTodayWorldState()
// pattern: if the current season's natural end has passed (either the
// expectedDurationDays elapsed since startedAt, or 7 days after
// mysterySolvedAt) we close it and create the next.
//
// New seasons get a deterministically-rolled mystery: title, hint,
// keyword pool, and 7 clues with 1 final. The keyword pool is what
// generateRumor and generateNpcDialogue read via getCurrentSeasonKeywords.

import { prisma } from "@/lib/prisma";
import { intBetween, makeRng, pick } from "@/lib/rng";
import { getIO } from "@/lib/socket";

export type SeasonTemplate = {
  name: string;
  mysteryTitle: string;
  mysteryHint: string;
  keywords: string[];
  clues: Array<{ text: string; hint: string; isFinal?: boolean }>;
};

// Future seasons. Each has its own central motif that bleeds into rumors
// and NPC lines via getCurrentSeasonKeywords (which reads season.name).
export const SEASON_TEMPLATES: SeasonTemplate[] = [
  {
    name: "Season 2: 鏡の森",
    mysteryTitle: "鏡の森に映る影",
    mysteryHint: "森の奥に、もう一つの世界を映す泉があるという。映る側はどちらか、誰も知らない。",
    keywords: ["鏡", "森", "影", "泉", "もう一つ", "映る", "対", "境界"],
    clues: [
      { text: "鏡の年と呼ばれるこのシーズン、深い森の中で同じ顔の旅人にすれ違ったという者がいる。", hint: "あなたの顔をした者がいる。" },
      { text: "湖畔の街ミルレの古井戸を覗き込むと、自分が水面で先に手を振っていた。", hint: "どちらが本物か。" },
      { text: "古老が言うには『鏡の森に入った者は、出てきた瞬間に左右が入れ替わっている』。", hint: "戻ってこられるのか。" },
      { text: "霧の街ヴェルナで盗まれた鏡が、別の街の市場で売られていたが、誰も買わなかった。", hint: "鏡には何かが映る。" },
      { text: "司書が記した古い書物の一頁だけが、なぜか裏表が逆だった。", hint: "頁の境界。" },
      { text: "始まりの街アルダの井戸の底で、もう一つの月が浮かんで見えた夜があった。", hint: "井戸はどこまで深い。" },
      { text: "鏡が満月を映す時、対の世界へ通じる扉が一夜だけ開く──と古い詩は告げる。", hint: "全ての手がかりを集めたとき、答えに近づく。", isFinal: true },
    ],
  },
  {
    name: "Season 3: 灰の唄",
    mysteryTitle: "灰の唄を歌う者",
    mysteryHint: "誰のものでもない歌が、夜の森で聞こえることがある。歌い手は灰になって消えるという。",
    keywords: ["灰", "唄", "詩", "夜", "声", "燃え尽きた", "古き節", "祝祭"],
    clues: [
      { text: "灰の年と呼ばれるこのシーズン、村の子供たちが知らないはずの古い節を口ずさんでいる。", hint: "教えた者は誰か。" },
      { text: "湖畔の街ミルレで、毎晩同じ時刻に、誰の声でもない女の歌が湖面から聞こえる。", hint: "歌い手はいる。" },
      { text: "霧の街ヴェルナの吟遊詩人が、知らないはずの旋律を歌って倒れた。歌詞は灰になった。", hint: "灰には何が書いてある。" },
      { text: "歌い終えた者は、必ず灰の塊を残して姿を消すという。", hint: "灰は焼かれた跡か、それとも。" },
      { text: "古い書物に残された楽譜は、五線譜ではなく灰の濃淡で記されていた。", hint: "誰が読めるのか。" },
      { text: "始まりの街アルダの祝祭で歌われる古謡の三番には、灰の唄と同じ旋律があるらしい。", hint: "祝祭は何を祝っていた？" },
      { text: "歌い手はかつて生きていた。歌い継ぐ者がいる限り、歌い手の名は灰の中で生きる──と古い詩は告げる。", hint: "全ての手がかりを集めたとき、答えに近づく。", isFinal: true },
    ],
  },
];

const ROTATE_GRACE_DAYS_AFTER_SOLVE = 7;

// Returns true if the current season has reached its natural end.
function hasSeasonEnded(season: { startedAt: Date; expectedDurationDays: number; mysterySolvedAt: Date | null }): boolean {
  const now = Date.now();
  if (season.expectedDurationDays > 0) {
    const naturalEnd = season.startedAt.getTime() + season.expectedDurationDays * 86400_000;
    if (now >= naturalEnd) return true;
  }
  if (season.mysterySolvedAt) {
    const graceEnd = season.mysterySolvedAt.getTime() + ROTATE_GRACE_DAYS_AFTER_SOLVE * 86400_000;
    if (now >= graceEnd) return true;
  }
  return false;
}

// Lazy season-rotation pass. Called by getTodayWorldState (and other tick
// points). Idempotent — safe to call from many request handlers concurrently.
export async function maybeRotateSeason(): Promise<void> {
  const current = await prisma.season.findFirst({ where: { isCurrent: true } });
  if (!current) return;
  if (!hasSeasonEnded(current)) return;

  // Pick the next template. Round-robin by the count of seasons created so
  // far so deterministic across redeploys.
  const seasonCount = await prisma.season.count();
  const tmpl = SEASON_TEMPLATES[seasonCount % SEASON_TEMPLATES.length];

  await prisma.$transaction([
    prisma.season.update({
      where: { id: current.id },
      data: { isCurrent: false, endedAt: new Date() },
    }),
    prisma.season.create({
      data: {
        name: tmpl.name,
        isCurrent: true,
        rules: JSON.stringify({}),
        mysteryTitle: tmpl.mysteryTitle,
        mysteryHint: tmpl.mysteryHint,
        expectedDurationDays: 30,
        clues: {
          create: tmpl.clues.map((c, idx) => ({
            orderIdx: idx,
            text: c.text,
            hint: c.hint,
            isFinal: !!c.isFinal,
          })),
        },
      },
    }),
  ]);

  try {
    const a = await prisma.announcement.create({
      data: {
        title: `[シーズン更新] ${tmpl.name} が始まった`,
        body: `${current.name} は閉じ、新たなシーズン『${tmpl.mysteryTitle}』が世界を覆い始めた。`,
      },
    });
    getIO()?.emit("system:announcement", a);
  } catch { /* non-fatal */ }
}
