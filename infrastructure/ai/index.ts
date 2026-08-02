import { getEnv } from "@/lib/env";
import { AnthropicProvider } from "./anthropic-provider";
import { MockAiProvider } from "./mock-provider";
import type { AiProvider } from "./provider";

export * from "./provider";
export * from "./schemas";

let cached: AiProvider | undefined;

/** Selects the provider per AI_PROVIDER, per ARCHITECTURE.md §5. Cached per process. */
export function getAiProvider(): AiProvider {
  if (cached) return cached;

  const env = getEnv();
  cached =
    env.AI_PROVIDER === "anthropic"
      ? new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY! })
      : new MockAiProvider();

  return cached;
}
