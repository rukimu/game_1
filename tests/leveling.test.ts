import { describe, it, expect } from "vitest";
import { expForLevel, applyJobBaseStats, LEVEL_CAP } from "@/lib/leveling";

describe("expForLevel", () => {
  it("is monotonically increasing", () => {
    let prev = 0;
    for (let lv = 1; lv < LEVEL_CAP; lv++) {
      const e = expForLevel(lv);
      expect(e).toBeGreaterThan(prev);
      prev = e;
    }
  });

  it("matches anchor values from leveling.ts comment", () => {
    // 実測値: Lv1: 45 / Lv9: 774 / Lv29: 4,150 / Lv49: 9,062
    // ±5% slack for formula adjustments.
    expect(expForLevel(1)).toBeGreaterThanOrEqual(40);
    expect(expForLevel(1)).toBeLessThanOrEqual(50);
    expect(expForLevel(9)).toBeGreaterThan(700);
    expect(expForLevel(9)).toBeLessThan(820);
    expect(expForLevel(29)).toBeGreaterThan(3900);
    expect(expForLevel(29)).toBeLessThan(4400);
    expect(expForLevel(49)).toBeGreaterThan(8500);
    expect(expForLevel(49)).toBeLessThan(9500);
  });

  it("returns integer values", () => {
    for (let lv = 1; lv < LEVEL_CAP; lv++) {
      expect(Number.isInteger(expForLevel(lv))).toBe(true);
    }
  });
});

describe("applyJobBaseStats", () => {
  it("uses defaults when fields missing", () => {
    const stats = applyJobBaseStats({});
    expect(stats.hp).toBe(30);
    expect(stats.maxHp).toBe(30);
    expect(stats.mp).toBe(10);
    expect(stats.atk).toBe(8);
  });

  it("respects provided values", () => {
    const stats = applyJobBaseStats({ hp: 80, atk: 20, spd: 11 });
    expect(stats.hp).toBe(80);
    expect(stats.maxHp).toBe(80);
    expect(stats.atk).toBe(20);
    expect(stats.spd).toBe(11);
    // unspecified fall back to defaults
    expect(stats.def).toBe(4);
  });

  it("coerces string-like numbers via Number()", () => {
    // Job.baseStats is JSON in DB, so values may come back as strings in
    // theory; the Number() wrapper guards against that.
    const stats = applyJobBaseStats({ hp: "42" });
    expect(stats.hp).toBe(42);
    expect(stats.maxHp).toBe(42);
  });
});
