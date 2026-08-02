import pg from "pg";
import { getEnv } from "@/lib/env";
import { resolveSsl } from "./resolve-ssl";

const { Pool } = pg;

let pool: pg.Pool | undefined;

/**
 * Direct Postgres pool for local dev/tests and for repository implementations
 * before Phase 2 introduces the Supabase JS client + RLS (ARCHITECTURE.md §5,
 * DOMAIN_MODEL.md §4). Repositories depend on this, not on `pg` directly, so
 * swapping to the Supabase client later touches this module only.
 */
export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = getEnv().DATABASE_URL;
    pool = new Pool({ connectionString, ssl: resolveSsl(connectionString) });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
