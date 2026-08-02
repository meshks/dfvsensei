import type {
  CreateVentureInput,
  EntryPath,
  Venture,
  VentureRepository,
  VentureStage,
} from "@/application/ventures/venture-repository";
import { getPool } from "./db";

interface VentureRow {
  id: string;
  name: string;
  short_description: string;
  entry_path: EntryPath;
  stage: VentureStage;
  owner_id: string;
  created_at: Date;
}

function toVenture(row: VentureRow): Venture {
  return {
    id: row.id,
    name: row.name,
    shortDescription: row.short_description,
    entryPath: row.entry_path,
    stage: row.stage,
    ownerId: row.owner_id,
    createdAt: row.created_at.toISOString(),
  };
}

export class PostgresVentureRepository implements VentureRepository {
  async create(input: CreateVentureInput): Promise<Venture> {
    const { rows } = await getPool().query<VentureRow>(
      `insert into ventures (name, short_description, entry_path, owner_id)
       values ($1, $2, $3, $4)
       returning id, name, short_description, entry_path, stage, owner_id, created_at`,
      [input.name, input.shortDescription, input.entryPath, input.ownerId],
    );
    return toVenture(rows[0]!);
  }

  async listByOwner(ownerId: string): Promise<Venture[]> {
    const { rows } = await getPool().query<VentureRow>(
      `select id, name, short_description, entry_path, stage, owner_id, created_at
       from ventures
       where owner_id = $1 and deleted_at is null
       order by created_at desc`,
      [ownerId],
    );
    return rows.map(toVenture);
  }

  async findById(id: string): Promise<Venture | null> {
    const { rows } = await getPool().query<VentureRow>(
      `select id, name, short_description, entry_path, stage, owner_id, created_at
       from ventures
       where id = $1 and deleted_at is null`,
      [id],
    );
    return rows[0] ? toVenture(rows[0]) : null;
  }
}
