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
