import type { AssumptionMapRepository, AssumptionMapSnapshot } from "./assumption-map-repository";

export async function getCurrentMapSnapshot(
  ventureId: string,
  repository: AssumptionMapRepository,
): Promise<AssumptionMapSnapshot | null> {
  return repository.findCurrentByVenture(ventureId);
}
