import { describe, expect, it } from "vitest";
import type { Assumption } from "@/application/assumptions/assumption-repository";
import type { AiCompleteArgs, AiCompleteResult, AiProvider } from "@/infrastructure/ai/provider";
import type {
  ExperimentLibraryEntry,
  ExperimentLibraryRepository,
} from "./experiment-library-repository";
import type {
  ExperimentRecommendationRepository,
  RecommendationToSave,
  SavedRecommendation,
} from "./experiment-recommendation-repository";
import { recommendExperiments } from "./recommend-experiments";

/**
 * Confirms the guardrails in domain/experiments/guardrails.ts are actually wired
 * into this use-case's output -- not just correct in isolation (already covered
 * by domain/experiments/guardrails.test.ts). Uses a fake AiProvider that returns
 * a fixed, deliberately-wrong ranking (interview-only above commitment-grade),
 * so a passing test here proves the reordering genuinely happens end to end.
 */

function makeAssumption(overrides: Partial<Assumption> = {}): Assumption {
  return {
    id: "assumption-1",
    ventureId: "venture-1",
    statement: "We believe customers will pay for a paid pilot.",
    dfvPrimary: "viability",
    dfvSecondary: [],
    assumptionType: "revenue",
    actor: "customer",
    observableBehaviour: "pays",
    importanceScore: 8,
    evidenceStrengthScore: 2,
    rationale: null,
    source: "user_generated",
    status: "active",
    ownerId: "user-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeLibraryEntry(overrides: Partial<ExperimentLibraryEntry>): ExperimentLibraryEntry {
  return {
    id: "lib-interview",
    name: "Customer interview",
    originalSummary: "summary",
    experimentFamily: "customer_interview",
    discoveryOrValidation: "discovery",
    applicableDfv: ["viability"],
    applicableAssumptionTypes: ["revenue"],
    evidenceStrength: "light",
    setupTime: "short",
    runTime: "short",
    relativeCost: "low",
    status: "demo",
    ...overrides,
  };
}

class FakeLibraryRepository implements ExperimentLibraryRepository {
  constructor(private readonly entries: ExperimentLibraryEntry[]) {}
  async findCandidates(): Promise<ExperimentLibraryEntry[]> {
    return this.entries;
  }
  async findById(id: string): Promise<ExperimentLibraryEntry | null> {
    return this.entries.find((e) => e.id === id) ?? null;
  }
}

class FakeRecommendationRepository implements ExperimentRecommendationRepository {
  public saved: RecommendationToSave[] = [];
  async saveForAssumption(
    _assumptionId: string,
    recommendations: RecommendationToSave[],
  ): Promise<SavedRecommendation[]> {
    this.saved = recommendations;
    return recommendations.map((r) => ({ ...r, id: "saved", assumptionId: "assumption-1" }));
  }
  async findByAssumption(): Promise<SavedRecommendation[]> {
    return [];
  }
}

function makeFakeAiProvider(recommendations: unknown[]): AiProvider {
  return {
    async complete<T>(_args: AiCompleteArgs<T>): Promise<AiCompleteResult<T>> {
      return {
        data: { recommendations } as T,
        raw: { model: "fake", latencyMs: 0, attempts: 1 },
      };
    },
  };
}

const scoreBreakdown = {
  assumptionFit: 0.8,
  evidenceStrengthRequired: 0.8,
  costAndSpeed: 0.8,
  stageAppropriateness: 0.8,
  accessEthicsPracticality: 0.8,
};

describe("recommendExperiments", () => {
  it("reorders an AI ranking that puts interview-only above commitment-grade for a WTP assumption", async () => {
    const library = [
      makeLibraryEntry({
        id: "lib-interview",
        name: "Customer interview",
        experimentFamily: "customer_interview",
      }),
      makeLibraryEntry({ id: "lib-pilot", name: "Paid pilot", experimentFamily: "paid_pilot" }),
    ];
    const aiProvider = makeFakeAiProvider([
      {
        libraryId: "lib-interview",
        score: 0.9, // AI (wrongly) ranks the interview highest
        scoreBreakdown,
        whatItCanProve: "stated interest",
        whatItCannotProve: "actual payment",
      },
      {
        libraryId: "lib-pilot",
        score: 0.5,
        scoreBreakdown,
        whatItCanProve: "real payment",
        whatItCannotProve: "long-term retention",
      },
    ]);
    const recommendationRepository = new FakeRecommendationRepository();

    const results = await recommendExperiments(
      makeAssumption(),
      "discovery",
      aiProvider,
      new FakeLibraryRepository(library),
      recommendationRepository,
    );

    expect(results[0]?.libraryId).toBe("lib-pilot");
    expect(results[0]?.guardrailNote).toMatch(/didn't meet/);
    expect(recommendationRepository.saved[0]?.libraryId).toBe("lib-pilot");
  });

  it("leaves an already-correct ranking untouched and unnannotated", async () => {
    const library = [
      makeLibraryEntry({ id: "lib-pilot", name: "Paid pilot", experimentFamily: "paid_pilot" }),
      makeLibraryEntry({
        id: "lib-interview",
        name: "Customer interview",
        experimentFamily: "customer_interview",
      }),
    ];
    const aiProvider = makeFakeAiProvider([
      {
        libraryId: "lib-pilot",
        score: 0.9,
        scoreBreakdown,
        whatItCanProve: "real payment",
        whatItCannotProve: "long-term retention",
      },
      {
        libraryId: "lib-interview",
        score: 0.4,
        scoreBreakdown,
        whatItCanProve: "stated interest",
        whatItCannotProve: "actual payment",
      },
    ]);

    const results = await recommendExperiments(
      makeAssumption(),
      "discovery",
      aiProvider,
      new FakeLibraryRepository(library),
      new FakeRecommendationRepository(),
    );

    expect(results[0]?.libraryId).toBe("lib-pilot");
    expect(results[0]?.guardrailNote).toBeUndefined();
  });

  it("does not apply the willingness-to-pay guardrail to a non-viability/revenue assumption", async () => {
    const library = [
      makeLibraryEntry({
        id: "lib-interview",
        name: "Customer interview",
        experimentFamily: "customer_interview",
        applicableDfv: ["desirability"],
        applicableAssumptionTypes: ["problem"],
      }),
      makeLibraryEntry({
        id: "lib-pilot",
        name: "Paid pilot",
        experimentFamily: "paid_pilot",
        applicableDfv: ["desirability"],
        applicableAssumptionTypes: ["problem"],
      }),
    ];
    const aiProvider = makeFakeAiProvider([
      {
        libraryId: "lib-interview",
        score: 0.9,
        scoreBreakdown,
        whatItCanProve: "problem frequency",
        whatItCannotProve: "willingness to pay",
      },
      {
        libraryId: "lib-pilot",
        score: 0.3,
        scoreBreakdown,
        whatItCanProve: "payment",
        whatItCannotProve: "n/a",
      },
    ]);

    const results = await recommendExperiments(
      makeAssumption({ dfvPrimary: "desirability", assumptionType: "problem" }),
      "discovery",
      aiProvider,
      new FakeLibraryRepository(library),
      new FakeRecommendationRepository(),
    );

    // Not a willingness-to-pay assumption, so the AI's own ranking stands.
    expect(results[0]?.libraryId).toBe("lib-interview");
  });

  it("returns an empty list when there are no library candidates", async () => {
    const results = await recommendExperiments(
      makeAssumption(),
      "discovery",
      makeFakeAiProvider([]),
      new FakeLibraryRepository([]),
      new FakeRecommendationRepository(),
    );
    expect(results).toEqual([]);
  });
});
