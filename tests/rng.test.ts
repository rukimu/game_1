import { describe, it, expect } from "vitest";
import { makeRng, pick, intBetween } from "@/lib/rng";

describe("makeRng", () => {
  it("is deterministic for same seed", () => {
    const a = makeRng("hello");
    const b = makeRng("hello");
    for (let i = 0; i < 5; i++) {
      expect(a()).toBe(b());
    }
  });

  it("differs across seeds", () => {
    const a = makeRng("alpha");
    const b = makeRng("beta");
    // 4 consecutive draws agreeing across distinct seeds is astronomically unlikely
    let same = 0;
    for (let i = 0; i < 4; i++) if (a() === b()) same++;
    expect(same).toBeLessThan(4);
  });

  it("returns values in [0,1)", () => {
    const r = makeRng("range-check");
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("pick", () => {
  it("returns one of the array elements", () => {
    const arr = ["a", "b", "c"];
    const r = makeRng("pick-seed");
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(pick(arr, r));
    }
  });
});

describe("intBetween", () => {
  it("returns inclusive range", () => {
    const r = makeRng("int-seed");
    for (let i = 0; i < 100; i++) {
      const v = intBetween(r, 5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("handles min === max", () => {
    const r = makeRng("eq-seed");
    expect(intBetween(r, 7, 7)).toBe(7);
  });
});
