import { describe, expect, it } from "vitest";
import {
  type AssumptionForQualityCheck,
  detectDuplicates,
  detectMissingActor,
  detectMissingBehaviour,
  runDeterministicQualityChecks,
} from "./quality";

function makeAssumption(
  overrides: Partial<AssumptionForQualityCheck> = {},
): AssumptionForQualityCheck {
  return {
    id: "a1",
    statement:
      "We believe window-cleaning companies will pay for AI-generated cleanliness evidence.",
    actor: "window-cleaning company owners",
    observableBehaviour: "purchases a paid pilot subscription",
    ...overrides,
  };
}

describe("detectMissingActor", () => {
  it("flags a null actor", () => {
    const flag = detectMissingActor(makeAssumption({ actor: null }));
    expect(flag?.type).toBe("missing_actor");
  });

  it("flags a whitespace-only actor", () => {
    const flag = detectMissingActor(makeAssumption({ actor: "   " }));
    expect(flag?.type).toBe("missing_actor");
  });

  it("does not flag a populated actor", () => {
    expect(detectMissingActor(makeAssumption())).toBeNull();
  });
});

describe("detectMissingBehaviour", () => {
  it("flags a null observable behaviour", () => {
    const flag = detectMissingBehaviour(makeAssumption({ observableBehaviour: null }));
    expect(flag?.type).toBe("missing_behaviour");
  });

  it("does not flag a populated observable behaviour", () => {
    expect(detectMissingBehaviour(makeAssumption())).toBeNull();
  });
});

describe("detectDuplicates", () => {
  it("flags two near-identical statements", () => {
    const a = makeAssumption({
      id: "a1",
      statement: "We believe window-cleaning companies will pay for AI cleanliness reports.",
    });
    const b = makeAssumption({
      id: "a2",
      statement: "We believe window cleaning companies will pay for AI cleanliness reports!",
    });
    const flags = detectDuplicates([a, b]);
    expect(flags.get("a1")?.type).toBe("duplicate");
    expect(flags.get("a1")?.relatedAssumptionId).toBe("a2");
    expect(flags.get("a2")?.relatedAssumptionId).toBe("a1");
  });

  it("does not flag unrelated statements", () => {
    const a = makeAssumption({
      id: "a1",
      statement: "We believe window-cleaning companies will pay for AI cleanliness reports.",
    });
    const b = makeAssumption({
      id: "a2",
      statement:
        "We believe the AI model can distinguish clean glass from dirty glass under bright sunlight.",
    });
    const flags = detectDuplicates([a, b]);
    expect(flags.size).toBe(0);
  });

  it("is order-independent and handles more than two assumptions", () => {
    const a = makeAssumption({
      id: "a1",
      statement: "We believe customers want faster onboarding.",
    });
    const b = makeAssumption({
      id: "a2",
      statement: "We believe customers want a faster onboarding.",
    });
    const c = makeAssumption({
      id: "a3",
      statement: "We believe technicians can complete field repairs within two hours.",
    });
    const flags = detectDuplicates([c, a, b]);
    expect(flags.has("a1")).toBe(true);
    expect(flags.has("a2")).toBe(true);
    expect(flags.has("a3")).toBe(false);
  });
});

describe("runDeterministicQualityChecks", () => {
  it("returns no flags for a well-formed, unique assumption", () => {
    const a = makeAssumption();
    expect(runDeterministicQualityChecks(a, [a])).toEqual([]);
  });

  it("accumulates multiple flags for a poorly-formed assumption", () => {
    const bad = makeAssumption({ id: "bad", actor: null, observableBehaviour: null });
    const flags = runDeterministicQualityChecks(bad, [bad]);
    const types = flags.map((f) => f.type).sort();
    expect(types).toEqual(["missing_actor", "missing_behaviour"]);
  });

  it("includes the duplicate flag when other assumptions in the venture overlap", () => {
    const a = makeAssumption({ id: "a1" });
    const b = makeAssumption({ id: "a2" });
    const flags = runDeterministicQualityChecks(a, [a, b]);
    expect(flags.some((f) => f.type === "duplicate")).toBe(true);
  });
});
