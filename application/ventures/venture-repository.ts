export type EntryPath = "market_led" | "ip_led";
export type VentureStage = "idea" | "discovery" | "validation" | "commercialisation";

export interface Venture {
  id: string;
  name: string;
  shortDescription: string;
  entryPath: EntryPath;
  stage: VentureStage;
  ownerId: string;
  createdAt: string;
}

export interface CreateVentureInput {
  name: string;
  shortDescription: string;
  entryPath: EntryPath;
  ownerId: string;
}

/**
 * Repository interface the application layer depends on. The Postgres
 * implementation lives in infrastructure/supabase/ventures-repository.ts --
 * see ARCHITECTURE.md §2: application/ never imports a vendor SDK directly.
 */
export interface VentureRepository {
  create(input: CreateVentureInput): Promise<Venture>;
  listByOwner(ownerId: string): Promise<Venture[]>;
  findById(id: string): Promise<Venture | null>;
}
