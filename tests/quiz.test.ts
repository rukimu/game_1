import { describe, it, expect } from "vitest";
import { scoreQuiz, QUIZ } from "@/lib/quiz";

describe("scoreQuiz", () => {
  it("picks warrior when all answers favor warrior", () => {
    const answers: Record<string, string> = {};
    for (const q of QUIZ) {
      const w = q.options.find((o) => o.weights.warrior);
      if (w) answers[q.id] = w.id;
    }
    const result = scoreQuiz(answers);
    expect(result.topArchetype).toBe("warrior");
    expect(result.scores.warrior).toBeGreaterThan(0);
    expect(result.jobName).toContain("戦士");
  });

  it("picks mage when all answers favor mage", () => {
    const answers: Record<string, string> = {};
    for (const q of QUIZ) {
      const w = q.options.find((o) => o.weights.mage);
      if (w) answers[q.id] = w.id;
    }
    const result = scoreQuiz(answers);
    expect(result.topArchetype).toBe("mage");
  });

  it("returns warrior on empty answers via tie-break order", () => {
    const result = scoreQuiz({});
    expect(result.topArchetype).toBe("warrior");
    expect(Object.values(result.scores).every((v) => v === 0)).toBe(true);
  });

  it("ignores unknown option ids", () => {
    const answers: Record<string, string> = { q1: "nonexistent-option" };
    const result = scoreQuiz(answers);
    // Should not throw, all scores remain 0, tie-break -> warrior
    expect(result.topArchetype).toBe("warrior");
  });
});
