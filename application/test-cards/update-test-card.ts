import { z } from "zod";
import type { TestCard, TestCardRepository } from "./test-card-repository";

export const updateTestCardRequestSchema = z.object({
  decisionQuestion: z.string().trim().max(500).nullable().optional(),
  objective: z.string().trim().max(1000).nullable().optional(),
  targetParticipantOrDataset: z.string().trim().max(500).nullable().optional(),
  recruitmentOrAccessMethod: z.string().trim().max(500).nullable().optional(),
  sampleSize: z.string().trim().max(200).nullable().optional(),
  procedure: z.string().trim().max(2000).nullable().optional(),
  keyMetric: z.string().trim().max(300).nullable().optional(),
  successThreshold: z.string().trim().max(300).nullable().optional(),
  failureThreshold: z.string().trim().max(300).nullable().optional(),
  inconclusiveRange: z.string().trim().max(300).nullable().optional(),
  evidenceExpected: z.string().trim().max(500).nullable().optional(),
  evidenceStrengthLevel: z.enum(["light", "medium", "strong"]).nullable().optional(),
  status: z.enum(["draft", "ready", "running", "complete"]).optional(),
});
export type UpdateTestCardRequest = z.infer<typeof updateTestCardRequestSchema>;

export class TestCardThresholdError extends Error {
  constructor() {
    super("Cannot leave draft status until success, failure, and inconclusive thresholds are set.");
    this.name = "TestCardThresholdError";
  }
}

/**
 * DOMAIN_MODEL.md §2: a Test Card cannot leave `draft` without all three
 * thresholds. Enforced here (clear error) and by a DB check constraint
 * (the real boundary -- see supabase/migrations/0001_init.sql).
 */
export async function updateTestCard(
  id: string,
  request: UpdateTestCardRequest,
  current: TestCard,
  repository: TestCardRepository,
): Promise<TestCard> {
  if (request.status && request.status !== "draft") {
    const successThreshold = request.successThreshold ?? current.successThreshold;
    const failureThreshold = request.failureThreshold ?? current.failureThreshold;
    const inconclusiveRange = request.inconclusiveRange ?? current.inconclusiveRange;
    if (!successThreshold || !failureThreshold || !inconclusiveRange) {
      throw new TestCardThresholdError();
    }
  }

  return repository.update(id, request);
}
