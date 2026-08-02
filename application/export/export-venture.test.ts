import { describe, expect, it } from "vitest";
import type {
  Assumption,
  AssumptionRepository,
} from "@/application/assumptions/assumption-repository";
import type { Decision, DecisionRepository } from "@/application/decisions/decision-repository";
import type { EvidenceItem, EvidenceRepository } from "@/application/evidence/evidence-repository";
import type { IdeaInput, IdeaInputRepository } from "@/application/ideas/idea-input-repository";
import type {
  LearningCard,
  LearningCardRepository,
} from "@/application/learning-cards/learning-card-repository";
import type {
  AssumptionMapRepository,
  AssumptionMapSnapshot,
} from "@/application/map/assumption-map-repository";
import type { TestCard, TestCardRepository } from "@/application/test-cards/test-card-repository";
import type { Venture, VentureRepository } from "@/application/ventures/venture-repository";
import { exportVenture } from "./export-venture";

describe("exportVenture", () => {
  it("returns null when the venture does not exist", async () => {
    const result = await exportVenture("missing", {
      venture: { findById: async () => null } as unknown as VentureRepository,
      idea: { findCurrentByVenture: async () => null } as unknown as IdeaInputRepository,
      assumptions: { listByVenture: async () => [] } as unknown as AssumptionRepository,
      map: { findCurrentByVenture: async () => null } as unknown as AssumptionMapRepository,
      testCards: { listByVenture: async () => [] } as unknown as TestCardRepository,
      evidence: { listByTestCard: async () => [] } as unknown as EvidenceRepository,
      learningCards: { findByTestCard: async () => null } as unknown as LearningCardRepository,
      decisions: { listByVenture: async () => [] } as unknown as DecisionRepository,
    });
    expect(result).toBeNull();
  });

  it("nests each test card's own evidence and learning card, not a shared pool", async () => {
    const venture = { id: "v1" } as Venture;
    const testCardA = { id: "tc-a" } as TestCard;
    const testCardB = { id: "tc-b" } as TestCard;
    const evidenceA = [{ id: "e1", testCardId: "tc-a" }] as EvidenceItem[];
    const evidenceB = [{ id: "e2", testCardId: "tc-b" }] as EvidenceItem[];
    const learningCardB = { id: "lc-b", testCardId: "tc-b" } as LearningCard;

    const result = await exportVenture("v1", {
      venture: { findById: async () => venture } as unknown as VentureRepository,
      idea: { findCurrentByVenture: async () => null } as unknown as IdeaInputRepository,
      assumptions: { listByVenture: async () => [] } as unknown as AssumptionRepository,
      map: { findCurrentByVenture: async () => null } as unknown as AssumptionMapRepository,
      testCards: {
        listByVenture: async () => [testCardA, testCardB],
      } as unknown as TestCardRepository,
      evidence: {
        listByTestCard: async (testCardId: string) =>
          testCardId === "tc-a" ? evidenceA : evidenceB,
      } as unknown as EvidenceRepository,
      learningCards: {
        findByTestCard: async (testCardId: string) =>
          testCardId === "tc-b" ? learningCardB : null,
      } as unknown as LearningCardRepository,
      decisions: { listByVenture: async () => [] } as unknown as DecisionRepository,
    });

    expect(result?.testCards).toHaveLength(2);
    const a = result?.testCards.find((tc) => tc.id === "tc-a");
    const b = result?.testCards.find((tc) => tc.id === "tc-b");
    expect(a?.evidenceItems).toEqual(evidenceA);
    expect(a?.learningCard).toBeNull();
    expect(b?.evidenceItems).toEqual(evidenceB);
    expect(b?.learningCard).toEqual(learningCardB);
  });

  it("includes idea input, assumptions, map snapshot, and decisions verbatim", async () => {
    const venture = { id: "v1" } as Venture;
    const ideaInput = { id: "idea-1" } as IdeaInput;
    const assumptions = [{ id: "a1" }] as Assumption[];
    const mapSnapshot = { id: "snap-1" } as AssumptionMapSnapshot;
    const decisions = [{ id: "d1" }] as Decision[];

    const result = await exportVenture("v1", {
      venture: { findById: async () => venture } as unknown as VentureRepository,
      idea: { findCurrentByVenture: async () => ideaInput } as unknown as IdeaInputRepository,
      assumptions: {
        listByVenture: async () => assumptions,
      } as unknown as AssumptionRepository,
      map: { findCurrentByVenture: async () => mapSnapshot } as unknown as AssumptionMapRepository,
      testCards: { listByVenture: async () => [] } as unknown as TestCardRepository,
      evidence: { listByTestCard: async () => [] } as unknown as EvidenceRepository,
      learningCards: { findByTestCard: async () => null } as unknown as LearningCardRepository,
      decisions: { listByVenture: async () => decisions } as unknown as DecisionRepository,
    });

    expect(result?.ideaInput).toEqual(ideaInput);
    expect(result?.assumptions).toEqual(assumptions);
    expect(result?.mapSnapshot).toEqual(mapSnapshot);
    expect(result?.decisions).toEqual(decisions);
    expect(result?.exportedAt).toBeTruthy();
  });
});
