"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

interface IdeaInputDto {
  id: string;
  targetCustomer: string | null;
  userBuyerPayerNote: string | null;
  problem: string | null;
  solutionOrIp: string | null;
  outcome: string | null;
  currentAlternatives: string | null;
  aiGeneratedSummary: string | null;
  userEditedSummary: string | null;
}

const EMPTY_FORM = {
  targetCustomer: "",
  userBuyerPayerNote: "",
  problem: "",
  solutionOrIp: "",
  outcome: "",
  currentAlternatives: "",
};

export default function IdeaCapturePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState(EMPTY_FORM);
  const [ideaInput, setIdeaInput] = useState<IdeaInputDto | null>(null);
  const [aiGaps, setAiGaps] = useState<string[]>([]);
  const [editedSummary, setEditedSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ventures/${id}/idea`)
      .then((r) => r.json())
      .then((data: { ideaInput: IdeaInputDto | null }) => {
        if (data.ideaInput) {
          setIdeaInput(data.ideaInput);
          setForm({
            targetCustomer: data.ideaInput.targetCustomer ?? "",
            userBuyerPayerNote: data.ideaInput.userBuyerPayerNote ?? "",
            problem: data.ideaInput.problem ?? "",
            solutionOrIp: data.ideaInput.solutionOrIp ?? "",
            outcome: data.ideaInput.outcome ?? "",
            currentAlternatives: data.ideaInput.currentAlternatives ?? "",
          });
          setEditedSummary(
            data.ideaInput.userEditedSummary ?? data.ideaInput.aiGeneratedSummary ?? "",
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch(`/api/ventures/${id}/idea`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Something went wrong generating the summary.");
      setSubmitting(false);
      return;
    }

    const data = (await response.json()) as {
      ideaInput: IdeaInputDto;
      aiConfidence: number;
      aiGaps: string[];
    };
    setIdeaInput(data.ideaInput);
    setAiGaps(data.aiGaps);
    setEditedSummary(data.ideaInput.aiGeneratedSummary ?? "");
    setSubmitting(false);
  }

  async function handleSaveSummary() {
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/ventures/${id}/idea`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEditedSummary: editedSummary }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Something went wrong saving the summary.");
      setSaving(false);
      return;
    }

    router.push(`/ventures/${id}`);
    router.refresh();
  }

  if (loading) {
    return <main className="mx-auto max-w-2xl px-6 py-12 text-sm text-neutral-500">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Capture the idea</h1>
      <p className="mb-8 text-sm text-neutral-600 dark:text-neutral-400">
        Fill in what you know. The AI will suggest a summary using the template: &ldquo;We help
        [customer] who struggle with [problem] by providing [solution], so they can achieve
        [outcome].&rdquo; You&rsquo;ll review and edit it before it&rsquo;s saved.
      </p>

      <form onSubmit={handleGenerate} className="space-y-5">
        <Field
          label="Target customer"
          value={form.targetCustomer}
          onChange={(v) => setForm({ ...form, targetCustomer: v })}
          placeholder="e.g. window-cleaning company owners"
        />
        <Field
          label="User vs. buyer vs. payer (optional)"
          value={form.userBuyerPayerNote}
          onChange={(v) => setForm({ ...form, userBuyerPayerNote: v })}
          placeholder="e.g. technicians use it, owners pay for it"
        />
        <Field
          label="Problem"
          value={form.problem}
          onChange={(v) => setForm({ ...form, problem: v })}
          placeholder="What important problem do they struggle with?"
          multiline
        />
        <Field
          label="Proposed solution or existing IP"
          value={form.solutionOrIp}
          onChange={(v) => setForm({ ...form, solutionOrIp: v })}
          multiline
        />
        <Field
          label="Desired outcome"
          value={form.outcome}
          onChange={(v) => setForm({ ...form, outcome: v })}
          placeholder="What measurable outcome will they achieve?"
        />
        <Field
          label="Current alternatives (optional)"
          value={form.currentAlternatives}
          onChange={(v) => setForm({ ...form, currentAlternatives: v })}
          multiline
        />

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !form.targetCustomer || !form.problem}
          className={cn(
            "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900",
            "hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-200",
          )}
        >
          {submitting ? "Generating…" : "Generate summary"}
        </button>
      </form>

      {ideaInput && (
        <section className="mt-10 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
              Summary
            </h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              AI suggested — edit before saving
            </span>
          </div>

          {aiGaps.length > 0 && (
            <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-medium">The AI flagged gaps in what you provided:</p>
              <ul className="mt-1 list-inside list-disc">
                {aiGaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          )}

          <textarea
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />

          <button
            type="button"
            onClick={handleSaveSummary}
            disabled={saving || editedSummary.trim().length === 0}
            className={cn(
              "mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900",
              "hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-200",
            )}
          >
            {saving ? "Saving…" : "Save summary"}
          </button>
        </section>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      )}
    </div>
  );
}
