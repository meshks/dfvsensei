import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiValidationError } from "./provider";
import { resolveStructuredOutput } from "./structured-output";

const schema = z.object({ value: z.number().min(0).max(10) });

describe("resolveStructuredOutput", () => {
  it("returns parsed data on a valid first attempt", async () => {
    const generate = vi.fn().mockResolvedValue(JSON.stringify({ value: 5 }));
    const result = await resolveStructuredOutput({
      operation: "idea-clarification",
      schema,
      maxRetries: 1,
      generate,
    });
    expect(result.data).toEqual({ value: 5 });
    expect(result.attempts).toBe(1);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith(undefined);
  });

  it("retries once on malformed (non-JSON) output and succeeds", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce("not json at all")
      .mockResolvedValueOnce(JSON.stringify({ value: 3 }));
    const result = await resolveStructuredOutput({
      operation: "idea-clarification",
      schema,
      maxRetries: 1,
      generate,
    });
    expect(result.data).toEqual({ value: 3 });
    expect(result.attempts).toBe(2);
    expect(generate).toHaveBeenNthCalledWith(2, expect.stringContaining("failed validation"));
  });

  it("retries once on schema-violating (but parseable) JSON and succeeds", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify({ value: 999 })) // out of range
      .mockResolvedValueOnce(JSON.stringify({ value: 7 }));
    const result = await resolveStructuredOutput({
      operation: "idea-clarification",
      schema,
      maxRetries: 1,
      generate,
    });
    expect(result.data).toEqual({ value: 7 });
    expect(result.attempts).toBe(2);
  });

  it("throws AiValidationError after exhausting retries", async () => {
    const generate = vi.fn().mockResolvedValue("still not json");
    await expect(
      resolveStructuredOutput({
        operation: "assumption-extraction",
        schema,
        maxRetries: 1,
        generate,
      }),
    ).rejects.toThrow(AiValidationError);
    expect(generate).toHaveBeenCalledTimes(2); // initial + 1 retry
  });

  it("respects maxRetries: 0 (no retry at all)", async () => {
    const generate = vi.fn().mockResolvedValue("bad");
    await expect(
      resolveStructuredOutput({
        operation: "assumption-extraction",
        schema,
        maxRetries: 0,
        generate,
      }),
    ).rejects.toThrow(AiValidationError);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("the thrown error carries the operation name and last raw response", async () => {
    const generate = vi.fn().mockResolvedValue("garbage");
    try {
      await resolveStructuredOutput({
        operation: "map-feedback",
        schema,
        maxRetries: 0,
        generate,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AiValidationError);
      const validationError = err as AiValidationError;
      expect(validationError.operation).toBe("map-feedback");
      expect(validationError.lastRawResponse).toBe("garbage");
      expect(validationError.attempts).toBe(1);
    }
  });
});
