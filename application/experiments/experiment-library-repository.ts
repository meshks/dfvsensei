export interface ExperimentLibraryEntry {
  id: string;
  name: string;
  originalSummary: string;
  experimentFamily: string;
  discoveryOrValidation: "discovery" | "validation";
  applicableDfv: string[];
  applicableAssumptionTypes: string[];
  evidenceStrength: "light" | "medium" | "strong";
  setupTime: "short" | "medium" | "long";
  runTime: "short" | "medium" | "long";
  relativeCost: "low" | "medium" | "high";
  status: "demo" | "active" | "archived";
}

export interface ExperimentLibraryRepository {
  /** Candidates whose applicable_dfv/applicable_assumption_types overlap the assumption. */
  findCandidates(dfvPrimary: string, assumptionType: string): Promise<ExperimentLibraryEntry[]>;
  findById(id: string): Promise<ExperimentLibraryEntry | null>;
}
