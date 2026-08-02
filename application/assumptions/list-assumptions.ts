import type { Assumption, AssumptionRepository } from "./assumption-repository";

export async function listAssumptions(
  ventureId: string,
  repository: AssumptionRepository,
): Promise<Assumption[]> {
  return repository.listByVenture(ventureId);
}
