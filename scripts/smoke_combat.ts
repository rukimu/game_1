import { rollItemInstance, aggregateEffects, parseInstance } from "../src/lib/affixes";

console.log("=== Aggregated effects from a 'legendary' loadout ===\n");
const inst1 = rollItemInstance({ baseName: "両手剣", enemyLevel: 30, seed: "leg-1", forcedTier: "legendary" });
const inst2 = rollItemInstance({ baseName: "翡翠のペンダント", enemyLevel: 30, seed: "leg-2", forcedTier: "epic" });
const inst3 = rollItemInstance({ baseName: "鋼のサバトン", enemyLevel: 30, seed: "leg-3", forcedTier: "rare" });

for (const i of [inst1, inst2, inst3]) {
  console.log(` ${i.tier.padEnd(10)} ${i.displayName}`);
  for (const a of i.affixes) {
    if (a.special) console.log(`   special: ${a.special}`);
    if (a.effects && a.effects.length > 0) {
      console.log(`   effects: ${JSON.stringify(a.effects)}`);
    }
  }
}
console.log();
const agg = aggregateEffects([inst1, inst2, inst3]);
console.log("Aggregated:", JSON.stringify(agg, null, 2));

// Save / load round-trip
console.log("\n=== Persistence roundtrip ===");
const json = JSON.stringify(inst1);
const restored = parseInstance(json);
console.log(`displayName preserved: ${restored?.displayName === inst1.displayName}`);
console.log(`effects preserved: ${JSON.stringify(restored?.affixes[0]?.effects)}`);

// Crit simulation
console.log("\n=== Crit simulation (1000 swings) ===");
let crits = 0;
const baseRate = 5;
const totalRate = baseRate + agg.critRateBonus;
for (let i = 0; i < 1000; i++) {
  if (Math.random() * 100 < totalRate) crits++;
}
console.log(`Effective crit rate (target ${totalRate}%): observed ${crits / 10}% over 1000 swings`);
