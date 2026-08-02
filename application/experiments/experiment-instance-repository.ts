export interface ExperimentInstance {
  id: string;
  ventureId: string;
  libraryId: string;
  assumptionId: string;
  status: "proposed" | "selected" | "discarded";
}

export interface ExperimentInstanceRepository {
  create(ventureId: string, libraryId: string, assumptionId: string): Promise<ExperimentInstance>;
  findById(id: string): Promise<ExperimentInstance | null>;
}
