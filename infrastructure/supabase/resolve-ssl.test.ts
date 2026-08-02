import { describe, expect, it } from "vitest";
import { resolveSsl } from "./resolve-ssl";

describe("resolveSsl", () => {
  it("disables SSL for local Postgres", () => {
    expect(resolveSsl("postgres://postgres:postgres@127.0.0.1:5432/dfv_sensei_dev")).toBe(false);
    expect(resolveSsl("postgres://postgres:postgres@localhost:5432/dfv_sensei_dev")).toBe(false);
  });

  it("requires SSL for a hosted database like Supabase, which rejects plain connections", () => {
    expect(
      resolveSsl(
        "postgresql://postgres.abc:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
      ),
    ).toEqual({ rejectUnauthorized: false });
  });
});
