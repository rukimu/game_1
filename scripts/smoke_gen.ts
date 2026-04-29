import { getContentGenerationService } from "../src/lib/generation/service";
import { getCurrentSeasonKeywords } from "../src/lib/mystery";
import { expForLevel } from "../src/lib/leveling";

async function main() {
  const gen = getContentGenerationService();
  const keywords = await getCurrentSeasonKeywords();
  console.log("season keywords:", keywords.join(", "));
  console.log();
  console.log("=== rumors (10 samples) ===");
  for (let i = 0; i < 10; i++) {
    const r = await gen.generateRumor({
      townName: "始まりの街アルダ",
      seasonClueWords: keywords,
      seed: `smoke-${i}`,
    });
    console.log(`${i + 1}. ${r}`);
  }
  console.log();
  console.log("=== NPC dialogue (warrior + season) ===");
  for (let i = 0; i < 6; i++) {
    const d = await gen.generateNpcDialogue({
      role: "酒場の主人",
      seasonClueWords: keywords,
      characterArchetype: "warrior",
      seed: `npc-w-${i}`,
    });
    console.log(`${i + 1}. (${d.role}) ${d.line}`);
  }
  console.log();
  console.log("=== NPC dialogue (mage + season) ===");
  for (let i = 0; i < 6; i++) {
    const d = await gen.generateNpcDialogue({
      role: "占い師",
      seasonClueWords: keywords,
      characterArchetype: "mage",
      seed: `npc-m-${i}`,
    });
    console.log(`${i + 1}. (${d.role}) ${d.line}`);
  }
  console.log();
  console.log("=== Enemy reward scaling ===");
  for (const lv of [1, 5, 10, 20, 30, 50]) {
    const e = await gen.generateEnemy({ level: lv, seed: `enemy-lv${lv}` });
    console.log(`Lv${lv}: HP=${e.hp} ATK=${e.atk} EXP=${e.expReward} GOLD=${e.goldReward} (${e.name})`);
  }
  console.log();
  console.log("=== EXP curve ===");
  for (const lv of [1, 5, 9, 10, 20, 30, 49]) {
    console.log(`expForLevel(${lv}) = ${expForLevel(lv)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
