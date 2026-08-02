import { z } from "zod";

/**
 * Fail fast at boot with a clear message rather than an `undefined` deep in a
 * request handler. See ARCHITECTURE.md §5.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  AI_PROVIDER: z.enum(["anthropic", "mock"]).default("mock"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * A .env file setting a key to an empty string (e.g. `ANTHROPIC_API_KEY=` with
 * nothing after it, as in .env.example) still puts that key in process.env as
 * "" -- not undefined. Without this, an optional field's `.min(1)` check fails
 * on "unset" values instead of treating them as genuinely unset.
 */
function emptyStringsToUndefined(env: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    result[key] = value === "" ? undefined : value;
  }
  return result;
}

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(emptyStringsToUndefined(process.env));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  if (parsed.data.AI_PROVIDER === "anthropic" && !parsed.data.ANTHROPIC_API_KEY) {
    throw new Error(
      "AI_PROVIDER=anthropic requires ANTHROPIC_API_KEY to be set. " +
        "Set AI_PROVIDER=mock to develop without a real key.",
    );
  }

  cached = parsed.data;
  return cached;
}

/** Test-only escape hatch so unit tests don't need a full .env file. */
export function __resetEnvCacheForTests(): void {
  cached = undefined;
}
