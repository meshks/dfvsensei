"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";

const DECISION_TYPES = [
  "proceed",
  "pivot",
  "repeat",
  "refine",
  "pause",
  "stop",
  "escalate",
] as const;

export default function DecisionPage() {
  const { id, testCardId } = useParams<{ id: string; testCardId: string }>();
  const router = useRouter();
  const [hasLearningCard, setHasLearningCard] = useState<boolean | null>(null);
  const [decisionType, setDecisionType] = useState<(typeof DECISION_TYPES)[number]>("proceed");
  const [whatChanges, setWhatChanges] = useState("");
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ventures/${id}/test-cards/${testCardId}/learning-card`)
      .then((r) => r.json())
      .then((data: { learningCard: unknown }) => setHasLearningCard(data.learningCard !== null))
      .catch(() => setHasLearningCard(false));
  }, [id, testCardId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const response = await fetch(`/api/ventures/${id}/test-cards/${testCardId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisionType, whatChanges, rationale }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Something went wrong recording the decision.");
      setSubmitting(false);
      return;
    }
    router.push(`/ventures/${id}`);
    router.refresh();
  }

  if (hasLearningCard === null) {
    return <main className="mx-auto max-w-2xl px-6 py-12 text-sm text-neutral-500">Loading…</main>;
  }

  if (!hasLearningCard) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-4 text-2xl font-semibold">Decision</h1>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          A Learning Card must be completed before you can record a decision -- activity isn&rsquo;t
          the same as learning.
        </p>
        <Link
          href={`/ventures/${id}/test-cards/${testCardId}/learning-card`}
          className="text-sm font-medium underline underline-offset-4"
        >
          Complete the Learning Card
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/ventures/${id}/test-cards/${testCardId}/learning-card`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Learning Card
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Decision</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Decision</legend>
          <div className="grid grid-cols-4 gap-2">
            {DECISION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={decisionType === type}
                onClick={() => setDecisionType(type)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm capitalize",
                  decisionType === type
                    ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900"
                    : "border-neutral-300 dark:border-neutral-700",
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="what-changes" className="mb-1 block text-sm font-medium">
            What changes in the venture
          </label>
          <textarea
            id="what-changes"
            value={whatChanges}
            onChange={(e) => setWhatChanges(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label htmlFor="rationale" className="mb-1 block text-sm font-medium">
            Rationale
          </label>
          <textarea
            id="rationale"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900",
            "hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-200",
          )}
        >
          {submitting ? "Recording…" : "Record decision"}
        </button>
      </form>
    </main>
  );
}
