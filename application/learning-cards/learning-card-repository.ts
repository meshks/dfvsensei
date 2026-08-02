export type ThresholdResult = "success" | "failure" | "inconclusive";

export interface LearningCard {
  id: string;
  testCardId: string;
  believed: string;
  expected: string;
  happened: string;
  metricResult: string | null;
  thresholdResult: ThresholdResult;
  evidenceCollectedSummary: string | null;
  evidenceLimitations: string | null;
  insight: string;
  confidence: number | null;
  contradictionNote: string | null;
  nextExperimentNote: string | null;
  createdAt: string;
}

export interface CreateLearningCardFields {
  testCardId: string;
  believed: string;
  expected: string;
  happened: string;
  metricResult: string | null;
  thresholdResult: ThresholdResult;
  evidenceCollectedSummary: string | null;
  evidenceLimitations: string | null;
  insight: string;
  confidence: number | null;
  contradictionNote: string | null;
  nextExperimentNote: string | null;
  createdBy: string;
}

export interface LearningCardRepository {
  create(fields: CreateLearningCardFields): Promise<LearningCard>;
  findByTestCard(testCardId: string): Promise<LearningCard | null>;
}
