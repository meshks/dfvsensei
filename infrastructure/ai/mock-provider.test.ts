import { describe, expect, it } from "vitest";
import type { AiOperationName } from "./provider";
import {
  MockAiProvider,
  __mockFixtureSchemasForTests as FIXTURE_SCHEMAS,
  __mockFixturesForTests as MOCK_FIXTURES,
} from "./mock-provider";

const OPERATIONS = Object.keys(FIXTURE_SCHEMAS) as AiOperationName[];

describe("mock fixtures stay in sync with their schemas", () => {
  it.each(OPERATIONS)("%s fixture is schema-valid", (operation) => {
    const schema = FIXTURE_SCHEMAS[operation];
    const result = schema.safeParse(MOCK_FIXTURES[operation]);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });
});

describe("MockAiProvider", () => {
  it("resolves with schema-valid data on the first attempt by default", async () => {
    const provider = new MockAiProvider();
    const result = await provider.complete({
      operation: "idea-clarification",
      promptVersion: "v1",
      systemPrompt: "system",
      userPrompt: "user",
      schema: FIXTURE_SCHEMAS["idea-clarification"],
    });
    expect(result.raw.attempts).toBe(1);
    expect(result.raw.model).toBe("mock");
    expect(result.data).toEqual(MOCK_FIXTURES["idea-clarification"]);
  });

  it("exercises the retry path when simulateValidationFailureOnce is set", async () => {
    const provider = new MockAiProvider({ simulateValidationFailureOnce: true });
    const result = await provider.complete({
      operation: "assumption-extraction",
      promptVersion: "v1",
      systemPrompt: "system",
      userPrompt: "user",
      schema: FIXTURE_SCHEMAS["assumption-extraction"],
    });
    expect(result.raw.attempts).toBe(2);
  });

  it("scores every candidate embedded in an experiment-recommendation prompt, not an empty list", async () => {
    // Regression test: the fixture used to be a hardcoded `recommendations: []`,
    // which recommend-experiments.ts filters down to candidateById matches --
    // meaning "Get recommendations" always showed nothing under AI_PROVIDER=mock.
    const userPrompt = [
      "<candidates>",
      "- libraryId: lib-1",
      "  name: Customer interview",
      "  family: customer_interview",
      "  discoveryOrValidation: discovery",
      "  evidenceStrength: light",
      "  setupTime: short, runTime: short, relativeCost: low",
      "  summary: A structured 1:1 conversation.",
      "- libraryId: lib-2",
      "  name: Paid pilot",
      "  family: paid_pilot",
      "  discoveryOrValidation: validation",
      "  evidenceStrength: strong",
      "  setupTime: medium, runTime: long, relativeCost: medium",
      "  summary: A limited-scope paid engagement.",
      "</candidates>",
    ].join("\n");

    const provider = new MockAiProvider();
    const result = await provider.complete({
      operation: "experiment-recommendation",
      promptVersion: "v1",
      systemPrompt: "system",
      userPrompt,
      schema: FIXTURE_SCHEMAS["experiment-recommendation"],
    });

    const recommendations = (
      result.data as { recommendations: { libraryId: string; score: number }[] }
    ).recommendations;
    expect(recommendations).toHaveLength(2);
    expect(recommendations.map((r) => r.libraryId).sort()).toEqual(["lib-1", "lib-2"]);
    for (const r of recommendations) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
    // Strong, cheaper/faster evidence should score at least as high as light evidence.
    const byId = new Map(recommendations.map((r) => [r.libraryId, r.score]));
    expect(byId.get("lib-2")!).toBeGreaterThan(byId.get("lib-1")!);
  });

  it("every operation resolves without throwing", async () => {
    const provider = new MockAiProvider();
    for (const operation of OPERATIONS) {
      await expect(
        provider.complete({
          operation,
          promptVersion: "v1",
          systemPrompt: "system",
          userPrompt: "user",
          schema: FIXTURE_SCHEMAS[operation],
        }),
      ).resolves.toBeDefined();
    }
  });
});
