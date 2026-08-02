/**
 * Phase 1 stand-in for authentication (PRODUCT_REQUIREMENTS.md §7, A3): a single
 * seeded user, created by scripts/db/seed.ts. Every mutation in this phase acts
 * as this user. Replaced by real Supabase Auth sessions in Phase 2 -- callers
 * that read this constant are exactly the call sites that need to change then.
 */
export const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
