import type {
  Assumption,
  AssumptionRepository,
  AssumptionSource,
  AssumptionStatus,
  AssumptionType,
  CreateAssumptionFields,
  DfvCategory,
  UpdateAssumptionFields,
} from "@/application/assumptions/assumption-repository";
import { getPool } from "./db";

interface AssumptionRow {
  id: string;
  venture_id: string;
  statement: string;
  dfv_primary: DfvCategory;
  dfv_secondary: DfvCategory[];
  assumption_type: AssumptionType;
  actor: string | null;
  observable_behaviour: string | null;
  importance_score: string | null;
  evidence_strength_score: string | null;
  rationale: string | null;
  source: AssumptionSource;
  status: AssumptionStatus;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

function toAssumption(row: AssumptionRow): Assumption {
  return {
    id: row.id,
    ventureId: row.venture_id,
    statement: row.statement,
    dfvPrimary: row.dfv_primary,
    dfvSecondary: row.dfv_secondary ?? [],
    assumptionType: row.assumption_type,
    actor: row.actor,
    observableBehaviour: row.observable_behaviour,
    importanceScore: row.importance_score === null ? null : Number(row.importance_score),
    evidenceStrengthScore:
      row.evidence_strength_score === null ? null : Number(row.evidence_strength_score),
    rationale: row.rationale,
    source: row.source,
    status: row.status,
    ownerId: row.owner_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PostgresAssumptionRepository implements AssumptionRepository {
  async create(fields: CreateAssumptionFields): Promise<Assumption> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("begin");
      const { rows } = await client.query<AssumptionRow>(
        `insert into assumptions
           (venture_id, statement, dfv_primary, dfv_secondary, assumption_type, actor,
            observable_behaviour, rationale, source, status, owner_id, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, $11)
         returning *`,
        [
          fields.ventureId,
          fields.statement,
          fields.dfvPrimary,
          fields.dfvSecondary,
          fields.assumptionType,
          fields.actor,
          fields.observableBehaviour,
          fields.rationale,
          fields.source,
          fields.ownerId,
          fields.createdBy,
        ],
      );
      const assumption = rows[0]!;
      await client.query(
        `insert into assumption_versions (assumption_id, version_no, statement_snapshot, changed_by)
         values ($1, 1, $2, $3)`,
        [assumption.id, assumption.statement, fields.createdBy],
      );
      await client.query("commit");
      return toAssumption(assumption);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  async listByVenture(ventureId: string): Promise<Assumption[]> {
    const { rows } = await getPool().query<AssumptionRow>(
      `select * from assumptions where venture_id = $1 and deleted_at is null order by created_at asc`,
      [ventureId],
    );
    return rows.map(toAssumption);
  }

  async findById(id: string): Promise<Assumption | null> {
    const { rows } = await getPool().query<AssumptionRow>(
      `select * from assumptions where id = $1 and deleted_at is null`,
      [id],
    );
    return rows[0] ? toAssumption(rows[0]) : null;
  }

  async update(id: string, fields: UpdateAssumptionFields, changedBy: string): Promise<Assumption> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("begin");

      const setClauses: string[] = [];
      const values: unknown[] = [];
      let i = 1;

      function set(column: string, value: unknown) {
        setClauses.push(`${column} = $${i}`);
        values.push(value);
        i += 1;
      }

      if (fields.statement !== undefined) set("statement", fields.statement);
      if (fields.dfvPrimary !== undefined) set("dfv_primary", fields.dfvPrimary);
      if (fields.dfvSecondary !== undefined) set("dfv_secondary", fields.dfvSecondary);
      if (fields.actor !== undefined) set("actor", fields.actor);
      if (fields.observableBehaviour !== undefined)
        set("observable_behaviour", fields.observableBehaviour);
      if (fields.importanceScore !== undefined) set("importance_score", fields.importanceScore);
      if (fields.evidenceStrengthScore !== undefined)
        set("evidence_strength_score", fields.evidenceStrengthScore);
      if (fields.status !== undefined) set("status", fields.status);
      if (fields.editedByUser) set("source", "ai_generated_user_edited");

      if (setClauses.length === 0) {
        const { rows } = await client.query<AssumptionRow>(
          "select * from assumptions where id = $1",
          [id],
        );
        await client.query("commit");
        return toAssumption(rows[0]!);
      }

      values.push(id);
      const { rows } = await client.query<AssumptionRow>(
        `update assumptions set ${setClauses.join(", ")} where id = $${i} returning *`,
        values,
      );
      const assumption = rows[0]!;

      if (fields.statement !== undefined) {
        const { rows: versionRows } = await client.query<{ max: number | null }>(
          "select max(version_no) as max from assumption_versions where assumption_id = $1",
          [id],
        );
        const nextVersion = (versionRows[0]?.max ?? 0) + 1;
        await client.query(
          `insert into assumption_versions
             (assumption_id, version_no, statement_snapshot, changed_fields, changed_by)
           values ($1, $2, $3, $4, $5)`,
          [id, nextVersion, assumption.statement, JSON.stringify(fields), changedBy],
        );
      }

      await client.query("commit");
      return toAssumption(assumption);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  async softDelete(id: string): Promise<void> {
    await getPool().query("update assumptions set deleted_at = now() where id = $1", [id]);
  }
}
