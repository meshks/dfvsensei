import type { Venture, VentureRepository } from "./venture-repository";

export async function listVentures(
  ownerId: string,
  repository: VentureRepository,
): Promise<Venture[]> {
  return repository.listByOwner(ownerId);
}
