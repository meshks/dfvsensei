import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closePool, getPool } from "@/infrastructure/supabase/db";

/**
 * Exercises the real schema from supabase/migrations/0001_init.sql against a
 * live Postgres instance (DATABASE_URL, see tests/integration/setup.ts).
 * Precondition: migrations are already applied -- run `pnpm db:migrate` first
 * (see CLAUDE.md commands). These tests don't self-migrate so they stay fast
 * and so a broken migration fails loudly via `pnpm db:migrate` rather than
 * being silently patched over by test setup.
 */

const USER_ID = "10000000-0000-0000-0000-000000000001";
const VENTURE_ID = "10000000-0000-0000-0000-000000000002";
const ASSUMPTION_ID = "10000000-0000-0000-0000-000000000003";
const LIBRARY_ID = "10000000-0000-0000-0000-000000000004";
const EXPERIMENT_ID = "10000000-0000-0000-0000-000000000005";

async function seedBaseFixtures() {
  const pool = getPool();
  await pool.query(`insert into users (id, email, display_name) values ($1, $2, $3)`, [
    USER_ID,
    "test@example.com",
    "Test User",
  ]);
  await pool.query(
    `insert into ventures (id, name, entry_path, owner_id) values ($1, $2, $3, $4)`,
    [VENTURE_ID, "Test Venture", "market_led", USER_ID],
  );
  await pool.query(
    `insert into assumptions (id, venture_id, statement, dfv_primary, assumption_type, source, owner_id, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      ASSUMPTION_ID,
      VENTURE_ID,
      "We believe target customers will pay for this.",
      "viability",
      "revenue",
      "user_generated",
      USER_ID,
      USER_ID,
    ],
  );
  await pool.query(
    `insert into experiment_library
       (id, name, original_summary, experiment_family, discovery_or_validation, evidence_strength, setup_time, run_time, relative_cost)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      LIBRARY_ID,
      "Paid pilot",
      "A short paid engagement to test real willingness to pay.",
      "paid_pilot",
      "validation",
      "strong",
      "medium",
      "medium",
      "medium",
    ],
  );
  await pool.query(
    `insert into experiments (id, venture_id, library_id, assumption_id) values ($1, $2, $3, $4)`,
    [EXPERIMENT_ID, VENTURE_ID, LIBRARY_ID, ASSUMPTION_ID],
  );
}

beforeEach(async () => {
  const pool = getPool();
  await pool.query(
    "truncate table ventures, users, experiment_library, ai_prompt_versions restart identity cascade",
  );
});

afterAll(async () => {
  await closePool();
});

describe("ventures / assumptions", () => {
  it("inserts and reads back a venture", async () => {
    await seedBaseFixtures();
    const { rows } = await getPool().query("select name, entry_path from ventures where id = $1", [
      VENTURE_ID,
    ]);
    expect(rows).toEqual([{ name: "Test Venture", entry_path: "market_led" }]);
  });

  it("rejects an invalid entry_path", async () => {
    const pool = getPool();
    await pool.query(`insert into users (id, email, display_name) values ($1, $2, $3)`, [
      USER_ID,
      "test@example.com",
      "Test User",
    ]);
    await expect(
      pool.query(`insert into ventures (name, entry_path, owner_id) values ($1, $2, $3)`, [
        "Bad venture",
        "not_a_real_path",
        USER_ID,
      ]),
    ).rejects.toThrow(/violates check constraint/);
  });

  it("cascade-deletes assumptions when their venture is deleted", async () => {
    await seedBaseFixtures();
    // experiments/test_cards reference the assumption too; delete them first
    // so the cascade under test is isolated to ventures -> assumptions.
    await getPool().query("delete from experiments where id = $1", [EXPERIMENT_ID]);
    await getPool().query("delete from ventures where id = $1", [VENTURE_ID]);
    const { rows } = await getPool().query("select id from assumptions where id = $1", [
      ASSUMPTION_ID,
    ]);
    expect(rows).toEqual([]);
  });
});

describe("test_cards threshold constraint (DOMAIN_MODEL.md §2)", () => {
  it("allows a draft test card without thresholds", async () => {
    await seedBaseFixtures();
    await expect(
      getPool().query(
        `insert into test_cards (venture_id, assumption_id, experiment_id, owner_id, status)
         values ($1, $2, $3, $4, 'draft')`,
        [VENTURE_ID, ASSUMPTION_ID, EXPERIMENT_ID, USER_ID],
      ),
    ).resolves.toBeDefined();
  });

  it("rejects a ready test card without thresholds", async () => {
    await seedBaseFixtures();
    await expect(
      getPool().query(
        `insert into test_cards (venture_id, assumption_id, experiment_id, owner_id, status)
         values ($1, $2, $3, $4, 'ready')`,
        [VENTURE_ID, ASSUMPTION_ID, EXPERIMENT_ID, USER_ID],
      ),
    ).rejects.toThrow(/test_cards_thresholds_required_past_draft/);
  });

  it("allows a ready test card once thresholds are populated", async () => {
    await seedBaseFixtures();
    await expect(
      getPool().query(
        `insert into test_cards
           (venture_id, assumption_id, experiment_id, owner_id, status,
            success_threshold, failure_threshold, inconclusive_range)
         values ($1, $2, $3, $4, 'ready', $5, $6, $7)`,
        [
          VENTURE_ID,
          ASSUMPTION_ID,
          EXPERIMENT_ID,
          USER_ID,
          "5+ paid pilots signed",
          "0-1 paid pilots signed",
          "2-4 paid pilots signed",
        ],
      ),
    ).resolves.toBeDefined();
  });
});

describe("evidence_items restrict-delete (DOMAIN_MODEL.md §6)", () => {
  it("prevents deleting a test card that already has recorded evidence", async () => {
    await seedBaseFixtures();
    const pool = getPool();
    const { rows } = await pool.query<{ id: string }>(
      `insert into test_cards (venture_id, assumption_id, experiment_id, owner_id, status)
       values ($1, $2, $3, $4, 'draft') returning id`,
      [VENTURE_ID, ASSUMPTION_ID, EXPERIMENT_ID, USER_ID],
    );
    const testCardId = rows[0]!.id;

    await pool.query(
      `insert into evidence_items (test_card_id, evidence_type, description, owner_id)
       values ($1, 'commitment', 'Signed a paid pilot agreement.', $2)`,
      [testCardId, USER_ID],
    );

    await expect(pool.query("delete from test_cards where id = $1", [testCardId])).rejects.toThrow(
      /violates foreign key constraint/,
    );
  });
});

describe("ai_prompt_versions uniqueness", () => {
  it("rejects a duplicate (operation_name, version) pair", async () => {
    const pool = getPool();
    await pool.query(
      `insert into ai_prompt_versions (operation_name, version, template_ref, schema_ref)
       values ('idea-clarification', 'v1', 'tpl-ref', 'schema-ref')`,
    );
    await expect(
      pool.query(
        `insert into ai_prompt_versions (operation_name, version, template_ref, schema_ref)
         values ('idea-clarification', 'v1', 'other-ref', 'other-schema')`,
      ),
    ).rejects.toThrow(/duplicate key value violates unique constraint/);
  });
});
