export type TestCardStatus = "draft" | "ready" | "running" | "complete";
export type EvidenceStrengthLevel = "light" | "medium" | "strong";

export interface TestCard {
  id: string;
  ventureId: string;
  assumptionId: string;
  experimentId: string;
  decisionQuestion: string | null;
  objective: string | null;
  targetParticipantOrDataset: string | null;
  recruitmentOrAccessMethod: string | null;
  sampleSize: string | null;
  procedure: string | null;
  keyMetric: string | null;
  successThreshold: string | null;
  failureThreshold: string | null;
  inconclusiveRange: string | null;
  evidenceExpected: string | null;
  evidenceStrengthLevel: EvidenceStrengthLevel | null;
  budget: string | null;
  risks: string | null;
  status: TestCardStatus;
  createdAt: string;
}

export interface CreateTestCardFields {
  ventureId: string;
  assumptionId: string;
  experimentId: string;
  ownerId: string;
  decisionQuestion?: string | null;
  objective?: string | null;
  targetParticipantOrDataset?: string | null;
  recruitmentOrAccessMethod?: string | null;
  sampleSize?: string | null;
  procedure?: string | null;
  keyMetric?: string | null;
  successThreshold?: string | null;
  failureThreshold?: string | null;
  inconclusiveRange?: string | null;
  evidenceExpected?: string | null;
  evidenceStrengthLevel?: EvidenceStrengthLevel | null;
}

export interface UpdateTestCardFields {
  decisionQuestion?: string | null;
  objective?: string | null;
  targetParticipantOrDataset?: string | null;
  recruitmentOrAccessMethod?: string | null;
  sampleSize?: string | null;
  procedure?: string | null;
  keyMetric?: string | null;
  successThreshold?: string | null;
  failureThreshold?: string | null;
  inconclusiveRange?: string | null;
  evidenceExpected?: string | null;
  evidenceStrengthLevel?: EvidenceStrengthLevel | null;
  status?: TestCardStatus;
}

export interface TestCardRepository {
  create(fields: CreateTestCardFields): Promise<TestCard>;
  findById(id: string): Promise<TestCard | null>;
  update(id: string, fields: UpdateTestCardFields): Promise<TestCard>;
  listByVenture(ventureId: string): Promise<TestCard[]>;
}
