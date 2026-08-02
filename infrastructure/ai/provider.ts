import type { z } from "zod";

/**
 * See AI_BEHAVIOUR_SPEC.md §2. Domain/application code depends only on this
 * interface, never on a concrete SDK -- swapping providers is a single adapter
 * change. Implementations: MockAiProvider (infrastructure/ai/mock-provider.ts),
 * AnthropicProvider (infrastructure/ai/anthropic-provider.ts).
 */
export type AiOperationName =
  | "idea-clarification"
  | "assumption-extraction"
  | "assumption-quality-review"
  | "dfv-classification"
  | "map-feedback"
  | "risk-priority-explanation"
  | "experiment-recommendation"
  | "test-card-generation"
  | "evidence-quality-review"
  | "learning-card-synthesis"
  | "next-experiment-recommendation"
  | "facilitator-feedback";

export interface AiCompleteArgs<T> {
  operation: AiOperationName;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  /** Retries on schema validation failure only. Default 1, per AI_BEHAVIOUR_SPEC.md §2. */
  maxRetries?: number;
}

export interface AiCompleteMeta {
  model: string;
  latencyMs: number;
  tokens?: number;
  /** How many attempts it took to get a schema-valid response (1 = first try). */
  attempts: number;
}

export interface AiCompleteResult<T> {
  data: T;
  raw: AiCompleteMeta;
}

export interface AiProvider {
  complete<T>(args: AiCompleteArgs<T>): Promise<AiCompleteResult<T>>;
}

/**
 * Thrown when every retry attempt still fails schema validation. The caller
 * (an application/ use-case) is expected to catch this and log an `ai_runs` row
 * with status='validation_failed', per AI_BEHAVIOUR_SPEC.md §2 and §4.
 */
export class AiValidationError extends Error {
  constructor(
    public readonly operation: AiOperationName,
    public readonly attempts: number,
    public readonly lastRawResponse: string,
    cause?: unknown,
  ) {
    super(`AI operation "${operation}" failed schema validation after ${attempts} attempt(s).`);
    this.name = "AiValidationError";
    this.cause = cause;
  }
}
