export type DecisionType =
  "proceed" | "pivot" | "repeat" | "refine" | "pause" | "stop" | "escalate";

export interface Decision {
  id: string;
  ventureId: string;
  learningCardId: string;
  assumptionId: string;
  decisionType: DecisionType;
  whatChanges: string | null;
  rationale: string | null;
  decidedAt: string;
}

export interface CreateDecisionFields {
  ventureId: string;
  learningCardId: string;
  assumptionId: string;
  decisionType: DecisionType;
  whatChanges: string | null;
  rationale: string | null;
  decidedBy: string;
}

export interface DecisionRepository {
  create(fields: CreateDecisionFields): Promise<Decision>;
  listByVenture(ventureId: string): Promise<Decision[]>;
}
