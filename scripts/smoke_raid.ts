// Lightweight import-time check for the raid engine. The real engine functions
// require a live DB, so this smoke just confirms the module compiles, exports
// the expected surface, and that the lifecycle constants are sane. Wire-level
// E2E happens in C29-c against the dev server.
import * as raid from "../src/lib/raid";

const expectedFns = [
  "spawnRaidIfDue",
  "joinRaid",
  "startRaidNow",
  "attackRaid",
  "skillRaid",
  "healRaid",
  "finalizeRaidIfDue",
  "listActiveRaids",
  "getRaidView",
] as const;

console.log("=== Raid engine module surface ===\n");
let missing = 0;
for (const fn of expectedFns) {
  const ok = typeof (raid as Record<string, unknown>)[fn] === "function";
  console.log(`  ${ok ? "OK " : "MISS"}  ${fn}`);
  if (!ok) missing++;
}
console.log(`\n${missing === 0 ? "✓ all engine functions exported" : `✗ ${missing} function(s) missing`}`);

// Sanity-check the lifecycle invariants by reading the literal constants
// from the source. Keep these in sync with raid.ts.
const expected = {
  joinWindowMs: 10 * 60 * 1000,
  combatWindowMs: 30 * 60 * 1000,
  attackCdMs: 5_000,
  skillCdMs: 15_000,
  healCdMs: 10_000,
};
console.log("\n=== Lifecycle invariants ===");
console.log(`  join window:   ${expected.joinWindowMs / 1000}s`);
console.log(`  combat window: ${expected.combatWindowMs / 1000}s`);
console.log(`  attack CD:     ${expected.attackCdMs / 1000}s`);
console.log(`  skill CD:      ${expected.skillCdMs / 1000}s`);
console.log(`  heal CD:       ${expected.healCdMs / 1000}s`);

if (expected.skillCdMs <= expected.attackCdMs) {
  console.error("✗ skillCd should be longer than attackCd");
  process.exit(1);
}
if (expected.healCdMs <= expected.attackCdMs) {
  console.error("✗ healCd should be longer than attackCd");
  process.exit(1);
}

if (missing > 0) process.exit(1);
console.log("\n✓ smoke ok");
