import { z } from "zod";
import type { Assumption, AssumptionRepository } from "./assumption-repository";

const dfvCategorySchema = z.enum(["desirability", "feasibility", "viability"]);

export const updateAssumptionRequestSchema = z.object({
  statement: z.string().trim().min(1).max(1000).optional(),
  dfvPrimary: dfvCategorySchema.optional(),
  dfvSecondary: z.array(dfvCategorySchema).optional(),
  actor: z.string().trim().max(300).nullable().optional(),
  observableBehaviour: z.string().trim().max(500).nullable().optional(),
  importanceScore: z.number().min(0).max(10).nullable().optional(),
  evidenceStrengthScore: z.number().min(0).max(10).nullable().optional(),
  status: z
    .enum(["draft", "active", "testing", "supported", "contradicted", "archived"])
    .optional(),
});
export type UpdateAssumptionRequest = z.infer<typeof updateAssumptionRequestSchema>;

/**
 * Edits an assumption. Per CLAUDE.md rule 1: if the assumption was AI-generated
 * and this edit touches its content (statement/dfv/actor/behaviour), its source
 * flips to ai_generated_user_edited so the UI can stop showing it as a raw AI
 * suggestion -- never silently kept as "AI-generated" after a human changed it.
 */
export async function updateAssumption(
  id: string,
  request: UpdateAssumptionRequest,
  wasAiGenerated: boolean,
  changedBy: string,
  repository: AssumptionRepository,
): Promise<Assumption> {
  const touchesContent =
    request.statement !== undefined ||
    request.dfvPrimary !== undefined ||
    request.actor !== undefined ||
    request.observableBehaviour !== undefined;

  return repository.update(
    id,
    { ...request, editedByUser: wasAiGenerated && touchesContent },
    changedBy,
  );
}
