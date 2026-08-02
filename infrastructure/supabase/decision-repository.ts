import type {
  CreateDecisionFields,
  Decision,
  DecisionRepository,
  DecisionType,
} from "@/application/decisions/decision-repository";
import { getPool } from "./db";

interface DecisionRow {
  id: string;
  venture_id: string;
  learning_card_id: string;
  assumption_id: string;
  decision_type: DecisionType;
  what_changes: string | null;
  rationale: string | null;
  decided_at: Date;
}

function toDecision(row: DecisionRow): Decision {
  return {
    id: row.id,
    ventureId: row.venture_id,
    learningCardId: row.learning_card_id,
    assumptionId: row.assumption_id,
    decisionType: row.decision_type,
    whatChanges: row.what_changes,
    rationale: row.rationale,
    decidedAt: row.decided_at.toISOString(),
  };
}

export class PostgresDecisionRepository implements DecisionRepository {
  async create(fields: CreateDecisionFields): Promise<Decision> {
    const { rows } = await getPool().query<DecisionRow>(
      `insert into decisions
         (venture_id, learning_card_id, assumption_id, decision_type, what_changes, rationale, decided_by)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        fields.ventureId,
        fields.learningCardId,
        fields.assumptionId,
        fields.decisionType,
        fields.whatChanges,
        fields.rationale,
        fields.decidedBy,
      ],
    );
    return toDecision(rows[0]!);
  }

  async listByVenture(ventureId: string): Promise<Decision[]> {
    const { rows } = await getPool().query<DecisionRow>(
      "select * from decisions where venture_id = $1 order by decided_at desc",
      [ventureId],
    );
    return rows.map(toDecision);
  }
}
