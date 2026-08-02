import type {
  CreateEvidenceFields,
  EvidenceItem,
  EvidenceRepository,
  EvidenceType,
} from "@/application/evidence/evidence-repository";
import { getPool } from "./db";

interface EvidenceRow {
  id: string;
  test_card_id: string;
  evidence_type: EvidenceType;
  description: string;
  metric_value: string | null;
  date_observed: string | null;
  owner_id: string;
  confidence: string | null;
  created_at: Date;
}

function toEvidence(row: EvidenceRow): EvidenceItem {
  return {
    id: row.id,
    testCardId: row.test_card_id,
    evidenceType: row.evidence_type,
    description: row.description,
    metricValue: row.metric_value,
    dateObserved: row.date_observed,
    ownerId: row.owner_id,
    confidence: row.confidence === null ? null : Number(row.confidence),
    createdAt: row.created_at.toISOString(),
  };
}

export class PostgresEvidenceRepository implements EvidenceRepository {
  async create(fields: CreateEvidenceFields): Promise<EvidenceItem> {
    const { rows } = await getPool().query<EvidenceRow>(
      `insert into evidence_items
         (test_card_id, evidence_type, description, metric_value, date_observed, owner_id, confidence)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        fields.testCardId,
        fields.evidenceType,
        fields.description,
        fields.metricValue,
        fields.dateObserved,
        fields.ownerId,
        fields.confidence,
      ],
    );
    return toEvidence(rows[0]!);
  }

  async listByTestCard(testCardId: string): Promise<EvidenceItem[]> {
    const { rows } = await getPool().query<EvidenceRow>(
      `select * from evidence_items
       where test_card_id = $1 and deleted_at is null
       order by created_at desc`,
      [testCardId],
    );
    return rows.map(toEvidence);
  }
}
