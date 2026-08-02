"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";

const EVIDENCE_TYPES = [
  "opinion",
  "interview_insight",
  "observed_behaviour",
  "commitment",
  "payment",
  "technical_benchmark",
  "operational_proof",
  "documentary_proof",
  "financial_result",
  "other",
] as const;

interface EvidenceItemDto {
  id: string;
  evidenceType: (typeof EVIDENCE_TYPES)[number];
  description: string;
  metricValue: string | null;
  dateObserved: string | null;
  confidence: number | null;
  createdAt: string;
}

export default function EvidenceLogPage() {
  const { id, testCardId } = useParams<{ id: string; testCardId: string }>();
  const [items, setItems] = useState<EvidenceItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    evidenceType: "interview_insight" as (typeof EVIDENCE_TYPES)[number],
    description: "",
    metricValue: "",
    dateObserved: "",
  });

  function load() {
    fetch(`/api/ventures/${id}/test-cards/${testCardId}/evidence`)
      .then((r) => r.json())
      .then((data: { evidenceItems: EvidenceItemDto[] }) => {
        setItems(data.evidenceItems);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(load, [id, testCardId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    await fetch(`/api/ventures/${id}/test-cards/${testCardId}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({
      evidenceType: "interview_insight",
      description: "",
      metricValue: "",
      dateObserved: "",
    });
    setSubmitting(false);
    load();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/ventures/${id}/test-cards/${testCardId}`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Test Card
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Evidence log</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-10 space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <div>
          <label htmlFor="evidence-type" className="mb-1 block text-sm font-medium">
            Evidence type
          </label>
          <select
            id="evidence-type"
            value={form.evidenceType}
            onChange={(e) =>
              setForm({ ...form, evidenceType: e.target.value as (typeof EVIDENCE_TYPES)[number] })
            }
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {EVIDENCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="evidence-description" className="mb-1 block text-sm font-medium">
            Description
          </label>
          <textarea
            id="evidence-description"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="evidence-metric" className="mb-1 block text-sm font-medium">
              Metric value (optional)
            </label>
            <input
              id="evidence-metric"
              value={form.metricValue}
              onChange={(e) => setForm({ ...form, metricValue: e.target.value })}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label htmlFor="evidence-date" className="mb-1 block text-sm font-medium">
              Date observed (optional)
            </label>
            <input
              id="evidence-date"
              type="date"
              value={form.dateObserved}
              onChange={(e) => setForm({ ...form, dateObserved: e.target.value })}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !form.description.trim()}
          className={cn(
            "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900",
            "hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-200",
          )}
        >
          {submitting ? "Saving…" : "Add evidence"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-500">No evidence recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <span className="mb-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium capitalize dark:bg-neutral-800">
                {item.evidenceType.replace(/_/g, " ")}
              </span>
              <p className="text-sm">{item.description}</p>
              {(item.metricValue || item.dateObserved) && (
                <p className="mt-1 text-xs text-neutral-500">
                  {item.metricValue && <span>metric: {item.metricValue} </span>}
                  {item.dateObserved && <span>· observed: {item.dateObserved}</span>}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
