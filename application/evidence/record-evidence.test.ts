import { describe, expect, it } from "vitest";
import type { EvidenceRepository, CreateEvidenceFields } from "./evidence-repository";
import { recordEvidence, recordEvidenceRequestSchema } from "./record-evidence";

describe("recordEvidenceRequestSchema", () => {
  it("treats blank optional fields as absent, not empty strings", () => {
    const parsed = recordEvidenceRequestSchema.parse({
      evidenceType: "commitment",
      description: "Signed a paid pilot agreement.",
      metricValue: "",
      dateObserved: "",
    });
    expect(parsed.metricValue).toBeUndefined();
    expect(parsed.dateObserved).toBeUndefined();
  });
});

describe("recordEvidence", () => {
  it("passes null, not an empty string, through to the repository for blank optional fields", async () => {
    const captured: { fields?: CreateEvidenceFields } = {};
    const repository: EvidenceRepository = {
      create: async (fields) => {
        captured.fields = fields;
        return { id: "e1", ...fields, createdAt: new Date().toISOString() };
      },
      listByTestCard: async () => [],
    };

    await recordEvidence(
      "tc-1",
      {
        evidenceType: "commitment",
        description: "Signed a paid pilot agreement.",
        metricValue: undefined,
        dateObserved: undefined,
      },
      "user-1",
      repository,
    );

    expect(captured.fields?.metricValue).toBeNull();
    expect(captured.fields?.dateObserved).toBeNull();
  });
});
