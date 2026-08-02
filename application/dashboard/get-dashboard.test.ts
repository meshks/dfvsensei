import { describe, expect, it } from "vitest";
import type { Assumption } from "@/application/assumptions/assumption-repository";
import type { Decision } from "@/application/decisions/decision-repository";
import type { TestCard } from "@/application/test-cards/test-card-repository";
import { buildDashboard } from "./get-dashboard";

function makeAssumption(overrides: Partial<Assumption>): Assumption {
  return {
    id: "a1",
    ventureId: "v1",
    statement: "statement",
    dfvPrimary: "desirability",
    dfvSecondary: [],
    assumptionType: "problem",
    actor: "actor",
    observableBehaviour: "behaviour",
    importanceScore: null,
    evidenceStrengthScore: null,
    rationale: null,
    source: "user_generated",
    status: "active",
    ownerId: "u1",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("buildDashboard", () => {
  it("keeps DFV confidence as three separate numbers, never a single blended score", () => {
    const assumptions = [
      makeAssumption({ id: "a1", dfvPrimary: "desirability", evidenceStrengthScore: 8 }),
      makeAssumption({ id: "a2", dfvPrimary: "feasibility", evidenceStrengthScore: 2 }),
      makeAssumption({ id: "a3", dfvPrimary: "viability", evidenceStrengthScore: 5 }),
    ];
    const dashboard = buildDashboard(assumptions, [], []);

    expect(dashboard.dfvConfidence).toHaveLength(3);
    const byCategory = Object.fromEntries(
      dashboard.dfvConfidence.map((d) => [d.category, d.averageEvidenceStrength]),
    );
    expect(byCategory.desirability).toBe(8);
    expect(byCategory.feasibility).toBe(2);
    expect(byCategory.viability).toBe(5);
  });

  it("averages multiple assumptions within the same category independently of other categories", () => {
    const assumptions = [
      makeAssumption({ id: "a1", dfvPrimary: "desirability", evidenceStrengthScore: 4 }),
      makeAssumption({ id: "a2", dfvPrimary: "desirability", evidenceStrengthScore: 8 }),
      makeAssumption({ id: "a3", dfvPrimary: "viability", evidenceStrengthScore: 10 }),
    ];
    const dashboard = buildDashboard(assumptions, [], []);
    const byCategory = Object.fromEntries(
      dashboard.dfvConfidence.map((d) => [d.category, d.averageEvidenceStrength]),
    );
    expect(byCategory.desirability).toBe(6);
    expect(byCategory.viability).toBe(10);
    expect(byCategory.feasibility).toBeNull();
  });

  it("excludes unscored assumptions from the average rather than treating them as 0", () => {
    const assumptions = [
      makeAssumption({ id: "a1", dfvPrimary: "desirability", evidenceStrengthScore: 6 }),
      makeAssumption({ id: "a2", dfvPrimary: "desirability", evidenceStrengthScore: null }),
    ];
    const dashboard = buildDashboard(assumptions, [], []);
    const desirability = dashboard.dfvConfidence.find((d) => d.category === "desirability")!;
    expect(desirability.averageEvidenceStrength).toBe(6);
    expect(desirability.assumptionCount).toBe(2);
  });

  it("ranks the top 5 risky assumptions by risk_priority descending", () => {
    const assumptions = [
      makeAssumption({ id: "low-risk", importanceScore: 2, evidenceStrengthScore: 9 }),
      makeAssumption({ id: "high-risk", importanceScore: 9, evidenceStrengthScore: 1 }),
      makeAssumption({ id: "mid-risk", importanceScore: 5, evidenceStrengthScore: 5 }),
    ];
    const dashboard = buildDashboard(assumptions, [], []);
    expect(dashboard.topRiskyAssumptions.map((a) => a.id)).toEqual([
      "high-risk",
      "mid-risk",
      "low-risk",
    ]);
  });

  it("excludes assumptions that haven't been scored yet from the risk ranking", () => {
    const assumptions = [
      makeAssumption({ id: "scored", importanceScore: 5, evidenceStrengthScore: 5 }),
      makeAssumption({ id: "unscored", importanceScore: null, evidenceStrengthScore: null }),
    ];
    const dashboard = buildDashboard(assumptions, [], []);
    expect(dashboard.topRiskyAssumptions.map((a) => a.id)).toEqual(["scored"]);
  });

  it("caps the risky-assumption list at 5", () => {
    const assumptions = Array.from({ length: 8 }, (_, i) =>
      makeAssumption({ id: `a${i}`, importanceScore: i, evidenceStrengthScore: 10 - i }),
    );
    const dashboard = buildDashboard(assumptions, [], []);
    expect(dashboard.topRiskyAssumptions).toHaveLength(5);
  });

  it("counts test cards by status", () => {
    const testCards = [
      { status: "draft" } as TestCard,
      { status: "draft" } as TestCard,
      { status: "ready" } as TestCard,
      { status: "complete" } as TestCard,
    ];
    const dashboard = buildDashboard([], testCards, []);
    expect(dashboard.testCardCounts).toEqual({ draft: 2, ready: 1, running: 0, complete: 1 });
  });

  it("reports decision count and the 5 most recent decisions", () => {
    const decisions = Array.from({ length: 7 }, (_, i) => ({ id: `d${i}` }) as Decision);
    const dashboard = buildDashboard([], [], decisions);
    expect(dashboard.decisionCount).toBe(7);
    expect(dashboard.recentDecisions).toHaveLength(5);
  });
});
