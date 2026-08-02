export type DfvCategory = "desirability" | "feasibility" | "viability";

export type AssumptionType =
  | "segment"
  | "problem"
  | "solution"
  | "channel"
  | "revenue"
  | "cost"
  | "resource"
  | "activity"
  | "partner"
  | "data"
  | "regulation"
  | "adoption"
  | "other";

export type AssumptionSource = "ai_generated" | "user_generated" | "ai_generated_user_edited";
export type AssumptionStatus =
  "draft" | "active" | "testing" | "supported" | "contradicted" | "archived";

export interface Assumption {
  id: string;
  ventureId: string;
  statement: string;
  dfvPrimary: DfvCategory;
  dfvSecondary: DfvCategory[];
  assumptionType: AssumptionType;
  actor: string | null;
  observableBehaviour: string | null;
  importanceScore: number | null;
  evidenceStrengthScore: number | null;
  rationale: string | null;
  source: AssumptionSource;
  status: AssumptionStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssumptionFields {
  ventureId: string;
  statement: string;
  dfvPrimary: DfvCategory;
  dfvSecondary: DfvCategory[];
  assumptionType: AssumptionType;
  actor: string | null;
  observableBehaviour: string | null;
  rationale: string | null;
  source: AssumptionSource;
  ownerId: string;
  createdBy: string;
}

export interface UpdateAssumptionFields {
  statement?: string;
  dfvPrimary?: DfvCategory;
  dfvSecondary?: DfvCategory[];
  actor?: string | null;
  observableBehaviour?: string | null;
  importanceScore?: number | null;
  evidenceStrengthScore?: number | null;
  status?: AssumptionStatus;
  /** Set true when this update is an edit of AI-generated content -- flips source. */
  editedByUser?: boolean;
}

export interface AssumptionRepository {
  create(fields: CreateAssumptionFields): Promise<Assumption>;
  listByVenture(ventureId: string): Promise<Assumption[]>;
  findById(id: string): Promise<Assumption | null>;
  update(id: string, fields: UpdateAssumptionFields, changedBy: string): Promise<Assumption>;
  softDelete(id: string): Promise<void>;
}
