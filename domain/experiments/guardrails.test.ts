import { describe, expect, it } from "vitest";
import {
  type CandidateExperiment,
  classifyAssumptionKind,
  enforceExperimentRecommendationGuardrails,
} from "./guardrails";

describe("classifyAssumptionKind", () => {
  it("classifies a viability/revenue assumption as willingness_to_pay", () => {
    expect(classifyAssumptionKind({ dfvPrimary: "viability", assumptionType: "revenue" })).toBe(
      "willingness_to_pay",
    );
  });

  it("classifies a feasibility/resource assumption as technical_performance", () => {
    expect(classifyAssumptionKind({ dfvPrimary: "feasibility", assumptionType: "resource" })).toBe(
      "technical_performance",
    );
  });

  it("classifies a feasibility/data assumption as technical_performance", () => {
    expect(classifyAssumptionKind({ dfvPrimary: "feasibility", assumptionType: "data" })).toBe(
      "technical_performance",
    );
  });

  it("falls back to other for ambiguous combinations rather than guessing", () => {
    expect(classifyAssumptionKind({ dfvPrimary: "desirability", assumptionType: "channel" })).toBe(
      "other",
    );
    expect(classifyAssumptionKind({ dfvPrimary: "viability", assumptionType: "cost" })).toBe(
      "other",
    );
  });
});

describe("enforceExperimentRecommendationGuardrails -- rule 1: willingness to pay", () => {
  it("promotes a paid-pilot candidate above an interview-only top result (TEST_STRATEGY.md §2 fixture 1)", () => {
    const candidates: CandidateExperiment[] = [
      { libraryId: "interview", family: "customer_interview", score: 0.82 },
      { libraryId: "paid-pilot", family: "paid_pilot", score: 0.6 },
    ];
    const result = enforceExperimentRecommendationGuardrails("willingness_to_pay", candidates);
    expect(result.rankedCandidates[0]?.libraryId).toBe("paid-pilot");
    expect(result.violationsCorrected).toContain("wtp_top_result_not_commitment_grade");
    expect(result.violationsRemaining).toEqual([]);
  });

  it("leaves a commitment-grade top result untouched", () => {
    const candidates: CandidateExperiment[] = [
      { libraryId: "deposit", family: "deposit", score: 0.7 },
      { libraryId: "interview", family: "customer_interview", score: 0.9 },
    ];
    const result = enforceExperimentRecommendationGuardrails("willingness_to_pay", candidates);
    expect(result.rankedCandidates[0]?.libraryId).toBe("deposit");
    expect(result.violationsCorrected).toEqual([]);
  });

  it("reports an unfixable violation when no commitment-grade candidate exists", () => {
    const candidates: CandidateExperiment[] = [
      { libraryId: "interview", family: "customer_interview", score: 0.9 },
      { libraryId: "survey", family: "survey", score: 0.5 },
    ];
    const result = enforceExperimentRecommendationGuardrails("willingness_to_pay", candidates);
    expect(result.rankedCandidates[0]?.libraryId).toBe("interview");
    expect(result.violationsRemaining).toContain("wtp_top_result_not_commitment_grade");
  });

  it("does not apply the willingness-to-pay rule to other assumption kinds", () => {
    const candidates: CandidateExperiment[] = [
      { libraryId: "interview", family: "customer_interview", score: 0.9 },
      { libraryId: "paid-pilot", family: "paid_pilot", score: 0.1 },
    ];
    const result = enforceExperimentRecommendationGuardrails("technical_performance", candidates);
    expect(result.rankedCandidates[0]?.libraryId).toBe("interview");
    expect(result.violationsCorrected).toEqual([]);
  });
});

describe("enforceExperimentRecommendationGuardrails -- rule 2: technical performance vs. clickable prototype", () => {
  it("promotes a benchmark candidate above a clickable-prototype top result (TEST_STRATEGY.md §2 fixture 2)", () => {
    const candidates: CandidateExperiment[] = [
      { libraryId: "prototype", family: "prototype_test", score: 0.85 },
      { libraryId: "benchmark", family: "technical_benchmark", score: 0.55 },
    ];
    const result = enforceExperimentRecommendationGuardrails("technical_performance", candidates);
    expect(result.rankedCandidates[0]?.libraryId).toBe("benchmark");
    expect(result.violationsCorrected).toContain("technical_performance_top_result_is_prototype");
  });

  it("reports an unfixable violation when the only candidate is a clickable prototype", () => {
    const candidates: CandidateExperiment[] = [
      { libraryId: "prototype", family: "prototype_test", score: 0.9 },
    ];
    const result = enforceExperimentRecommendationGuardrails("technical_performance", candidates);
    expect(result.rankedCandidates[0]?.libraryId).toBe("prototype");
    expect(result.violationsRemaining).toContain("technical_performance_top_result_is_prototype");
  });
});

describe("enforceExperimentRecommendationGuardrails -- rule 3: letter of intent never proves technical performance", () => {
  it("demotes a letter-of-intent top result even when no benchmark alternative exists (TEST_STRATEGY.md §2 fixture 3)", () => {
    const candidates: CandidateExperiment[] = [
      { libraryId: "loi", family: "letter_of_intent", score: 0.95 },
      { libraryId: "interview", family: "customer_interview", score: 0.4 },
    ];
    const result = enforceExperimentRecommendationGuardrails("technical_performance", candidates);
    expect(result.rankedCandidates[0]?.libraryId).not.toBe("loi");
    expect(result.violationsCorrected).toContain(
      "technical_performance_top_result_is_letter_of_intent",
    );
  });

  it("reports an unfixable violation when letter of intent is the only candidate", () => {
    const candidates: CandidateExperiment[] = [
      { libraryId: "loi", family: "letter_of_intent", score: 0.5 },
    ];
    const result = enforceExperimentRecommendationGuardrails("technical_performance", candidates);
    expect(result.violationsRemaining).toContain(
      "technical_performance_top_result_is_letter_of_intent",
    );
  });

  it("applies both the LOI ban and the prototype ban in sequence when both are present", () => {
    const candidates: CandidateExperiment[] = [
      { libraryId: "loi", family: "letter_of_intent", score: 0.95 },
      { libraryId: "prototype", family: "prototype_test", score: 0.8 },
      { libraryId: "benchmark", family: "technical_benchmark", score: 0.3 },
    ];
    const result = enforceExperimentRecommendationGuardrails("technical_performance", candidates);
    expect(result.rankedCandidates[0]?.libraryId).toBe("benchmark");
    expect(result.violationsCorrected).toEqual([
      "technical_performance_top_result_is_letter_of_intent",
      "technical_performance_top_result_is_prototype",
    ]);
  });
});
