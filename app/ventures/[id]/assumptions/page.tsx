"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";

type DfvCategory = "desirability" | "feasibility" | "viability";

interface AssumptionDto {
  id: string;
  statement: string;
  dfvPrimary: DfvCategory;
  assumptionType: string;
  actor: string | null;
  observableBehaviour: string | null;
  importanceScore: number | null;
  evidenceStrengthScore: number | null;
  source: "ai_generated" | "user_generated" | "ai_generated_user_edited";
  status: string;
}

const DFV_BADGE: Record<DfvCategory, string> = {
  desirability: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  feasibility: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  viability: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
};

const DFV_LABEL: Record<DfvCategory, string> = {
  desirability: "Desirability",
  feasibility: "Feasibility",
  viability: "Viability",
};

export default function AssumptionsPage() {
  const { id } = useParams<{ id: string }>();
  const [assumptions, setAssumptions] = useState<AssumptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [dfvGapReason, setDfvGapReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/ventures/${id}/assumptions`)
      .then((r) => r.json())
      .then((data: { assumptions: AssumptionDto[] }) => {
        setAssumptions(data.assumptions);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleExtract() {
    setExtracting(true);
    setError(null);
    const response = await fetch(`/api/ventures/${id}/assumptions`, { method: "POST" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Something went wrong extracting assumptions.");
      setExtracting(false);
      return;
    }
    const data = (await response.json()) as {
      assumptions: AssumptionDto[];
      dfvGapReason?: string;
    };
    setDfvGapReason(data.dfvGapReason ?? null);
    setExtracting(false);
    load();
  }

  async function handleDelete(assumptionId: string) {
    await fetch(`/api/ventures/${id}/assumptions/${assumptionId}`, { method: "DELETE" });
    setAssumptions((prev) => prev.filter((a) => a.id !== assumptionId));
  }

  async function handleScoreChange(
    assumptionId: string,
    field: "importanceScore" | "evidenceStrengthScore",
    value: number,
  ) {
    setAssumptions((prev) =>
      prev.map((a) => (a.id === assumptionId ? { ...a, [field]: value } : a)),
    );
    await fetch(`/api/ventures/${id}/assumptions/${assumptionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href={`/ventures/${id}`} className="text-sm text-neutral-500 hover:underline">
        ← Venture
      </Link>
      <div className="mt-2 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Assumptions</h1>
        <button
          type="button"
          onClick={handleExtract}
          disabled={extracting}
          className={cn(
            "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900",
            "hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-200",
          )}
        >
          {extracting ? "Extracting…" : "Extract assumptions"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {dfvGapReason && (
        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {dfvGapReason}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : assumptions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <p className="text-neutral-600 dark:text-neutral-400">
            No assumptions yet.{" "}
            {dfvGapReason === null ? "Capture the idea first, then extract assumptions." : ""}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {assumptions.map((assumption) => (
            <li
              key={assumption.id}
              className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    DFV_BADGE[assumption.dfvPrimary],
                  )}
                >
                  {DFV_LABEL[assumption.dfvPrimary]}
                </span>
                <span className="text-xs text-neutral-500">{assumption.assumptionType}</span>
                {assumption.source !== "user_generated" && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                    {assumption.source === "ai_generated"
                      ? "AI suggested"
                      : "AI suggested · edited"}
                  </span>
                )}
              </div>

              <p className="mb-3">{assumption.statement}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <label>
                  <span className="mb-1 block text-neutral-500">Importance (0-10)</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={assumption.importanceScore ?? ""}
                    onChange={(e) =>
                      handleScoreChange(assumption.id, "importanceScore", Number(e.target.value))
                    }
                    className="w-full rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-neutral-500">Evidence strength (0-10)</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={assumption.evidenceStrengthScore ?? ""}
                    onChange={(e) =>
                      handleScoreChange(
                        assumption.id,
                        "evidenceStrengthScore",
                        Number(e.target.value),
                      )
                    }
                    className="w-full rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(assumption.id)}
                className="mt-3 text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {assumptions.length > 0 && (
        <Link
          href={`/ventures/${id}/map`}
          className="mt-6 inline-block text-sm font-medium underline underline-offset-4"
        >
          Continue to risk map →
        </Link>
      )}
    </main>
  );
}
