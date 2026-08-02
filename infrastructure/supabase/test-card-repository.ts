import type {
  CreateTestCardFields,
  EvidenceStrengthLevel,
  TestCard,
  TestCardRepository,
  TestCardStatus,
  UpdateTestCardFields,
} from "@/application/test-cards/test-card-repository";
import { getPool } from "./db";

interface TestCardRow {
  id: string;
  venture_id: string;
  assumption_id: string;
  experiment_id: string;
  decision_question: string | null;
  objective: string | null;
  target_participant_or_dataset: string | null;
  recruitment_or_access_method: string | null;
  sample_size: string | null;
  procedure: string | null;
  key_metric: string | null;
  success_threshold: string | null;
  failure_threshold: string | null;
  inconclusive_range: string | null;
  evidence_expected: string | null;
  evidence_strength_level: EvidenceStrengthLevel | null;
  budget: string | null;
  risks: string | null;
  status: TestCardStatus;
  created_at: Date;
}

function toTestCard(row: TestCardRow): TestCard {
  return {
    id: row.id,
    ventureId: row.venture_id,
    assumptionId: row.assumption_id,
    experimentId: row.experiment_id,
    decisionQuestion: row.decision_question,
    objective: row.objective,
    targetParticipantOrDataset: row.target_participant_or_dataset,
    recruitmentOrAccessMethod: row.recruitment_or_access_method,
    sampleSize: row.sample_size,
    procedure: row.procedure,
    keyMetric: row.key_metric,
    successThreshold: row.success_threshold,
    failureThreshold: row.failure_threshold,
    inconclusiveRange: row.inconclusive_range,
    evidenceExpected: row.evidence_expected,
    evidenceStrengthLevel: row.evidence_strength_level,
    budget: row.budget,
    risks: row.risks,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

export class PostgresTestCardRepository implements TestCardRepository {
  async create(fields: CreateTestCardFields): Promise<TestCard> {
    const { rows } = await getPool().query<TestCardRow>(
      `insert into test_cards
         (venture_id, assumption_id, experiment_id, owner_id, decision_question, objective,
          target_participant_or_dataset, recruitment_or_access_method, sample_size, procedure,
          key_metric, success_threshold, failure_threshold, inconclusive_range,
          evidence_expected, evidence_strength_level, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'draft')
       returning *`,
      [
        fields.ventureId,
        fields.assumptionId,
        fields.experimentId,
        fields.ownerId,
        fields.decisionQuestion ?? null,
        fields.objective ?? null,
        fields.targetParticipantOrDataset ?? null,
        fields.recruitmentOrAccessMethod ?? null,
        fields.sampleSize ?? null,
        fields.procedure ?? null,
        fields.keyMetric ?? null,
        fields.successThreshold ?? null,
        fields.failureThreshold ?? null,
        fields.inconclusiveRange ?? null,
        fields.evidenceExpected ?? null,
        fields.evidenceStrengthLevel ?? null,
      ],
    );
    return toTestCard(rows[0]!);
  }

  async findById(id: string): Promise<TestCard | null> {
    const { rows } = await getPool().query<TestCardRow>("select * from test_cards where id = $1", [
      id,
    ]);
    return rows[0] ? toTestCard(rows[0]) : null;
  }

  async update(id: string, fields: UpdateTestCardFields): Promise<TestCard> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const columnMap: Record<string, unknown> = {
      decision_question: fields.decisionQuestion,
      objective: fields.objective,
      target_participant_or_dataset: fields.targetParticipantOrDataset,
      recruitment_or_access_method: fields.recruitmentOrAccessMethod,
      sample_size: fields.sampleSize,
      procedure: fields.procedure,
      key_metric: fields.keyMetric,
      success_threshold: fields.successThreshold,
      failure_threshold: fields.failureThreshold,
      inconclusive_range: fields.inconclusiveRange,
      evidence_expected: fields.evidenceExpected,
      evidence_strength_level: fields.evidenceStrengthLevel,
      status: fields.status,
    };

    for (const [column, value] of Object.entries(columnMap)) {
      if (value !== undefined) {
        setClauses.push(`${column} = $${i}`);
        values.push(value);
        i += 1;
      }
    }

    if (setClauses.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error(`Test card ${id} not found`);
      return existing;
    }

    values.push(id);
    const { rows } = await getPool().query<TestCardRow>(
      `update test_cards set ${setClauses.join(", ")} where id = $${i} returning *`,
      values,
    );
    return toTestCard(rows[0]!);
  }

  async listByVenture(ventureId: string): Promise<TestCard[]> {
    const { rows } = await getPool().query<TestCardRow>(
      "select * from test_cards where venture_id = $1 order by created_at desc",
      [ventureId],
    );
    return rows.map(toTestCard);
  }
}
