import { describe, expect, it } from "vitest";
import {
  RECOMMENDATION_WEIGHTS,
  evidenceGap,
  normaliseScore,
  recommendationScore,
  riskPriority,
} from "./index";

describe("normaliseScore", () => {
  it("maps the 0..10 range to 0..1", () => {
    expect(normaliseScore(0)).toBe(0);
    expect(normaliseScore(10)).toBe(1);
    expect(normaliseScore(5)).toBe(0.5);
  });

  it("rejects out-of-range input", () => {
    expect(() => normaliseScore(-1)).toThrow(RangeError);
    expect(() => normaliseScore(10.1)).toThrow(RangeError);
    expect(() => normaliseScore(Number.NaN)).toThrow(RangeError);
  });
});

describe("evidenceGap", () => {
  it("is 1 when there is no evidence, 0 when evidence is maximal", () => {
    expect(evidenceGap(0)).toBe(1);
    expect(evidenceGap(10)).toBe(0);
  });

  it("is the complement of normalised evidence strength", () => {
    expect(evidenceGap(3)).toBeCloseTo(0.7, 10);
  });
});

describe("riskPriority", () => {
  it("boundary: max importance + zero evidence => 1 (highest priority)", () => {
    expect(riskPriority({ importanceScore: 10, evidenceStrengthScore: 0 })).toBe(1);
  });

  it("boundary: any importance + full evidence => 0 (lowest priority)", () => {
    expect(riskPriority({ importanceScore: 10, evidenceStrengthScore: 10 })).toBe(0);
  });

  it("boundary: zero importance => 0 regardless of evidence", () => {
    expect(riskPriority({ importanceScore: 0, evidenceStrengthScore: 0 })).toBe(0);
  });

  it("midpoint: importance 5, evidence 5 => 0.25", () => {
    expect(riskPriority({ importanceScore: 5, evidenceStrengthScore: 5 })).toBeCloseTo(0.25, 10);
  });

  it("is monotonically increasing in importance for fixed evidence", () => {
    const low = riskPriority({ importanceScore: 3, evidenceStrengthScore: 2 });
    const high = riskPriority({ importanceScore: 8, evidenceStrengthScore: 2 });
    expect(high).toBeGreaterThan(low);
  });

  it("is monotonically decreasing in evidence strength for fixed importance", () => {
    const weakEvidence = riskPriority({ importanceScore: 7, evidenceStrengthScore: 1 });
    const strongEvidence = riskPriority({ importanceScore: 7, evidenceStrengthScore: 9 });
    expect(weakEvidence).toBeGreaterThan(strongEvidence);
  });

  it("propagates the out-of-range error from either input", () => {
    expect(() => riskPriority({ importanceScore: 11, evidenceStrengthScore: 5 })).toThrow(
      RangeError,
    );
    expect(() => riskPriority({ importanceScore: 5, evidenceStrengthScore: -1 })).toThrow(
      RangeError,
    );
  });
});

describe("recommendationScore", () => {
  it("weights sum to 1.0", () => {
    const total = Object.values(RECOMMENDATION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("a perfect experiment scores 1", () => {
    const score = recommendationScore({
      assumptionFit: 1,
      evidenceStrengthRequired: 1,
      costAndSpeed: 1,
      stageAppropriateness: 1,
      accessEthicsPracticality: 1,
    });
    expect(score).toBeCloseTo(1, 10);
  });

  it("a useless experiment scores 0", () => {
    const score = recommendationScore({
      assumptionFit: 0,
      evidenceStrengthRequired: 0,
      costAndSpeed: 0,
      stageAppropriateness: 0,
      accessEthicsPracticality: 0,
    });
    expect(score).toBe(0);
  });

  it("computes the documented weighted sum exactly", () => {
    const score = recommendationScore({
      assumptionFit: 0.8,
      evidenceStrengthRequired: 0.6,
      costAndSpeed: 0.5,
      stageAppropriateness: 0.9,
      accessEthicsPracticality: 0.4,
    });
    const expected = 0.8 * 0.4 + 0.6 * 0.25 + 0.5 * 0.15 + 0.9 * 0.1 + 0.4 * 0.1;
    expect(score).toBeCloseTo(expected, 10);
  });

  it("assumption fit dominates the score (highest weight)", () => {
    const highFitLowRest = recommendationScore({
      assumptionFit: 1,
      evidenceStrengthRequired: 0,
      costAndSpeed: 0,
      stageAppropriateness: 0,
      accessEthicsPracticality: 0,
    });
    const lowFitHighRest = recommendationScore({
      assumptionFit: 0,
      evidenceStrengthRequired: 1,
      costAndSpeed: 1,
      stageAppropriateness: 1,
      accessEthicsPracticality: 1,
    });
    // 0.40 vs 0.60, so this is not a universal truth -- documents the actual
    // weighting rather than assuming assumption_fit always wins outright.
    expect(highFitLowRest).toBeCloseTo(0.4, 10);
    expect(lowFitHighRest).toBeCloseTo(0.6, 10);
  });

  it("rejects any breakdown component outside 0..1", () => {
    expect(() =>
      recommendationScore({
        assumptionFit: 1.5,
        evidenceStrengthRequired: 0.5,
        costAndSpeed: 0.5,
        stageAppropriateness: 0.5,
        accessEthicsPracticality: 0.5,
      }),
    ).toThrow(RangeError);
  });
});
