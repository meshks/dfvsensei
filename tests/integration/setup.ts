// Integration tests exercise the real Postgres schema (DOMAIN_MODEL.md), so they
// need a live DATABASE_URL. The other env vars aren't touched by these tests but
// getEnv() requires them to be present -- default to harmless local values so
// `pnpm test:integration` works out of the box against the local dev Postgres
// started for this session; override any of these via a real .env.local/CI env.

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.DATABASE_URL ??= "postgres://postgres:postgres@127.0.0.1:5432/dfv_sensei_test";
process.env.AI_PROVIDER ??= "mock";
