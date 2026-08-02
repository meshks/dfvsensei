import { z } from "zod";
import type { AssumptionMapRepository, AssumptionMapSnapshot } from "./assumption-map-repository";

export const saveMapSnapshotRequestSchema = z.object({
  positions: z.array(
    z.object({
      assumptionId: z.string().min(1),
      importance: z.number().min(0).max(10),
      evidenceStrength: z.number().min(0).max(10),
    }),
  ),
});
export type SaveMapSnapshotRequest = z.infer<typeof saveMapSnapshotRequestSchema>;

export async function saveMapSnapshot(
  ventureId: string,
  request: SaveMapSnapshotRequest,
  createdBy: string,
  repository: AssumptionMapRepository,
): Promise<AssumptionMapSnapshot> {
  return repository.saveAsCurrent(ventureId, request.positions, createdBy);
}
