import type { AssumptionRepository } from "./assumption-repository";

export async function deleteAssumption(
  id: string,
  repository: AssumptionRepository,
): Promise<void> {
  await repository.softDelete(id);
}
