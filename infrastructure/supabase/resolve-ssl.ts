/**
 * Local Postgres (dev/tests) has no SSL configured; Supabase and other hosted
 * Postgres providers require it for external connections and reject a plain
 * connection outright. Detect by host rather than NODE_ENV, since `next start`
 * also sets NODE_ENV=production for local production-build smoke tests.
 */
export function resolveSsl(connectionString: string): false | { rejectUnauthorized: boolean } {
  const isLocal = /(^|@)(localhost|127\.0\.0\.1)/.test(connectionString);
  return isLocal ? false : { rejectUnauthorized: false };
}
