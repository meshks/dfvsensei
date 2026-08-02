import { z } from "zod";
import type { Venture, VentureRepository } from "./venture-repository";

export const createVentureRequestSchema = z.object({
  name: z.string().trim().min(1, "Venture name is required").max(200),
  shortDescription: z.string().trim().max(2000).default(""),
  entryPath: z.enum(["market_led", "ip_led"]),
});

export type CreateVentureRequest = z.infer<typeof createVentureRequestSchema>;

export async function createVenture(
  request: CreateVentureRequest,
  ownerId: string,
  repository: VentureRepository,
): Promise<Venture> {
  return repository.create({
    name: request.name,
    shortDescription: request.shortDescription,
    entryPath: request.entryPath,
    ownerId,
  });
}
