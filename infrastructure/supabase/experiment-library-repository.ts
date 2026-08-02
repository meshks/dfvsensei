import type {
  ExperimentLibraryEntry,
  ExperimentLibraryRepository,
} from "@/application/experiments/experiment-library-repository";
import { getPool } from "./db";

interface ExperimentLibraryRow {
  id: string;
  name: string;
  original_summary: string;
  experiment_family: string;
  discovery_or_validation: "discovery" | "validation";
  applicable_dfv: string[];
  applicable_assumption_types: string[];
  evidence_strength: "light" | "medium" | "strong";
  setup_time: "short" | "medium" | "long";
  run_time: "short" | "medium" | "long";
  relative_cost: "low" | "medium" | "high";
  status: "demo" | "active" | "archived";
}

function toEntry(row: ExperimentLibraryRow): ExperimentLibraryEntry {
  return {
    id: row.id,
    name: row.name,
    originalSummary: row.original_summary,
    experimentFamily: row.experiment_family,
    discoveryOrValidation: row.discovery_or_validation,
    applicableDfv: row.applicable_dfv ?? [],
    applicableAssumptionTypes: row.applicable_assumption_types ?? [],
    evidenceStrength: row.evidence_strength,
    setupTime: row.setup_time,
    runTime: row.run_time,
    relativeCost: row.relative_cost,
    status: row.status,
  };
}

export class PostgresExperimentLibraryRepository implements ExperimentLibraryRepository {
  async findCandidates(
    dfvPrimary: string,
    assumptionType: string,
  ): Promise<ExperimentLibraryEntry[]> {
    const { rows } = await getPool().query<ExperimentLibraryRow>(
      `select * from experiment_library
       where status != 'archived'
         and ($1 = any(applicable_dfv) or $2 = any(applicable_assumption_types))
       order by name asc`,
      [dfvPrimary, assumptionType],
    );
    // Fall back to the full active/demo library if nothing matches -- an under-tagged
    // library should never mean "no recommendations at all".
    if (rows.length > 0) return rows.map(toEntry);

    const { rows: fallback } = await getPool().query<ExperimentLibraryRow>(
      "select * from experiment_library where status != 'archived' order by name asc",
    );
    return fallback.map(toEntry);
  }

  async findById(id: string): Promise<ExperimentLibraryEntry | null> {
    const { rows } = await getPool().query<ExperimentLibraryRow>(
      "select * from experiment_library where id = $1",
      [id],
    );
    return rows[0] ? toEntry(rows[0]) : null;
  }
}
