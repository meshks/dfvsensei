/**
 * Application-layer guardrails for experiment recommendations. Per CLAUDE.md rule 4
 * and AI_BEHAVIOUR_SPEC.md §3.7: the LLM ranks candidates, but these three rules are
 * enforced here, independently of the LLM, because the LLM can be wrong and this is
 * the actual safety net -- not just a prompt instruction.
 *
 * Run this against the FULL scored candidate set (before slicing to the top 5) so a
 * valid alternative can be promoted even if it wasn't naively in the top 5.
 */

export type DfvCategory = "desirability" | "feasibility" | "viability";

export type AssumptionType =
  | "segment"
  | "problem"
  | "solution"
  | "channel"
  | "revenue"
  | "cost"
  | "resource"
  | "activity"
  | "partner"
  | "data"
  | "regulation"
  | "adoption"
  | "other";

export type AssumptionKind = "willingness_to_pay" | "technical_performance" | "other";

/**
 * Best-effort deterministic classification from structured fields. This is a
 * coarse mapping (assumption_type + dfv_primary aren't a perfect proxy for
 * "is this a WTP/technical-performance assumption") -- it's intentionally
 * conservative: it only classifies the unambiguous cases and falls back to
 * "other" (no guardrail applied) rather than guessing.
 */
export function classifyAssumptionKind(input: {
  dfvPrimary: DfvCategory;
  assumptionType: AssumptionType;
}): AssumptionKind {
  if (input.dfvPrimary === "viability" && input.assumptionType === "revenue") {
    return "willingness_to_pay";
  }
  if (
    input.dfvPrimary === "feasibility" &&
    (input.assumptionType === "resource" ||
      input.assumptionType === "activity" ||
      input.assumptionType === "data")
  ) {
    return "technical_performance";
  }
  return "other";
}

export type ExperimentFamily =
  | "customer_interview"
  | "survey"
  | "landing_page_test"
  | "concierge_test"
  | "wizard_of_oz"
  | "smoke_test"
  | "ab_test"
  | "pre_order"
  | "deposit"
  | "purchase_order"
  | "paid_pilot"
  | "crowdfunding"
  | "letter_of_intent"
  | "prototype_test"
  | "technical_benchmark"
  | "field_test"
  | "repeatability_test"
  | "workflow_integration_test"
  | "human_vs_ai_benchmark";

/** Families that produce binding customer commitment, not just stated intent. */
const COMMITMENT_GRADE_FAMILIES: ReadonlySet<ExperimentFamily> = new Set([
  "deposit",
  "pre_order",
  "purchase_order",
  "paid_pilot",
  "crowdfunding",
]);

/** Families that only capture opinion/stated intent, never a real commitment. */
const INTERVIEW_ONLY_FAMILIES: ReadonlySet<ExperimentFamily> = new Set([
  "customer_interview",
  "survey",
]);

/** A clickable prototype demonstrates UX flow, not underlying technical performance. */
const CLICKABLE_PROTOTYPE_FAMILIES: ReadonlySet<ExperimentFamily> = new Set(["prototype_test"]);

/** Families that actually exercise and measure the technology under real conditions. */
const TECHNICAL_BENCHMARK_FAMILIES: ReadonlySet<ExperimentFamily> = new Set([
  "technical_benchmark",
  "field_test",
  "repeatability_test",
  "workflow_integration_test",
  "human_vs_ai_benchmark",
]);

/** A stated future intent to buy/partner -- never proof a technology works. */
const LETTER_OF_INTENT_FAMILIES: ReadonlySet<ExperimentFamily> = new Set(["letter_of_intent"]);

export interface CandidateExperiment {
  libraryId: string;
  family: ExperimentFamily;
  /** The recommendationScore from domain/scoring, already computed and sorted descending. */
  score: number;
}

export type GuardrailViolationType =
  | "wtp_top_result_not_commitment_grade"
  | "technical_performance_top_result_is_prototype"
  | "technical_performance_top_result_is_letter_of_intent";

export interface GuardrailResult {
  rankedCandidates: CandidateExperiment[];
  /** Violations found and fixed by reordering. */
  violationsCorrected: GuardrailViolationType[];
  /** Violations found but not fixable -- no valid alternative exists in the candidate set. */
  violationsRemaining: GuardrailViolationType[];
}

function promoteBestMatching(
  candidates: CandidateExperiment[],
  families: ReadonlySet<ExperimentFamily>,
): CandidateExperiment[] | null {
  const matching = [...candidates].filter((c) => families.has(c.family));
  if (matching.length === 0) return null;
  matching.sort((a, b) => b.score - a.score);
  const best = matching[0]!;
  const rest = candidates.filter((c) => c.libraryId !== best.libraryId);
  return [best, ...rest];
}

function demoteFamily(
  candidates: CandidateExperiment[],
  families: ReadonlySet<ExperimentFamily>,
): { candidates: CandidateExperiment[]; demoted: boolean } {
  const demoted = candidates.filter((c) => families.has(c.family));
  const rest = candidates.filter((c) => !families.has(c.family));
  if (rest.length === 0) {
    // every candidate is in the banned family -- nothing to promote in front of it.
    return { candidates, demoted: false };
  }
  return { candidates: [...rest, ...demoted], demoted: true };
}

export function enforceExperimentRecommendationGuardrails(
  assumptionKind: AssumptionKind,
  rankedCandidates: readonly CandidateExperiment[],
): GuardrailResult {
  let candidates = [...rankedCandidates];
  const violationsCorrected: GuardrailViolationType[] = [];
  const violationsRemaining: GuardrailViolationType[] = [];

  if (assumptionKind === "willingness_to_pay") {
    const top = candidates[0];
    if (top && INTERVIEW_ONLY_FAMILIES.has(top.family)) {
      const promoted = promoteBestMatching(candidates, COMMITMENT_GRADE_FAMILIES);
      if (promoted) {
        candidates = promoted;
        violationsCorrected.push("wtp_top_result_not_commitment_grade");
      } else {
        violationsRemaining.push("wtp_top_result_not_commitment_grade");
      }
    }
  }

  if (assumptionKind === "technical_performance") {
    // Absolute ban checked first: a letter of intent must never be top-ranked here,
    // regardless of whether a benchmark-class alternative also exists.
    const topBeforeLoiCheck = candidates[0];
    if (topBeforeLoiCheck && LETTER_OF_INTENT_FAMILIES.has(topBeforeLoiCheck.family)) {
      const { candidates: next, demoted } = demoteFamily(candidates, LETTER_OF_INTENT_FAMILIES);
      candidates = next;
      if (demoted) {
        violationsCorrected.push("technical_performance_top_result_is_letter_of_intent");
      } else {
        violationsRemaining.push("technical_performance_top_result_is_letter_of_intent");
      }
    }

    const topBeforePrototypeCheck = candidates[0];
    if (
      topBeforePrototypeCheck &&
      CLICKABLE_PROTOTYPE_FAMILIES.has(topBeforePrototypeCheck.family)
    ) {
      const promoted = promoteBestMatching(candidates, TECHNICAL_BENCHMARK_FAMILIES);
      if (promoted) {
        candidates = promoted;
        violationsCorrected.push("technical_performance_top_result_is_prototype");
      } else {
        violationsRemaining.push("technical_performance_top_result_is_prototype");
      }
    }
  }

  return { rankedCandidates: candidates, violationsCorrected, violationsRemaining };
}
