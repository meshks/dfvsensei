import type { ExperimentLibraryRepository } from "./experiment-library-repository";
import type { ExperimentRecommendationRepository } from "./experiment-recommendation-repository";
import type { RecommendationResult } from "./recommend-experiments";

export async function getRecommendations(
  assumptionId: string,
  recommendationRepository: ExperimentRecommendationRepository,
  libraryRepository: ExperimentLibraryRepository,
): Promise<RecommendationResult[]> {
  const saved = await recommendationRepository.findByAssumption(assumptionId);
  const results: RecommendationResult[] = [];
  for (const rec of saved) {
    const entry = await libraryRepository.findById(rec.libraryId);
    if (!entry) continue;
    results.push({
      libraryId: rec.libraryId,
      name: entry.name,
      rank: rec.rank,
      score: rec.score,
      scoreBreakdown: rec.scoreBreakdown,
      whatItCanProve: rec.whatItCanProve,
      whatItCannotProve: rec.whatItCannotProve,
    });
  }
  return results;
}
