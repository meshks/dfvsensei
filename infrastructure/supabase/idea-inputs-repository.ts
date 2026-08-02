import type {
  IdeaInput,
  IdeaInputRepository,
  SaveIdeaInputFields,
} from "@/application/ideas/idea-input-repository";
import { getPool } from "./db";

interface IdeaInputRow {
  id: string;
  venture_id: string;
  target_customer: string | null;
  user_buyer_payer_note: string | null;
  problem: string | null;
  solution_or_ip: string | null;
  outcome: string | null;
  current_alternatives: string | null;
  ai_generated_summary: string | null;
  user_edited_summary: string | null;
  is_current: boolean;
  created_at: Date;
}

function toIdeaInput(row: IdeaInputRow): IdeaInput {
  return {
    id: row.id,
    ventureId: row.venture_id,
    targetCustomer: row.target_customer,
    userBuyerPayerNote: row.user_buyer_payer_note,
    problem: row.problem,
    solutionOrIp: row.solution_or_ip,
    outcome: row.outcome,
    currentAlternatives: row.current_alternatives,
    aiGeneratedSummary: row.ai_generated_summary,
    userEditedSummary: row.user_edited_summary,
    isCurrent: row.is_current,
    createdAt: row.created_at.toISOString(),
  };
}

export class PostgresIdeaInputRepository implements IdeaInputRepository {
  async saveAsCurrent(fields: SaveIdeaInputFields): Promise<IdeaInput> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(
        "update idea_inputs set is_current = false where venture_id = $1 and is_current",
        [fields.ventureId],
      );
      const { rows } = await client.query<IdeaInputRow>(
        `insert into idea_inputs
           (venture_id, target_customer, user_buyer_payer_note, problem, solution_or_ip,
            outcome, current_alternatives, ai_generated_summary, user_edited_summary,
            is_current, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
         returning *`,
        [
          fields.ventureId,
          fields.targetCustomer,
          fields.userBuyerPayerNote,
          fields.problem,
          fields.solutionOrIp,
          fields.outcome,
          fields.currentAlternatives,
          fields.aiGeneratedSummary,
          fields.userEditedSummary,
          fields.createdBy,
        ],
      );
      await client.query("commit");
      return toIdeaInput(rows[0]!);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  async findCurrentByVenture(ventureId: string): Promise<IdeaInput | null> {
    const { rows } = await getPool().query<IdeaInputRow>(
      "select * from idea_inputs where venture_id = $1 and is_current limit 1",
      [ventureId],
    );
    return rows[0] ? toIdeaInput(rows[0]) : null;
  }
}
