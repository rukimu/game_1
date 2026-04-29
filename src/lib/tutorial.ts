// Lightweight tutorial helper. The tutorial is a single context-aware hint
// box on the town page that adapts to what the new character has and hasn't
// done yet. We track only two pieces of state on the character: whether the
// player has dismissed it, and which step they last saw.

import { prisma } from "@/lib/prisma";

export type TutorialState = { dismissed: boolean; step: number };

export const TUTORIAL_DEFAULT: TutorialState = { dismissed: false, step: 0 };

export function parseTutorial(json: string | null | undefined): TutorialState {
  if (!json) return TUTORIAL_DEFAULT;
  try {
    const obj = JSON.parse(json);
    return {
      dismissed: !!obj.dismissed,
      step: typeof obj.step === "number" ? obj.step : 0,
    };
  } catch {
    return TUTORIAL_DEFAULT;
  }
}

export type TutorialHint = {
  step: number;
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
};

// Decide which hint to show, given a character snapshot. Returns null when
// the tutorial is dismissed or the player has finished all introductory
// objectives.
export async function pickTutorialHint(characterId: string): Promise<TutorialHint | null> {
  const c = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      tutorialState: true,
      level: true,
      gold: true,
      currentTownId: true,
    },
  });
  if (!c) return null;
  const t = parseTutorial(c.tutorialState);
  if (t.dismissed) return null;

  // Step 0: brand new — explain the loop.
  if (c.level <= 1) {
    return {
      step: 0,
      title: "ようこそ。最初の冒険へ",
      body: "酒場でクエストを掲示し、戦いに出て敵を倒し、装備を見直す。これが基本のループ。",
      actionLabel: "戦いに出る",
      actionHref: "/battle",
    };
  }

  // Did they ever win a battle? Detect via first_blood achievement existence.
  const firstBlood = await prisma.characterAchievement.findFirst({
    where: { characterId, achievement: { slug: "first_blood" } },
    select: { id: true },
  });
  if (!firstBlood) {
    return {
      step: 1,
      title: "戦闘を試そう",
      body: "「戦いに出る」から最初の戦闘を行う。倒すと経験値・ゴールド・装備が手に入る。",
      actionLabel: "戦いに出る",
      actionHref: "/battle",
    };
  }

  // Has any equip drop ever happened? Look for inventory equip rows.
  const anyDrop = await prisma.inventoryItem.count({
    where: { characterId, item: { category: "equip" }, displayName: { not: null } },
  });
  if (anyDrop === 0) {
    return {
      step: 2,
      title: "戦利品の最初の手触り",
      body: "敵を倒すと低確率で『古びた剣』のような装備が落ちる。装備のティアと特殊効果は個体ごとに違う。",
      actionLabel: "もう一戦",
      actionHref: "/battle",
    };
  }

  // Has the player visited /inventory once?
  if (c.level >= 2 && t.step < 3) {
    return {
      step: 3,
      title: "装備を整えよう",
      body: "/inventory で装備を見直す。職業適性が合っていない武器は効果半減。",
      actionLabel: "所持品を見る",
      actionHref: "/inventory",
    };
  }

  // Has the player joined a party?
  const inParty = await prisma.partyMember.findFirst({
    where: { characterId },
    select: { id: true },
  });
  if (!inParty && c.level >= 3) {
    return {
      step: 4,
      title: "仲間と組むと世界が広がる",
      body: "パーティーは最大 10 人。呪い解除・ボス挑戦・連戦の楽しみは協力プレイから。",
      actionLabel: "パーティー画面",
      actionHref: "/party",
    };
  }

  // Has the player encountered today's mystery + boss content?
  if (c.level >= 4 && t.step < 5) {
    return {
      step: 5,
      title: "世界の謎と本日のボス",
      body: "/mystery でシーズンの謎の進捗、/boss で本日のボスを確認できる。最初の解明者・最初の討伐者は世界に名を残す。",
      actionLabel: "今日の世界へ",
      actionHref: "/boss",
    };
  }

  return null;
}

export async function advanceTutorial(characterId: string, step: number): Promise<void> {
  const current = await prisma.character.findUnique({
    where: { id: characterId },
    select: { tutorialState: true },
  });
  const t = parseTutorial(current?.tutorialState);
  const next: TutorialState = { dismissed: t.dismissed, step: Math.max(t.step, step) };
  await prisma.character.update({
    where: { id: characterId },
    data: { tutorialState: JSON.stringify(next) },
  });
}

export async function dismissTutorial(characterId: string): Promise<void> {
  await prisma.character.update({
    where: { id: characterId },
    data: { tutorialState: JSON.stringify({ dismissed: true, step: 99 }) },
  });
}
