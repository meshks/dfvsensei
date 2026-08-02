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
  type ExperimentRecommendationOutput,
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
  // A real scored list is generated per-call from the candidates embedded in
  // the prompt (see buildExperimentRecommendationFixture) -- an always-empty
  // fixture made "Get recommendations" look broken with no candidates ever
  // returned. This entry stays for FIXTURE_SCHEMAS/test round-tripping only.
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

const TIME_OR_COST_SCORE: Record<"short" | "medium" | "long" | "low" | "high", number> = {
  short: 1,
  low: 1,
  medium: 0.6,
  long: 0.3,
  high: 0.3,
};

const EVIDENCE_STRENGTH_SCORE: Record<"light" | "medium" | "strong", number> = {
  light: 0.4,
  medium: 0.65,
  strong: 0.9,
};

/**
 * The real prompt (recommend-experiments.ts buildUserPrompt) embeds the full
 * candidate list as plain text. Parsing it back out lets the mock return a
 * schema-valid, scored recommendation for every real candidate instead of an
 * empty list -- "Get recommendations" would otherwise always show nothing
 * under AI_PROVIDER=mock, since recommend-experiments.ts filters its output
 * down to candidateById matches. Deterministic scoring, not real reasoning:
 * clearly labelled [mock] throughout, same convention as every other fixture.
 */
function buildExperimentRecommendationFixture(userPrompt: string): ExperimentRecommendationOutput {
  const blocks = userPrompt
    .split(/\n(?=- libraryId: )/)
    .filter((b) => b.startsWith("- libraryId:"));

  const recommendations = blocks.flatMap((block) => {
    const libraryId = /libraryId: (\S+)/.exec(block)?.[1];
    const name = /name: ([^\n]+)/.exec(block)?.[1]?.trim();
    const evidenceStrength = /evidenceStrength: (light|medium|strong)/.exec(block)?.[1] as
      "light" | "medium" | "strong" | undefined;
    const setupTime = /setupTime: (short|medium|long)/.exec(block)?.[1] as
      "short" | "medium" | "long" | undefined;
    const runTime = /runTime: (short|medium|long)/.exec(block)?.[1] as
      "short" | "medium" | "long" | undefined;
    const relativeCost = /relativeCost: (low|medium|high)/.exec(block)?.[1] as
      "low" | "medium" | "high" | undefined;

    if (!libraryId || !name || !evidenceStrength || !setupTime || !runTime || !relativeCost) {
      return [];
    }

    const evidenceScore = EVIDENCE_STRENGTH_SCORE[evidenceStrength];
    const costAndSpeed =
      (TIME_OR_COST_SCORE[setupTime] +
        TIME_OR_COST_SCORE[runTime] +
        TIME_OR_COST_SCORE[relativeCost]) /
      3;
    const scoreBreakdown = {
      assumptionFit: evidenceScore,
      evidenceStrengthRequired: evidenceScore,
      costAndSpeed,
      stageAppropriateness: 0.6,
      accessEthicsPracticality: 0.6,
    };
    const score =
      scoreBreakdown.assumptionFit * 0.4 +
      scoreBreakdown.evidenceStrengthRequired * 0.25 +
      scoreBreakdown.costAndSpeed * 0.15 +
      scoreBreakdown.stageAppropriateness * 0.1 +
      scoreBreakdown.accessEthicsPracticality * 0.1;

    return [
      {
        libraryId,
        score,
        scoreBreakdown,
        whatItCanProve: `[mock] What "${name}" can plausibly show, based on its ${evidenceStrength} evidence strength -- not real model reasoning (AI_PROVIDER=mock).`,
        whatItCannotProve: `[mock] Does not by itself prove anything beyond what a ${evidenceStrength}-evidence experiment can show.`,
      },
    ];
  });

  return { recommendations };
}

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
        if (args.operation === "experiment-recommendation") {
          return JSON.stringify(buildExperimentRecommendationFixture(args.userPrompt));
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
