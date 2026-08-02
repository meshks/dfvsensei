export interface IdeaInput {
  id: string;
  ventureId: string;
  targetCustomer: string | null;
  userBuyerPayerNote: string | null;
  problem: string | null;
  solutionOrIp: string | null;
  outcome: string | null;
  currentAlternatives: string | null;
  aiGeneratedSummary: string | null;
  userEditedSummary: string | null;
  isCurrent: boolean;
  createdAt: string;
}

export interface SaveIdeaInputFields {
  ventureId: string;
  targetCustomer: string;
  userBuyerPayerNote: string;
  problem: string;
  solutionOrIp: string;
  outcome: string;
  currentAlternatives: string;
  aiGeneratedSummary: string | null;
  userEditedSummary: string | null;
  createdBy: string;
}

export interface IdeaInputRepository {
  /** Marks any existing current idea input as no longer current, then inserts this one. */
  saveAsCurrent(fields: SaveIdeaInputFields): Promise<IdeaInput>;
  findCurrentByVenture(ventureId: string): Promise<IdeaInput | null>;
}
