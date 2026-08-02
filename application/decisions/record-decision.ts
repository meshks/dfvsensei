import { z } from "zod";
import type { LearningCard } from "@/application/learning-cards/learning-card-repository";
import type { Decision, DecisionRepository } from "./decision-repository";

export const recordDecisionRequestSchema = z.object({
  decisionType: z.enum(["proceed", "pivot", "repeat", "refine", "pause", "stop", "escalate"]),
  whatChanges: z.string().trim().max(1000).optional(),
  rationale: z.string().trim().max(1000).optional(),
});
export type RecordDecisionRequest = z.infer<typeof recordDecisionRequestSchema>;

export class NoLearningCardError extends Error {
  constructor() {
    super("A Learning Card must be completed before a decision can be recorded.");
    this.name = "NoLearningCardError";
  }
}

/**
 * PRODUCT_REQUIREMENTS.md §1: "Activity vs. learning -- Learning Cards are a
 * required gate before a decision can be recorded." Enforced here, not just
 * suggested by the UI flow.
 */
export async function recordDecision(
  ventureId: string,
  assumptionId: string,
  learningCard: LearningCard | null,
  request: RecordDecisionRequest,
  decidedBy: string,
  repository: DecisionRepository,
): Promise<Decision> {
  if (!learningCard) {
    throw new NoLearningCardError();
  }

  return repository.create({
    ventureId,
    learningCardId: learningCard.id,
    assumptionId,
    decisionType: request.decisionType,
    whatChanges: request.whatChanges ?? null,
    rationale: request.rationale ?? null,
    decidedBy,
  });
}
