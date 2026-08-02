import { z } from "zod";
import type { LearningCard, LearningCardRepository } from "./learning-card-repository";

export const createLearningCardRequestSchema = z.object({
  believed: z.string().trim().min(1).max(1000),
  expected: z.string().trim().min(1).max(1000),
  happened: z.string().trim().min(1).max(1000),
  metricResult: z.string().trim().max(500).optional(),
  thresholdResult: z.enum(["success", "failure", "inconclusive"]),
  evidenceCollectedSummary: z.string().trim().max(1000).optional(),
  evidenceLimitations: z.string().trim().max(1000).optional(),
  insight: z.string().trim().min(1).max(1000),
  confidence: z.number().min(0).max(1).optional(),
  contradictionNote: z.string().trim().max(1000).optional(),
  nextExperimentNote: z.string().trim().max(1000).optional(),
});
export type CreateLearningCardRequest = z.infer<typeof createLearningCardRequestSchema>;

export async function createLearningCard(
  testCardId: string,
  request: CreateLearningCardRequest,
  createdBy: string,
  repository: LearningCardRepository,
): Promise<LearningCard> {
  return repository.create({
    testCardId,
    believed: request.believed,
    expected: request.expected,
    happened: request.happened,
    metricResult: request.metricResult ?? null,
    thresholdResult: request.thresholdResult,
    evidenceCollectedSummary: request.evidenceCollectedSummary ?? null,
    evidenceLimitations: request.evidenceLimitations ?? null,
    insight: request.insight,
    confidence: request.confidence ?? null,
    contradictionNote: request.contradictionNote ?? null,
    nextExperimentNote: request.nextExperimentNote ?? null,
    createdBy,
  });
}
