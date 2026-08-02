/**
 * One Zod schema per AI operation, per AI_BEHAVIOUR_SPEC.md §3. Every AI response is
 * validated against exactly one of these before it's trusted anywhere else in the app.
 */
import { z } from "zod";

export const dfvCategorySchema = z.enum(["desirability", "feasibility", "viability"]);

export const assumptionTypeSchema = z.enum([
  "segment",
  "problem",
  "solution",
  "channel",
  "revenue",
  "cost",
  "resource",
  "activity",
  "partner",
  "data",
  "regulation",
  "adoption",
  "other",
]);

export const qualityFlagTypeSchema = z.enum([
  "vague_language",
  "compound",
  "non_testable",
  "missing_actor",
  "missing_behaviour",
  "feature_as_assumption",
  "unfounded_claim",
  "category_mismatch",
  "duplicate",
  "dfv_gap",
]);

export const experimentFamilySchema = z.enum([
  "customer_interview",
  "survey",
  "landing_page_test",
  "concierge_test",
  "wizard_of_oz",
  "smoke_test",
  "ab_test",
  "pre_order",
  "deposit",
  "purchase_order",
  "paid_pilot",
  "crowdfunding",
  "letter_of_intent",
  "prototype_test",
  "technical_benchmark",
  "field_test",
  "repeatability_test",
  "workflow_integration_test",
  "human_vs_ai_benchmark",
]);

/** 3.1 idea-clarification */
export const ideaClarificationOutputSchema = z.object({
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
  gaps: z.array(z.string()),
  insufficientInformation: z.boolean(),
});
export type IdeaClarificationOutput = z.infer<typeof ideaClarificationOutputSchema>;

/** 3.2 assumption-extraction */
export const assumptionExtractionItemSchema = z.object({
  statement: z.string().min(1),
  dfvPrimary: dfvCategorySchema,
  dfvSecondary: z.array(dfvCategorySchema),
  assumptionType: assumptionTypeSchema,
  actor: z.string().min(1),
  observableBehaviour: z.string().min(1),
  rationale: z.string().min(1),
  source: z.literal("ai_generated"),
});
export const assumptionExtractionOutputSchema = z.object({
  assumptions: z.array(assumptionExtractionItemSchema),
  dfvGapReason: z.string().optional(),
});
export type AssumptionExtractionOutput = z.infer<typeof assumptionExtractionOutputSchema>;

/** 3.3 assumption-quality-review */
export const assumptionQualityReviewOutputSchema = z.object({
  reviews: z.array(
    z.object({
      assumptionId: z.string().min(1),
      flags: z.array(
        z.object({
          type: qualityFlagTypeSchema,
          detail: z.string().min(1),
          suggestedRewrite: z.string().optional(),
        }),
      ),
    }),
  ),
});
export type AssumptionQualityReviewOutput = z.infer<typeof assumptionQualityReviewOutputSchema>;

/** 3.4 dfv-classification */
export const dfvClassificationOutputSchema = z.object({
  dfvPrimary: dfvCategorySchema,
  dfvSecondary: z.array(dfvCategorySchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
});
export type DfvClassificationOutput = z.infer<typeof dfvClassificationOutputSchema>;

/** 3.5 map-feedback */
export const mapFeedbackOutputSchema = z.object({
  highestRiskAssumptionIds: z.array(z.string()),
  inconsistentPlacements: z.array(
    z.object({ assumptionId: z.string(), reason: z.string().min(1) }),
  ),
  categoryErrors: z.array(z.object({ assumptionId: z.string(), reason: z.string().min(1) })),
  underrepresentedDfv: z.array(dfvCategorySchema),
  weakWording: z.array(z.object({ assumptionId: z.string(), reason: z.string().min(1) })),
  summary: z.string().min(1),
});
export type MapFeedbackOutput = z.infer<typeof mapFeedbackOutputSchema>;

/** 3.6 risk-priority-explanation */
export const riskPriorityExplanationOutputSchema = z.object({
  explanation: z.string().min(1),
});
export type RiskPriorityExplanationOutput = z.infer<typeof riskPriorityExplanationOutputSchema>;

/** 3.7 experiment-recommendation */
export const experimentRecommendationItemSchema = z.object({
  libraryId: z.string().min(1),
  score: z.number().min(0).max(1),
  scoreBreakdown: z.object({
    assumptionFit: z.number().min(0).max(1),
    evidenceStrengthRequired: z.number().min(0).max(1),
    costAndSpeed: z.number().min(0).max(1),
    stageAppropriateness: z.number().min(0).max(1),
    accessEthicsPracticality: z.number().min(0).max(1),
  }),
  whatItCanProve: z.string().min(1),
  whatItCannotProve: z.string().min(1),
});
export const experimentRecommendationOutputSchema = z.object({
  // Scores every candidate passed in, not just the top 5: the application-layer
  // guardrails (AI_BEHAVIOUR_SPEC.md §3.7) need the full scored set to find a
  // valid alternative even when the AI's own top pick violates a hard rule --
  // slicing to the top 5 happens after guardrails run, not before.
  recommendations: z.array(experimentRecommendationItemSchema),
});
export type ExperimentRecommendationOutput = z.infer<typeof experimentRecommendationOutputSchema>;

/** 3.8 test-card-generation */
export const testCardGenerationOutputSchema = z.object({
  objective: z.string().min(1),
  targetParticipantOrDataset: z.string().min(1),
  recruitmentOrAccessMethod: z.string().min(1),
  sampleSize: z.string().min(1),
  procedure: z.string().min(1),
  keyMetric: z.string().min(1),
  successThreshold: z.string().min(1),
  failureThreshold: z.string().min(1),
  inconclusiveRange: z.string().min(1),
  evidenceExpected: z.string().min(1),
  evidenceStrengthLevel: z.enum(["light", "medium", "strong"]),
  thresholdRationale: z.string().min(1),
});
export type TestCardGenerationOutput = z.infer<typeof testCardGenerationOutputSchema>;

/** 3.9 evidence-quality-review */
export const evidenceQualityReviewOutputSchema = z.object({
  reviews: z.array(
    z.object({
      evidenceItemId: z.string().min(1),
      concerns: z.array(z.string()),
    }),
  ),
});
export type EvidenceQualityReviewOutput = z.infer<typeof evidenceQualityReviewOutputSchema>;

/** 3.10 learning-card-synthesis */
export const learningCardSynthesisOutputSchema = z.object({
  happened: z.string().min(1),
  metricResult: z.string().min(1),
  insight: z.string().min(1),
  confidence: z.number().min(0).max(1),
  contradictionNote: z.string().optional(),
});
export type LearningCardSynthesisOutput = z.infer<typeof learningCardSynthesisOutputSchema>;

/** 3.11 next-experiment-recommendation */
export const nextExperimentRecommendationOutputSchema = z.object({
  suggestedAssumptionStatement: z.string().optional(),
  suggestedExperimentFamily: experimentFamilySchema.optional(),
  rationale: z.string().optional(),
  insufficientInformation: z.boolean(),
});
export type NextExperimentRecommendationOutput = z.infer<
  typeof nextExperimentRecommendationOutputSchema
>;

/** 3.12 facilitator-feedback (Phase 3, schema stable now) */
export const facilitatorFeedbackOutputSchema = z.object({
  coachingPrompts: z.array(z.string()),
});
export type FacilitatorFeedbackOutput = z.infer<typeof facilitatorFeedbackOutputSchema>;
