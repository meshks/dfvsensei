import type {
  AssumptionMapRepository,
  AssumptionMapSnapshot,
  MapPosition,
} from "@/application/map/assumption-map-repository";
import { getPool } from "./db";

interface SnapshotRow {
  id: string;
  venture_id: string;
  positions: MapPosition[];
  created_at: Date;
}

function toSnapshot(row: SnapshotRow): AssumptionMapSnapshot {
  return {
    id: row.id,
    ventureId: row.venture_id,
    positions: row.positions,
    createdAt: row.created_at.toISOString(),
  };
}

export class PostgresAssumptionMapRepository implements AssumptionMapRepository {
  async saveAsCurrent(
    ventureId: string,
    positions: MapPosition[],
    createdBy: string,
  ): Promise<AssumptionMapSnapshot> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(
        "update assumption_map_snapshots set is_current = false where venture_id = $1 and is_current",
        [ventureId],
      );
      const { rows } = await client.query<SnapshotRow>(
        `insert into assumption_map_snapshots (venture_id, positions, is_current, created_by)
         values ($1, $2, true, $3)
         returning *`,
        [ventureId, JSON.stringify(positions), createdBy],
      );
      await client.query("commit");
      return toSnapshot(rows[0]!);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  async findCurrentByVenture(ventureId: string): Promise<AssumptionMapSnapshot | null> {
    const { rows } = await getPool().query<SnapshotRow>(
      "select * from assumption_map_snapshots where venture_id = $1 and is_current limit 1",
      [ventureId],
    );
    return rows[0] ? toSnapshot(rows[0]) : null;
  }
}
