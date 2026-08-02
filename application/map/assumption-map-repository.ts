export interface MapPosition {
  assumptionId: string;
  importance: number;
  evidenceStrength: number;
}

export interface AssumptionMapSnapshot {
  id: string;
  ventureId: string;
  positions: MapPosition[];
  createdAt: string;
}

export interface AssumptionMapRepository {
  /** Marks any existing current snapshot as no longer current, then inserts this one. */
  saveAsCurrent(
    ventureId: string,
    positions: MapPosition[],
    createdBy: string,
  ): Promise<AssumptionMapSnapshot>;
  findCurrentByVenture(ventureId: string): Promise<AssumptionMapSnapshot | null>;
}
