import type {
  ExperimentInstance,
  ExperimentInstanceRepository,
} from "@/application/experiments/experiment-instance-repository";
import { getPool } from "./db";

interface ExperimentRow {
  id: string;
  venture_id: string;
  library_id: string;
  assumption_id: string;
  status: "proposed" | "selected" | "discarded";
}

function toInstance(row: ExperimentRow): ExperimentInstance {
  return {
    id: row.id,
    ventureId: row.venture_id,
    libraryId: row.library_id,
    assumptionId: row.assumption_id,
    status: row.status,
  };
}

export class PostgresExperimentInstanceRepository implements ExperimentInstanceRepository {
  async create(
    ventureId: string,
    libraryId: string,
    assumptionId: string,
  ): Promise<ExperimentInstance> {
    const { rows } = await getPool().query<ExperimentRow>(
      `insert into experiments (venture_id, library_id, assumption_id, status)
       values ($1, $2, $3, 'selected')
       returning *`,
      [ventureId, libraryId, assumptionId],
    );
    return toInstance(rows[0]!);
  }

  async findById(id: string): Promise<ExperimentInstance | null> {
    const { rows } = await getPool().query<ExperimentRow>(
      "select * from experiments where id = $1",
      [id],
    );
    return rows[0] ? toInstance(rows[0]) : null;
  }
}
