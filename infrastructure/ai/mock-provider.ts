import type { z } from "zod";
import {
  type AiCompleteArgs,
  type AiCompleteResult,
  type AiOperationName,
  type AiProvider,
} from "./provider";
import {
  assumptionExtractionOutputSchema,
  assumptionQualityReviewOutputSchema,
  dfvClassificationOutputSchema,
  evidenceQualityReviewOutputSchema,
  experimentRecommendationOutputSchema,
  facilitatorFeedbackOutputSchema,
  ideaClarificationOutputSchema,
  learningCardSynthesisOutputSchema,
  mapFeedbackOutputSchema,
  nextExperimentRecommendationOutputSchema,
  riskPriorityExplanationOutputSchema,
  testCardGenerationOutputSchema,
} from "./schemas";
import { resolveStructuredOutput } from "./structured-output";

/**
 * Returns fixture data for local development and tests with zero external calls
 * (AI_PROVIDER=mock, see .env.example and ARCHITECTURE.md §5). Every fixture is
 * schema-valid by construction -- fixture-vs-schema drift is caught in
 * mock-provider.test.ts, which round-trips each one through its real schema.
 *
 * This is intentionally NOT a language model: it returns static, clearly-labelled
 * placeholder content regardless of prompt text. It exists to let the rest of the
 * app (and its tests) exercise the full AiProvider contract -- including the
 * retry path, via `simulateValidationFailureOnce` -- without a real API key.
 */

const MOCK_FIXTURES: Record<AiOperationName, unknown> = {
  "idea-clarification": {
    summary:
      "We help [mock: specific customer] who struggle with [mock: important problem] by " +
      "providing [mock: solution], so they can achieve [mock: measurable outcome].",
    confidence: 0.4,
    gaps: ["target customer needs more specificity", "measurable outcome is not yet quantified"],
    insufficientInformation: false,
  },
  "assumption-extraction": {
    assumptions: [
      {
        statement: "We believe the target customer segment experiences this problem frequently.",
        dfvPrimary: "desirability",
        dfvSecondary: [],
        assumptionType: "problem",
        actor: "target customer",
        observableBehaviour: "reports encountering the problem at least weekly",
        rationale: "[mock] Frequency determines whether this is worth solving at all.",
        source: "ai_generated",
      },
      {
        statement:
          "We believe the proposed solution can be delivered reliably at the required scale.",
        dfvPrimary: "feasibility",
        dfvSecondary: [],
        assumptionType: "resource",
        actor: "the venture team",
        observableBehaviour: "meets the defined reliability threshold under real conditions",
        rationale: "[mock] Reliability at scale is usually the hidden feasibility risk.",
        source: "ai_generated",
      },
      {
        statement: "We believe the target customer will pay a price that covers cost to serve.",
        dfvPrimary: "viability",
        dfvSecondary: [],
        assumptionType: "revenue",
        actor: "target customer",
        observableBehaviour: "commits to payment at or above the proposed price point",
        rationale:
          "[mock] Willingness to pay is distinct from willingness to say yes in an interview.",
        source: "ai_generated",
      },
    ],
  },
  "assumption-quality-review": {
    reviews: [],
  },
  "dfv-classification": {
    dfvPrimary: "desirability",
    dfvSecondary: [],
    confidence: 0.5,
    rationale: "[mock] Default classification; not based on real model reasoning.",
  },
  "map-feedback": {
    highestRiskAssumptionIds: [],
    inconsistentPlacements: [],
    categoryErrors: [],
    underrepresentedDfv: [],
    weakWording: [],
    summary: "[mock] No map feedback generated -- AI_PROVIDER=mock.",
  },
  "risk-priority-explanation": {
    explanation:
      "[mock] This is a prioritisation aid based on importance and evidence strength, not a verdict.",
  },
  "experiment-recommendation": {
    recommendations: [],
  },
  "test-card-generation": {
    objective: "[mock] Objective not generated -- AI_PROVIDER=mock.",
    targetParticipantOrDataset: "[mock] target participant",
    recruitmentOrAccessMethod: "[mock] recruitment method",
    sampleSize: "[mock] sample size",
    procedure: "[mock] procedure",
    keyMetric: "[mock] key metric",
    successThreshold: "[mock] success threshold",
    failureThreshold: "[mock] failure threshold",
    inconclusiveRange: "[mock] inconclusive range",
    evidenceExpected: "[mock] evidence expected",
    evidenceStrengthLevel: "medium",
    thresholdRationale: "[mock] rationale not generated -- AI_PROVIDER=mock.",
  },
  "evidence-quality-review": {
    reviews: [],
  },
  "learning-card-synthesis": {
    happened: "[mock] not generated -- AI_PROVIDER=mock.",
    metricResult: "[mock] not generated",
    insight: "[mock] not generated",
    confidence: 0.3,
  },
  "next-experiment-recommendation": {
    insufficientInformation: true,
  },
  "facilitator-feedback": {
    coachingPrompts: [],
  },
};

const FIXTURE_SCHEMAS: Record<AiOperationName, z.ZodType> = {
  "idea-clarification": ideaClarificationOutputSchema,
  "assumption-extraction": assumptionExtractionOutputSchema,
  "assumption-quality-review": assumptionQualityReviewOutputSchema,
  "dfv-classification": dfvClassificationOutputSchema,
  "map-feedback": mapFeedbackOutputSchema,
  "risk-priority-explanation": riskPriorityExplanationOutputSchema,
  "experiment-recommendation": experimentRecommendationOutputSchema,
  "test-card-generation": testCardGenerationOutputSchema,
  "evidence-quality-review": evidenceQualityReviewOutputSchema,
  "learning-card-synthesis": learningCardSynthesisOutputSchema,
  "next-experiment-recommendation": nextExperimentRecommendationOutputSchema,
  "facilitator-feedback": facilitatorFeedbackOutputSchema,
};

export { FIXTURE_SCHEMAS as __mockFixtureSchemasForTests, MOCK_FIXTURES as __mockFixturesForTests };

export interface MockAiProviderOptions {
  /** Simulates one malformed response before succeeding, to exercise the retry path. */
  simulateValidationFailureOnce?: boolean;
  /** Simulated latency per call, in ms. Defaults to 0 for fast tests. */
  latencyMs?: number;
}

export class MockAiProvider implements AiProvider {
  private readonly simulateValidationFailureOnce: boolean;
  private readonly latencyMs: number;
  private hasFailedOnce = false;

  constructor(options: MockAiProviderOptions = {}) {
    this.simulateValidationFailureOnce = options.simulateValidationFailureOnce ?? false;
    this.latencyMs = options.latencyMs ?? 0;
  }

  async complete<T>(args: AiCompleteArgs<T>): Promise<AiCompleteResult<T>> {
    const start = Date.now();
    const maxRetries = args.maxRetries ?? 1;

    const { data, attempts } = await resolveStructuredOutput({
      operation: args.operation,
      schema: args.schema,
      maxRetries,
      generate: async () => {
        if (this.simulateValidationFailureOnce && !this.hasFailedOnce) {
          this.hasFailedOnce = true;
          return "not valid json, to exercise the retry path";
        }
        if (this.latencyMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
        }
        return JSON.stringify(MOCK_FIXTURES[args.operation]);
      },
    });

    return {
      data,
      raw: {
        model: "mock",
        latencyMs: Date.now() - start,
        attempts,
      },
    };
  }
}
