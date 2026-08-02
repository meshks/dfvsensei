import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetEnvCacheForTests, getEnv } from "./env";

const REQUIRED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
] as const;

const VALID_BASE_ENV: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:5432/dev",
};

let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
  __resetEnvCacheForTests();
});

afterEach(() => {
  process.env = originalEnv;
  __resetEnvCacheForTests();
});

function setEnv(overrides: Record<string, string | undefined>) {
  for (const key of [...REQUIRED_KEYS, "AI_PROVIDER", "ANTHROPIC_API_KEY", "NODE_ENV"]) {
    delete process.env[key];
  }
  Object.assign(process.env, VALID_BASE_ENV, overrides);
}

describe("getEnv", () => {
  it("parses a valid environment and defaults AI_PROVIDER to mock", () => {
    setEnv({});
    const env = getEnv();
    expect(env.AI_PROVIDER).toBe("mock");
    expect(env.DATABASE_URL).toBe(VALID_BASE_ENV.DATABASE_URL);
  });

  it("throws with a readable message when a required var is missing", () => {
    setEnv({ DATABASE_URL: undefined });
    expect(() => getEnv()).toThrow(/DATABASE_URL/);
  });

  it("treats an empty-string ANTHROPIC_API_KEY as unset, not invalid", () => {
    // Regression test: a .env file line like `ANTHROPIC_API_KEY=` sets the value
    // to "" in process.env, not undefined -- this must not fail validation for an
    // optional field when AI_PROVIDER is "mock". Caught via a real `pnpm start`
    // smoke test that returned empty API responses before this fix.
    setEnv({ AI_PROVIDER: "mock", ANTHROPIC_API_KEY: "" });
    expect(() => getEnv()).not.toThrow();
    expect(getEnv().ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("requires ANTHROPIC_API_KEY when AI_PROVIDER is anthropic", () => {
    setEnv({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "" });
    expect(() => getEnv()).toThrow(/AI_PROVIDER=anthropic requires ANTHROPIC_API_KEY/);
  });

  it("accepts AI_PROVIDER=anthropic with a real key", () => {
    setEnv({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-ant-real-key" });
    expect(() => getEnv()).not.toThrow();
  });

  it("caches the result across calls", () => {
    setEnv({});
    const first = getEnv();
    process.env.DATABASE_URL = "postgres://changed/after/first/call";
    const second = getEnv();
    expect(second).toBe(first);
  });
});
