import Anthropic from "@anthropic-ai/sdk";
import type { AiCompleteArgs, AiCompleteResult, AiProvider } from "./provider";
import { resolveStructuredOutput } from "./structured-output";

/**
 * Real implementation wrapping the Anthropic Messages API, server-side only
 * (see ARCHITECTURE.md §5 -- ANTHROPIC_API_KEY never reaches the client bundle).
 * Kept thin: all retry/validation logic lives in structured-output.ts so it's
 * identical across providers and independently testable.
 */

const DEFAULT_MODEL = "claude-sonnet-5";

export interface AnthropicProviderOptions {
  apiKey: string;
  model?: string;
}

export class AnthropicProvider implements AiProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: AnthropicProviderOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async complete<T>(args: AiCompleteArgs<T>): Promise<AiCompleteResult<T>> {
    const start = Date.now();
    const maxRetries = args.maxRetries ?? 1;
    let lastTokens: number | undefined;

    const { data, attempts } = await resolveStructuredOutput({
      operation: args.operation,
      schema: args.schema,
      maxRetries,
      generate: async (retryContext) => {
        const userContent = retryContext
          ? `${args.userPrompt}\n\n${retryContext}`
          : args.userPrompt;

        // User-generated content inside userPrompt must already be delimited by the
        // caller (e.g. inside a tagged block) per AI_BEHAVIOUR_SPEC.md §4 prompt-injection
        // guidance -- this adapter does not itself distinguish instructions from data.
        const message = await this.client.messages.create({
          model: this.model,
          max_tokens: 4096,
          temperature: 0,
          system: args.systemPrompt,
          messages: [{ role: "user", content: userContent }],
        });

        lastTokens = message.usage
          ? message.usage.input_tokens + message.usage.output_tokens
          : undefined;

        const textBlock = message.content.find((block) => block.type === "text");
        return textBlock && "text" in textBlock ? textBlock.text : "";
      },
    });

    return {
      data,
      raw: {
        model: this.model,
        latencyMs: Date.now() - start,
        tokens: lastTokens,
        attempts,
      },
    };
  }
}
