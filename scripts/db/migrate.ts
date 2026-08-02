import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { resolveSsl } from "../../infrastructure/supabase/resolve-ssl";

const { Client } = pg;

/**
 * Applies every .sql file in supabase/migrations, in filename order, inside a
 * single transaction. Local dev/test tool only -- production migrations go
 * through Supabase's own migration flow once Phase 2 sets that up.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Copy .env.example to .env.local and set it.");
  }

  const migrationsDir = join(import.meta.dirname, "../../supabase/migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found in supabase/migrations.");
    return;
  }

  const client = new Client({ connectionString: databaseUrl, ssl: resolveSsl(databaseUrl) });
  await client.connect();

  try {
    await client.query(`
      create table if not exists _migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const { rows: applied } = await client.query<{ filename: string }>(
      "select filename from _migrations",
    );
    const appliedSet = new Set(applied.map((r) => r.filename));
    const pending = files.filter((f) => !appliedSet.has(f));

    if (pending.length === 0) {
      console.log("No pending migrations -- database is up to date.");
      return;
    }

    for (const file of pending) {
      console.log(`Applying ${file}...`);
      const sql = readFileSync(join(migrationsDir, file), "utf-8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into _migrations (filename) values ($1)", [file]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    }
    console.log(`Applied ${pending.length} migration file(s) successfully.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
