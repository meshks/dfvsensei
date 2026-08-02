export interface RecommendationScoreBreakdown {
  assumptionFit: number;
  evidenceStrengthRequired: number;
  costAndSpeed: number;
  stageAppropriateness: number;
  accessEthicsPracticality: number;
}

export interface SavedRecommendation {
  id: string;
  assumptionId: string;
  libraryId: string;
  rank: number;
  score: number;
  scoreBreakdown: RecommendationScoreBreakdown;
  whatItCanProve: string;
  whatItCannotProve: string;
}

export interface RecommendationToSave {
  libraryId: string;
  rank: number;
  score: number;
  scoreBreakdown: RecommendationScoreBreakdown;
  whatItCanProve: string;
  whatItCannotProve: string;
}

export interface ExperimentRecommendationRepository {
  /** Replaces any existing recommendations for this assumption. */
  saveForAssumption(
    assumptionId: string,
    recommendations: RecommendationToSave[],
  ): Promise<SavedRecommendation[]>;
  findByAssumption(assumptionId: string): Promise<SavedRecommendation[]>;
}
