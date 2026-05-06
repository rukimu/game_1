import { describe, it, expect } from "vitest";
import { ONBOARDING_CHAIN, ONBOARDING_GENERATED_BY } from "@/lib/onboarding";

describe("ONBOARDING_CHAIN", () => {
  it("has exactly 5 steps", () => {
    expect(ONBOARDING_CHAIN.length).toBe(5);
  });

  it("orders are 1..5 sequential", () => {
    const orders = ONBOARDING_CHAIN.map((s) => s.order);
    expect(orders).toEqual([1, 2, 3, 4, 5]);
  });

  it("each title starts with [N/5]", () => {
    for (const step of ONBOARDING_CHAIN) {
      expect(step.title).toMatch(/^\[\d\/5\]/);
      // The N in [N/5] matches the order field exactly so the regex-based
      // parseOnboardingOrder helper inside onboarding.ts can recover it.
      const m = step.title.match(/^\[(\d)\/5\]/)!;
      expect(parseInt(m[1], 10)).toBe(step.order);
    }
  });

  it("rewards strictly increase by step", () => {
    let prevExp = 0;
    let prevGold = 0;
    for (const step of ONBOARDING_CHAIN) {
      expect(step.expReward).toBeGreaterThan(prevExp);
      expect(step.goldReward).toBeGreaterThan(prevGold);
      prevExp = step.expReward;
      prevGold = step.goldReward;
    }
  });

  it("uses only known goalTypes", () => {
    const allowed = new Set(["defeat_enemy", "collect_drop", "win_battles"]);
    for (const step of ONBOARDING_CHAIN) {
      expect(allowed.has(step.goalType)).toBe(true);
    }
  });

  it("ONBOARDING_GENERATED_BY constant matches expected sentinel", () => {
    // Other code paths (battle.ts onboarding hook, town/page.tsx filter)
    // depend on this exact string. Lock it in.
    expect(ONBOARDING_GENERATED_BY).toBe("onboarding");
  });
});
