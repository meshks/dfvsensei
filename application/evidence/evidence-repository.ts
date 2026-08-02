export type EvidenceType =
  | "opinion"
  | "interview_insight"
  | "observed_behaviour"
  | "commitment"
  | "payment"
  | "technical_benchmark"
  | "operational_proof"
  | "documentary_proof"
  | "financial_result"
  | "other";

export interface EvidenceItem {
  id: string;
  testCardId: string;
  evidenceType: EvidenceType;
  description: string;
  metricValue: string | null;
  dateObserved: string | null;
  ownerId: string;
  confidence: number | null;
  createdAt: string;
}

export interface CreateEvidenceFields {
  testCardId: string;
  evidenceType: EvidenceType;
  description: string;
  metricValue: string | null;
  dateObserved: string | null;
  ownerId: string;
  confidence: number | null;
}

export interface EvidenceRepository {
  create(fields: CreateEvidenceFields): Promise<EvidenceItem>;
  listByTestCard(testCardId: string): Promise<EvidenceItem[]>;
}
