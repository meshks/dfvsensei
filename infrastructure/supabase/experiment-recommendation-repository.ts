import type {
  ExperimentRecommendationRepository,
  RecommendationScoreBreakdown,
  RecommendationToSave,
  SavedRecommendation,
} from "@/application/experiments/experiment-recommendation-repository";
import { getPool } from "./db";

interface RecommendationRow {
  id: string;
  assumption_id: string;
  library_id: string;
  rank: number;
  score: string;
  score_breakdown: RecommendationScoreBreakdown;
  what_it_can_prove: string;
  what_it_cannot_prove: string;
}

function toSaved(row: RecommendationRow): SavedRecommendation {
  return {
    id: row.id,
    assumptionId: row.assumption_id,
    libraryId: row.library_id,
    rank: row.rank,
    score: Number(row.score),
    scoreBreakdown: row.score_breakdown,
    whatItCanProve: row.what_it_can_prove,
    whatItCannotProve: row.what_it_cannot_prove,
  };
}

export class PostgresExperimentRecommendationRepository implements ExperimentRecommendationRepository {
  async saveForAssumption(
    assumptionId: string,
    recommendations: RecommendationToSave[],
  ): Promise<SavedRecommendation[]> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("delete from experiment_recommendations where assumption_id = $1", [
        assumptionId,
      ]);

      const saved: SavedRecommendation[] = [];
      for (const rec of recommendations) {
        const { rows } = await client.query<RecommendationRow>(
          `insert into experiment_recommendations
             (assumption_id, library_id, rank, score, score_breakdown, what_it_can_prove, what_it_cannot_prove)
           values ($1, $2, $3, $4, $5, $6, $7)
           returning *`,
          [
            assumptionId,
            rec.libraryId,
            rec.rank,
            rec.score,
            JSON.stringify(rec.scoreBreakdown),
            rec.whatItCanProve,
            rec.whatItCannotProve,
          ],
        );
        saved.push(toSaved(rows[0]!));
      }

      await client.query("commit");
      return saved;
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  async findByAssumption(assumptionId: string): Promise<SavedRecommendation[]> {
    const { rows } = await getPool().query<RecommendationRow>(
      "select * from experiment_recommendations where assumption_id = $1 order by rank asc",
      [assumptionId],
    );
    return rows.map(toSaved);
  }
}
