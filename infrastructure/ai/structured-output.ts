import type { z } from "zod";
import { AiValidationError, type AiOperationName } from "./provider";

/**
 * Provider-agnostic parse/validate/retry loop shared by every AiProvider
 * implementation. Kept separate from any concrete SDK so it's testable with a
 * fake `generate` function -- see structured-output.test.ts.
 *
 * Per AI_BEHAVIOUR_SPEC.md §2: on schema validation failure, retry once with the
 * validation error appended to the prompt; if the retry also fails, raise a typed
 * error rather than returning malformed data.
 */
export async function resolveStructuredOutput<T>(params: {
  operation: AiOperationName;
  schema: z.ZodType<T>;
  maxRetries: number;
  /**
   * Calls the underlying model. `retryContext` is appended-prompt guidance to
   * send on a retry attempt (undefined on the first attempt).
   */
  generate: (retryContext: string | undefined) => Promise<string>;
}): Promise<{ data: T; attempts: number }> {
  let lastRawResponse = "";
  let lastErrorDescription = "";

  for (let attempt = 1; attempt <= params.maxRetries + 1; attempt += 1) {
    const retryContext =
      attempt === 1
        ? undefined
        : `Your previous response failed validation: ${lastErrorDescription}. Return corrected JSON only.`;

    const raw = await params.generate(retryContext);
    lastRawResponse = raw;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (err) {
      lastErrorDescription = err instanceof Error ? err.message : "response was not valid JSON";
      continue;
    }

    const result = params.schema.safeParse(parsedJson);
    if (result.success) {
      return { data: result.data, attempts: attempt };
    }
    lastErrorDescription = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
  }

  throw new AiValidationError(
    params.operation,
    params.maxRetries + 1,
    lastRawResponse,
    lastErrorDescription,
  );
}
