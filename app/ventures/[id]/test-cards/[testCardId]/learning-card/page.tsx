"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";

type ThresholdResult = "success" | "failure" | "inconclusive";

interface TestCardDto {
  assumptionId: string;
  successThreshold: string | null;
}

interface AssumptionDto {
  id: string;
  statement: string;
}

interface LearningCardDto {
  id: string;
  believed: string;
  expected: string;
  happened: string;
  metricResult: string | null;
  thresholdResult: ThresholdResult;
  insight: string;
  confidence: number | null;
}

export default function LearningCardPage() {
  const { id, testCardId } = useParams<{ id: string; testCardId: string }>();
  const router = useRouter();

  const [existing, setExisting] = useState<LearningCardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    believed: "",
    expected: "",
    happened: "",
    metricResult: "",
    thresholdResult: "inconclusive" as ThresholdResult,
    insight: "",
    contradictionNote: "",
    nextExperimentNote: "",
  });

  useEffect(() => {
    async function load() {
      const [testCardRes, learningCardRes] = await Promise.all([
        fetch(`/api/ventures/${id}/test-cards/${testCardId}`).then((r) => r.json()),
        fetch(`/api/ventures/${id}/test-cards/${testCardId}/learning-card`).then((r) => r.json()),
      ]);
      const testCard: TestCardDto = testCardRes.testCard;
      const learningCard: LearningCardDto | null = learningCardRes.learningCard;

      if (learningCard) {
        setExisting(learningCard);
        setForm({
          believed: learningCard.believed,
          expected: learningCard.expected,
          happened: learningCard.happened,
          metricResult: learningCard.metricResult ?? "",
          thresholdResult: learningCard.thresholdResult,
          insight: learningCard.insight,
          contradictionNote: "",
          nextExperimentNote: "",
        });
      } else if (testCard) {
        const assumptionsRes = await fetch(`/api/ventures/${id}/assumptions`).then((r) => r.json());
        const assumption = (assumptionsRes.assumptions as AssumptionDto[]).find(
          (a) => a.id === testCard.assumptionId,
        );
        setForm((prev) => ({
          ...prev,
          believed: assumption?.statement ?? "",
          expected: testCard.successThreshold ?? "",
        }));
      }
      setLoading(false);
    }
    load();
  }, [id, testCardId]);

  async function handleSynthesize() {
    setSynthesizing(true);
    const response = await fetch(
      `/api/ventures/${id}/test-cards/${testCardId}/learning-card/synthesize`,
      { method: "POST" },
    );
    if (response.ok) {
      const data = (await response.json()) as {
        draft: { happened: string; metricResult: string; insight: string };
      };
      setForm((prev) => ({
        ...prev,
        happened: data.draft.happened,
        metricResult: data.draft.metricResult,
        insight: data.draft.insight,
      }));
    }
    setSynthesizing(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch(`/api/ventures/${id}/test-cards/${testCardId}/learning-card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (response.ok) {
      router.push(`/ventures/${id}/test-cards/${testCardId}/decision`);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-2xl px-6 py-12 text-sm text-neutral-500">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/ventures/${id}/test-cards/${testCardId}`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Test Card
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Learning Card</h1>

      {existing && (
        <p className="mb-6 rounded-md bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
          A Learning Card already exists for this Test Card. Submitting again records a new one.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="What we believed"
          value={form.believed}
          onChange={(v) => setForm({ ...form, believed: v })}
          multiline
        />
        <Field
          label="What we expected"
          value={form.expected}
          onChange={(v) => setForm({ ...form, expected: v })}
          multiline
        />

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">What happened</h2>
          <button
            type="button"
            onClick={handleSynthesize}
            disabled={synthesizing}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {synthesizing ? "Synthesizing…" : "Synthesize from evidence (AI)"}
          </button>
        </div>
        <Field
          label=""
          value={form.happened}
          onChange={(v) => setForm({ ...form, happened: v })}
          multiline
          hideLabel
        />
        <Field
          label="Metric result"
          value={form.metricResult}
          onChange={(v) => setForm({ ...form, metricResult: v })}
        />

        <div>
          <label htmlFor="threshold-result" className="mb-1 block text-sm font-medium">
            Threshold result
          </label>
          <select
            id="threshold-result"
            value={form.thresholdResult}
            onChange={(e) =>
              setForm({ ...form, thresholdResult: e.target.value as ThresholdResult })
            }
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="inconclusive">Inconclusive</option>
          </select>
        </div>

        <Field
          label="Insight"
          value={form.insight}
          onChange={(v) => setForm({ ...form, insight: v })}
          multiline
        />
        <Field
          label="Contradiction (optional)"
          value={form.contradictionNote}
          onChange={(v) => setForm({ ...form, contradictionNote: v })}
        />
        <Field
          label="Next experiment (optional)"
          value={form.nextExperimentNote}
          onChange={(v) => setForm({ ...form, nextExperimentNote: v })}
        />

        <button
          type="submit"
          disabled={saving || !form.believed || !form.happened || !form.insight}
          className={cn(
            "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900",
            "hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-200",
          )}
        >
          {saving ? "Saving…" : "Save Learning Card"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  hideLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  hideLabel?: boolean;
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, "-") || "happened"}`;
  return (
    <div>
      {!hideLabel && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium">
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      )}
    </div>
  );
}
