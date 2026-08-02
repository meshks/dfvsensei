import type { Assumption, DfvCategory } from "@/application/assumptions/assumption-repository";
import type { Decision } from "@/application/decisions/decision-repository";
import type { TestCard } from "@/application/test-cards/test-card-repository";
import { riskPriority } from "@/domain/scoring";

export interface DfvConfidence {
  category: DfvCategory;
  /** Average evidence_strength_score (0..10) across scored assumptions in this category. */
  averageEvidenceStrength: number | null;
  assumptionCount: number;
}

export interface RiskyAssumption {
  id: string;
  statement: string;
  dfvPrimary: DfvCategory;
  riskPriority: number;
}

export interface Dashboard {
  dfvConfidence: DfvConfidence[];
  topRiskyAssumptions: RiskyAssumption[];
  testCardCounts: Record<TestCard["status"], number>;
  decisionCount: number;
  recentDecisions: Decision[];
}

const DFV_CATEGORIES: DfvCategory[] = ["desirability", "feasibility", "viability"];

/**
 * PRODUCT_REQUIREMENTS.md Stage 12: "Avoid a misleading single venture score."
 * DFV confidence is always three separate numbers, never blended into one --
 * see CLAUDE.md rule 3.
 */
export function buildDashboard(
  assumptions: Assumption[],
  testCards: TestCard[],
  decisions: Decision[],
): Dashboard {
  const dfvConfidence: DfvConfidence[] = DFV_CATEGORIES.map((category) => {
    const inCategory = assumptions.filter((a) => a.dfvPrimary === category);
    const scored = inCategory.filter((a) => a.evidenceStrengthScore !== null);
    const average =
      scored.length === 0
        ? null
        : scored.reduce((sum, a) => sum + a.evidenceStrengthScore!, 0) / scored.length;
    return { category, averageEvidenceStrength: average, assumptionCount: inCategory.length };
  });

  const topRiskyAssumptions: RiskyAssumption[] = assumptions
    .filter((a) => a.importanceScore !== null && a.evidenceStrengthScore !== null)
    .map((a) => ({
      id: a.id,
      statement: a.statement,
      dfvPrimary: a.dfvPrimary,
      riskPriority: riskPriority({
        importanceScore: a.importanceScore!,
        evidenceStrengthScore: a.evidenceStrengthScore!,
      }),
    }))
    .sort((a, b) => b.riskPriority - a.riskPriority)
    .slice(0, 5);

  const testCardCounts: Record<TestCard["status"], number> = {
    draft: 0,
    ready: 0,
    running: 0,
    complete: 0,
  };
  for (const card of testCards) {
    testCardCounts[card.status] += 1;
  }

  return {
    dfvConfidence,
    topRiskyAssumptions,
    testCardCounts,
    decisionCount: decisions.length,
    recentDecisions: decisions.slice(0, 5),
  };
}
