/**
 * Prioritisation-aid formulas from DOMAIN_MODEL.md §3. These are explicitly
 * framed to users as an aid, not an objective ranking — see PRODUCT_REQUIREMENTS.md
 * §5 (Stage 4) and CLAUDE.md rule 3 (no single aggregate "venture score").
 */

export interface ImportanceEvidenceInput {
  /** 0..10, how consequential the assumption is if wrong. */
  importanceScore: number;
  /** 0..10, how much credible evidence currently supports the assumption. */
  evidenceStrengthScore: number;
}

function assertInRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${label} must be within ${min}..${max}, got ${value}`);
  }
}

/** Maps a 0..10 score to a 0..1 normalised value. */
export function normaliseScore(score: number): number {
  assertInRange(score, 0, 10, "score");
  return score / 10;
}

/** How much evidence is still missing, 0 (fully supported) .. 1 (no evidence). */
export function evidenceGap(evidenceStrengthScore: number): number {
  return 1 - normaliseScore(evidenceStrengthScore);
}

/**
 * risk_priority = normalised_importance × evidence_gap
 *
 * Higher importance combined with weaker evidence produces a higher priority.
 * Range: 0..1.
 */
export function riskPriority({
  importanceScore,
  evidenceStrengthScore,
}: ImportanceEvidenceInput): number {
  return normaliseScore(importanceScore) * evidenceGap(evidenceStrengthScore);
}

/**
 * Weights for the experiment-recommendation score, per AI_BEHAVIOUR_SPEC.md §3.7
 * and DOMAIN_MODEL.md §3. Sums to 1.0 — kept as named constants so the UI can
 * render the breakdown rather than a single opaque number.
 */
export const RECOMMENDATION_WEIGHTS = {
  assumptionFit: 0.4,
  evidenceStrengthRequired: 0.25,
  costAndSpeed: 0.15,
  stageAppropriateness: 0.1,
  accessEthicsPracticality: 0.1,
} as const;

export interface RecommendationScoreBreakdown {
  /** 0..1, how precisely the experiment targets this exact assumption. */
  assumptionFit: number;
  /** 0..1, how well the experiment's evidence strength matches what's required. */
  evidenceStrengthRequired: number;
  /** 0..1, inverse of relative cost/time burden. */
  costAndSpeed: number;
  /** 0..1, fit to the venture's current stage. */
  stageAppropriateness: number;
  /** 0..1, access/ethics/operational practicality. */
  accessEthicsPracticality: number;
}

export function recommendationScore(breakdown: RecommendationScoreBreakdown): number {
  for (const [key, value] of Object.entries(breakdown)) {
    assertInRange(value, 0, 1, key);
  }

  return (
    breakdown.assumptionFit * RECOMMENDATION_WEIGHTS.assumptionFit +
    breakdown.evidenceStrengthRequired * RECOMMENDATION_WEIGHTS.evidenceStrengthRequired +
    breakdown.costAndSpeed * RECOMMENDATION_WEIGHTS.costAndSpeed +
    breakdown.stageAppropriateness * RECOMMENDATION_WEIGHTS.stageAppropriateness +
    breakdown.accessEthicsPracticality * RECOMMENDATION_WEIGHTS.accessEthicsPracticality
  );
}
