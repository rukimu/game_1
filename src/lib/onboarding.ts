import { prisma } from "@/lib/prisma";

// Cycle 41-4: Day1 オンボーディング クエスト連鎖。
// ユーザの「このゲームどう楽しむの？」という疑問を、最初の 5 クエストで
// 線形に誘導する。各クエスト完了時に次の 1 件を自動受注し、新規プレイヤ
// は受注ボタンを押さずとも「次にやること」が常に 1 件だけ表示される。
//
// 実装方針:
// - Quest テーブルに generatedBy="onboarding" + townId=null で seed
// - title 先頭の [N/5] で並び順を判定 (schema 変更なし)
// - 受注/完了は通常の CharacterQuest を使い、battle.ts / move/route.ts
//   既存の進行管理にそのまま乗る
// - チェーン全体終了後は通常クエスト掲示板に切り替わる

export type OnboardingStep = {
  order: number;
  title: string;
  description: string;
  goalType: "defeat_enemy" | "collect_drop" | "win_battles";
  goalParam: string | null;
  goalCount: number;
  expReward: number;
  goldReward: number;
};

export const ONBOARDING_CHAIN: OnboardingStep[] = [
  {
    order: 1,
    title: "[1/5] はじめの一戦",
    description: "街の外に出て、敵を1体倒してみよう。攻撃ボタンを押すと戦闘が始まる。",
    goalType: "defeat_enemy",
    goalParam: null,
    goalCount: 1,
    expReward: 30,
    goldReward: 30,
  },
  {
    order: 2,
    title: "[2/5] 三度目の正直",
    description: "戦闘の流れに慣れよう。敵を3体倒すまで戦い続ける。",
    goalType: "defeat_enemy",
    goalParam: null,
    goalCount: 3,
    expReward: 60,
    goldReward: 60,
  },
  {
    order: 3,
    title: "[3/5] 戦利品を手に",
    description: "敵を倒すと装備品がドロップすることがある。1つ手に入れよう。",
    goalType: "collect_drop",
    goalParam: null,
    goalCount: 1,
    expReward: 80,
    goldReward: 100,
  },
  {
    order: 4,
    title: "[4/5] 経験を積む",
    description: "そろそろ戦闘の感覚が掴めてきた頃。さらに敵を10体倒そう。",
    goalType: "defeat_enemy",
    goalParam: null,
    goalCount: 10,
    expReward: 150,
    goldReward: 200,
  },
  {
    order: 5,
    title: "[5/5] 風来の戦士",
    description: "戦闘に5回勝利して、駆け出しの戦士から一歩踏み出そう。",
    goalType: "win_battles",
    goalParam: null,
    goalCount: 5,
    expReward: 200,
    goldReward: 300,
  },
];

export const ONBOARDING_GENERATED_BY = "onboarding";

// Idempotent: 既存の onboarding quest があれば中身を更新、なければ作成。
// title に [N/5] を含むことで find しやすい。townId=null は街掲示板に
// 紛れ込まないため (掲示板 query は townId 指定必須) と、専用 UI 経由の
// 表示に統一するため。
export async function seedOnboardingQuests(): Promise<void> {
  for (const step of ONBOARDING_CHAIN) {
    const existing = await prisma.quest.findFirst({
      where: {
        generatedBy: ONBOARDING_GENERATED_BY,
        title: step.title,
      },
    });
    if (existing) {
      await prisma.quest.update({
        where: { id: existing.id },
        data: {
          description: step.description,
          goalType: step.goalType,
          goalParam: step.goalParam,
          goalCount: step.goalCount,
          expReward: step.expReward,
          goldReward: step.goldReward,
        },
      });
    } else {
      await prisma.quest.create({
        data: {
          townId: null,
          title: step.title,
          description: step.description,
          goalType: step.goalType,
          goalParam: step.goalParam,
          goalCount: step.goalCount,
          expReward: step.expReward,
          goldReward: step.goldReward,
          generatedBy: ONBOARDING_GENERATED_BY,
        },
      });
    }
  }
}

// title -> order を逆引き。[N/5] 形式以外は null。
function parseOnboardingOrder(title: string): number | null {
  const m = title.match(/^\[(\d+)\/5\]/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 1 || n > 5) return null;
  return n;
}

// 新規キャラに [1/5] を自動受注。既に受注 (重複 unique 制約) があれば no-op。
export async function acceptFirstOnboardingQuest(characterId: string): Promise<void> {
  const first = await prisma.quest.findFirst({
    where: {
      generatedBy: ONBOARDING_GENERATED_BY,
      title: ONBOARDING_CHAIN[0].title,
    },
  });
  if (!first) return; // seed 未実行のテスト DB を考慮
  const dup = await prisma.characterQuest.findUnique({
    where: { characterId_questId: { characterId, questId: first.id } },
  });
  if (dup) return;
  await prisma.characterQuest.create({
    data: { characterId, questId: first.id },
  });
}

// チェーン進行: 「直前に完了した quest が onboarding なら次を自動受注」。
// 呼び出し側は完了済みの quest が onboarding かどうかを意識せず、毎回
// この関数を叩けばよい。返り値は新規受注した次クエスト (UI で「次は…」
// を出したい場合に利用)、なければ null。
export async function advanceOnboardingChain(
  characterId: string,
  completedQuestId: string,
): Promise<{ title: string; description: string } | null> {
  const completed = await prisma.quest.findUnique({ where: { id: completedQuestId } });
  if (!completed || completed.generatedBy !== ONBOARDING_GENERATED_BY) return null;
  const order = parseOnboardingOrder(completed.title);
  if (order === null) return null;
  const nextStep = ONBOARDING_CHAIN.find((s) => s.order === order + 1);
  if (!nextStep) return null; // チェーン終了
  const nextQuest = await prisma.quest.findFirst({
    where: {
      generatedBy: ONBOARDING_GENERATED_BY,
      title: nextStep.title,
    },
  });
  if (!nextQuest) return null;
  const dup = await prisma.characterQuest.findUnique({
    where: { characterId_questId: { characterId, questId: nextQuest.id } },
  });
  if (dup) return null;
  await prisma.characterQuest.create({
    data: { characterId, questId: nextQuest.id },
  });
  return { title: nextStep.title, description: nextStep.description };
}

// UI 用: 現在進行中の onboarding quest を 1 件返す (なければ null)。
// 完了済みは含めない。chain 全完走後は null になり、通常クエスト掲示板
// に切り替わる。
export async function getActiveOnboardingQuest(characterId: string): Promise<{
  questId: string;
  title: string;
  description: string;
  progress: number;
  goalCount: number;
  goalType: string;
} | null> {
  const cq = await prisma.characterQuest.findFirst({
    where: {
      characterId,
      completedAt: null,
      quest: { generatedBy: ONBOARDING_GENERATED_BY },
    },
    include: { quest: true },
    orderBy: { acceptedAt: "asc" },
  });
  if (!cq) return null;
  return {
    questId: cq.questId,
    title: cq.quest.title,
    description: cq.quest.description,
    progress: cq.progress,
    goalCount: cq.quest.goalCount,
    goalType: cq.quest.goalType,
  };
}
