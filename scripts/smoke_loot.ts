import { rollItemInstance } from "../src/lib/affixes";

const baseNames = ["古びた剣", "蒼炎のロッド", "森人の弓", "影刃", "両手剣"];
const levels = [1, 5, 15, 30, 50];

console.log("=== Hack-and-slash drop instances (5 rolls per Lv) ===\n");
for (const lv of levels) {
  console.log(`-- enemy Lv ${lv} --`);
  for (let i = 0; i < 5; i++) {
    const base = baseNames[i % baseNames.length];
    const inst = rollItemInstance({ baseName: base, enemyLevel: lv, seed: `lv${lv}-${i}` });
    const stats = Object.entries(inst.bonusStats)
      .filter(([_, v]) => v !== 0)
      .map(([k, v]) => `${k}${v! > 0 ? "+" : ""}${v}`)
      .join(" ");
    const specials = inst.specials.length > 0 ? ` // ${inst.specials.join(" ")}` : "";
    console.log(`  [${inst.tier.padEnd(9)}] ${inst.displayName}  ${stats}${specials}`);
  }
  console.log();
}

// Verify "same name, different effects" — roll same base 6 times
console.log("=== Same base = different blades (古びた剣 ×6 at Lv10) ===");
for (let i = 0; i < 6; i++) {
  const inst = rollItemInstance({ baseName: "古びた剣", enemyLevel: 10, seed: `same-${i}` });
  const stats = Object.entries(inst.bonusStats)
    .filter(([_, v]) => v !== 0)
    .map(([k, v]) => `${k}${v! > 0 ? "+" : ""}${v}`)
    .join(" ");
  console.log(`  ${inst.displayName.padEnd(40)} ${stats}`);
}
