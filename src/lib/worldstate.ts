// Daily world state. Generated lazily on the first visit each day so the
// world feels like it ticks even without a cron daemon. Records what the
// "weather" of the realm is for that date — a flavor-strong, mechanically
// light layer that downstream generators (rumors, NPC lines, future enemy
// biases) consult.
//
// We deliberately keep the payload tiny and stable: anyone who reads the
// state should be able to deserialize it without our latest type updates.

import { prisma } from "@/lib/prisma";
import { intBetween, makeRng, pick } from "@/lib/rng";

export type WorldStatePayload = {
  date: string;                // YYYY-MM-DD
  weatherTone: string;         // human-readable headline
  weakElement: "fire" | "water" | "earth" | "wind" | "light" | "dark";
  monsterTrend: string;        // "獣型多数" / "不死型優勢" / "魔の蠢く日" など
  rumorTone: "calm" | "anxious" | "festive" | "ominous";
  // A free-form sentence the town page can show as the day's headline.
  headline: string;
};

const TONES = ["calm", "anxious", "festive", "ominous"] as const;
const ELEMENTS = ["fire", "water", "earth", "wind", "light", "dark"] as const;

const HEADLINE_TEMPLATES: Record<typeof TONES[number], string[]> = {
  calm: [
    "今日は風が穏やかで、街道の旅人が増える日だ。",
    "鳥の声が遠くまで届く、静かな朝だ。",
    "市場の値段が落ち着いている。商人にとって良い日。",
  ],
  anxious: [
    "井戸の水が震えている。誰もが何かを待っている。",
    "酒場の話し声が低く、遠雷が時折響く。",
    "夜が長く感じる日だ。早めに宿に入る者が増えている。",
  ],
  festive: [
    "湖畔の街では小さな祭りが立ち、街道に灯りが連なる。",
    "古い詩を歌う者が多い。何かの記念日らしい。",
    "陽の差し方が綺麗で、子供たちが街路で遊んでいる。",
  ],
  ominous: [
    "鐘の音が今日に限って濁って聞こえると、誰かがこぼした。",
    "塔の影が、いつもより長く伸びていた。",
    "黒い羽根が街の門に落ちていた。誰も拾わなかった。",
  ],
};

const MONSTER_TRENDS = [
  "獣型の徘徊が増えている",
  "不死の影が街道に落ちている",
  "構築型の機巧が古道で目撃される",
  "魔を扱う敵の蠢動が報告されている",
  "人型の盗賊団が活発になっている",
  "敵の出方は普段通りだ",
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Returns today's WorldState payload, generating + persisting it on first
// access. Cheap to call per request — it's a single indexed lookup once the
// row exists.
export async function getTodayWorldState(): Promise<WorldStatePayload> {
  const date = todayKey();
  const existing = await prisma.worldState.findUnique({ where: { date } });
  if (existing) {
    try {
      const obj = JSON.parse(existing.payload);
      if (obj && obj.date === date) return obj as WorldStatePayload;
    } catch { /* fall through to regenerate */ }
  }
  const rng = makeRng(`world-${date}`);
  const tone = pick([...TONES] as string[], rng) as WorldStatePayload["rumorTone"];
  const weakElement = pick([...ELEMENTS] as string[], rng) as WorldStatePayload["weakElement"];
  const monsterTrend = pick(MONSTER_TRENDS, rng);
  const headline = pick(HEADLINE_TEMPLATES[tone], rng);
  const weatherTone = ({
    calm: "静穏", anxious: "不穏", festive: "祝祭", ominous: "凶兆",
  })[tone];
  const payload: WorldStatePayload = {
    date,
    weatherTone,
    weakElement,
    monsterTrend,
    rumorTone: tone,
    headline,
  };
  // Persist. Race-tolerant via upsert.
  await prisma.worldState.upsert({
    where: { date },
    update: { payload: JSON.stringify(payload) },
    create: { date, payload: JSON.stringify(payload) },
  });
  return payload;
}

export function jpElementName(e: WorldStatePayload["weakElement"]): string {
  switch (e) {
    case "fire": return "火";
    case "water": return "水";
    case "earth": return "土";
    case "wind": return "風";
    case "light": return "光";
    case "dark": return "闇";
  }
}
