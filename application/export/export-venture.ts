import type { Assumption } from "@/application/assumptions/assumption-repository";
import type { AssumptionRepository } from "@/application/assumptions/assumption-repository";
import type { Decision } from "@/application/decisions/decision-repository";
import type { DecisionRepository } from "@/application/decisions/decision-repository";
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

export interface VentureExport {
  exportedAt: string;
  venture: Venture;
  ideaInput: IdeaInput | null;
  assumptions: Assumption[];
  mapSnapshot: AssumptionMapSnapshot | null;
  testCards: (TestCard & {
    evidenceItems: EvidenceItem[];
    learningCard: LearningCard | null;
  })[];
  decisions: Decision[];
}

/** PRODUCT_REQUIREMENTS.md Stage 13 -- the full venture graph, not a summary. */
export async function exportVenture(
  ventureId: string,
  repositories: {
    venture: VentureRepository;
    idea: IdeaInputRepository;
    assumptions: AssumptionRepository;
    map: AssumptionMapRepository;
    testCards: TestCardRepository;
    evidence: EvidenceRepository;
    learningCards: LearningCardRepository;
    decisions: DecisionRepository;
  },
): Promise<VentureExport | null> {
  const venture = await repositories.venture.findById(ventureId);
  if (!venture) return null;

  const [ideaInput, assumptions, mapSnapshot, testCards, decisions] = await Promise.all([
    repositories.idea.findCurrentByVenture(ventureId),
    repositories.assumptions.listByVenture(ventureId),
    repositories.map.findCurrentByVenture(ventureId),
    repositories.testCards.listByVenture(ventureId),
    repositories.decisions.listByVenture(ventureId),
  ]);

  const testCardsWithDetail = await Promise.all(
    testCards.map(async (testCard) => {
      const [evidenceItems, learningCard] = await Promise.all([
        repositories.evidence.listByTestCard(testCard.id),
        repositories.learningCards.findByTestCard(testCard.id),
      ]);
      return { ...testCard, evidenceItems, learningCard };
    }),
  );

  return {
    exportedAt: new Date().toISOString(),
    venture,
    ideaInput,
    assumptions,
    mapSnapshot,
    testCards: testCardsWithDetail,
    decisions,
  };
}
