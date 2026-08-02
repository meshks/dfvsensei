import type {
  CreateLearningCardFields,
  LearningCard,
  LearningCardRepository,
  ThresholdResult,
} from "@/application/learning-cards/learning-card-repository";
import { getPool } from "./db";

interface LearningCardRow {
  id: string;
  test_card_id: string;
  believed: string;
  expected: string;
  happened: string;
  metric_result: string | null;
  threshold_result: ThresholdResult;
  evidence_collected_summary: string | null;
  evidence_limitations: string | null;
  insight: string;
  confidence: string | null;
  contradiction_note: string | null;
  next_experiment_note: string | null;
  created_at: Date;
}

function toLearningCard(row: LearningCardRow): LearningCard {
  return {
    id: row.id,
    testCardId: row.test_card_id,
    believed: row.believed,
    expected: row.expected,
    happened: row.happened,
    metricResult: row.metric_result,
    thresholdResult: row.threshold_result,
    evidenceCollectedSummary: row.evidence_collected_summary,
    evidenceLimitations: row.evidence_limitations,
    insight: row.insight,
    confidence: row.confidence === null ? null : Number(row.confidence),
    contradictionNote: row.contradiction_note,
    nextExperimentNote: row.next_experiment_note,
    createdAt: row.created_at.toISOString(),
  };
}

export class PostgresLearningCardRepository implements LearningCardRepository {
  async create(fields: CreateLearningCardFields): Promise<LearningCard> {
    const { rows } = await getPool().query<LearningCardRow>(
      `insert into learning_cards
         (test_card_id, believed, expected, happened, metric_result, threshold_result,
          evidence_collected_summary, evidence_limitations, insight, confidence,
          contradiction_note, next_experiment_note, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       returning *`,
      [
        fields.testCardId,
        fields.believed,
        fields.expected,
        fields.happened,
        fields.metricResult,
        fields.thresholdResult,
        fields.evidenceCollectedSummary,
        fields.evidenceLimitations,
        fields.insight,
        fields.confidence,
        fields.contradictionNote,
        fields.nextExperimentNote,
        fields.createdBy,
      ],
    );
    return toLearningCard(rows[0]!);
  }

  async findByTestCard(testCardId: string): Promise<LearningCard | null> {
    const { rows } = await getPool().query<LearningCardRow>(
      "select * from learning_cards where test_card_id = $1 order by created_at desc limit 1",
      [testCardId],
    );
    return rows[0] ? toLearningCard(rows[0]) : null;
  }
}
