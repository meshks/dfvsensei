"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface TestCardDto {
  id: string;
  assumptionId: string;
  decisionQuestion: string | null;
  objective: string | null;
  targetParticipantOrDataset: string | null;
  recruitmentOrAccessMethod: string | null;
  sampleSize: string | null;
  procedure: string | null;
  keyMetric: string | null;
  successThreshold: string | null;
  failureThreshold: string | null;
  inconclusiveRange: string | null;
  evidenceExpected: string | null;
  evidenceStrengthLevel: string | null;
  status: "draft" | "ready" | "running" | "complete";
}

const FIELD_DEFS: { key: keyof TestCardDto; label: string; multiline?: boolean }[] = [
  { key: "decisionQuestion", label: "Decision question" },
  { key: "objective", label: "Objective", multiline: true },
  { key: "targetParticipantOrDataset", label: "Target participant or dataset" },
  { key: "recruitmentOrAccessMethod", label: "Recruitment or access method" },
  { key: "sampleSize", label: "Sample size" },
  { key: "procedure", label: "Procedure", multiline: true },
  { key: "keyMetric", label: "Key metric" },
  { key: "successThreshold", label: "Success threshold" },
  { key: "failureThreshold", label: "Failure threshold" },
  { key: "inconclusiveRange", label: "Inconclusive range" },
  { key: "evidenceExpected", label: "Evidence expected" },
];

const STATUS_ORDER: TestCardDto["status"][] = ["draft", "ready", "running", "complete"];

export default function TestCardDetailPage() {
  const { id, testCardId } = useParams<{ id: string; testCardId: string }>();
  const [testCard, setTestCard] = useState<TestCardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ventures/${id}/test-cards/${testCardId}`)
      .then((r) => r.json())
      .then((data: { testCard: TestCardDto }) => {
        setTestCard(data.testCard);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, testCardId]);

  async function handleFieldSave(field: keyof TestCardDto, value: string) {
    setTestCard((prev) => (prev ? { ...prev, [field]: value } : prev));
    await fetch(`/api/ventures/${id}/test-cards/${testCardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  async function handleStatusChange(status: TestCardDto["status"]) {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/ventures/${id}/test-cards/${testCardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not change status.");
      setSaving(false);
      return;
    }
    const data = (await response.json()) as { testCard: TestCardDto };
    setTestCard(data.testCard);
    setSaving(false);
  }

  if (loading) {
    return <main className="mx-auto max-w-2xl px-6 py-12 text-sm text-neutral-500">Loading…</main>;
  }
  if (!testCard) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 text-sm text-neutral-500">
        Test Card not found.
      </main>
    );
  }

  const thresholdsComplete = Boolean(
    testCard.successThreshold && testCard.failureThreshold && testCard.inconclusiveRange,
  );
  const currentIndex = STATUS_ORDER.indexOf(testCard.status);
  const nextStatus = STATUS_ORDER[currentIndex + 1];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/ventures/${id}/assumptions/${testCard.assumptionId}`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Assumption
      </Link>

      <div className="mt-2 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Test Card</h1>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium capitalize dark:bg-neutral-800">
          {testCard.status}
        </span>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="space-y-5">
        {FIELD_DEFS.map((field) => (
          <EditableField
            key={field.key}
            label={field.label}
            value={(testCard[field.key] as string) ?? ""}
            multiline={field.multiline}
            onSave={(value) => handleFieldSave(field.key, value)}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        {nextStatus && (
          <button
            type="button"
            onClick={() => handleStatusChange(nextStatus)}
            disabled={saving || (nextStatus !== "draft" && !thresholdsComplete)}
            className={cn(
              "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900",
              "hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-200",
            )}
            title={
              nextStatus !== "draft" && !thresholdsComplete
                ? "Success, failure, and inconclusive thresholds are all required first"
                : undefined
            }
          >
            Mark as {nextStatus}
          </button>
        )}
        {!thresholdsComplete && (
          <p className="text-xs text-neutral-500">
            Success/failure/inconclusive thresholds are required before this can leave draft.
          </p>
        )}
      </div>

      {testCard.status !== "draft" && (
        <div className="mt-6 flex gap-4 text-sm">
          <Link
            href={`/ventures/${id}/test-cards/${testCardId}/evidence`}
            className="font-medium underline underline-offset-4"
          >
            Record evidence
          </Link>
          <Link
            href={`/ventures/${id}/test-cards/${testCardId}/learning-card`}
            className="font-medium underline underline-offset-4"
          >
            Learning Card
          </Link>
        </div>
      )}
    </main>
  );
}

function EditableField({
  label,
  value,
  multiline,
  onSave,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== value && onSave(draft)}
          rows={3}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      ) : (
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== value && onSave(draft)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      )}
    </div>
  );
}
