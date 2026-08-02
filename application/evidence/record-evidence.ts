import { z } from "zod";
import type { EvidenceItem, EvidenceRepository } from "./evidence-repository";

export const recordEvidenceRequestSchema = z.object({
  evidenceType: z.enum([
    "opinion",
    "interview_insight",
    "observed_behaviour",
    "commitment",
    "payment",
    "technical_benchmark",
    "operational_proof",
    "documentary_proof",
    "financial_result",
    "other",
  ]),
  description: z.string().trim().min(1).max(2000),
  metricValue: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  dateObserved: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  confidence: z.number().min(0).max(1).optional(),
});
export type RecordEvidenceRequest = z.infer<typeof recordEvidenceRequestSchema>;

export async function recordEvidence(
  testCardId: string,
  request: RecordEvidenceRequest,
  ownerId: string,
  repository: EvidenceRepository,
): Promise<EvidenceItem> {
  return repository.create({
    testCardId,
    evidenceType: request.evidenceType,
    description: request.description,
    metricValue: request.metricValue ?? null,
    dateObserved: request.dateObserved ?? null,
    ownerId,
    confidence: request.confidence ?? null,
  });
}
