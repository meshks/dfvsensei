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
}

interface ScoreBreakdown {
  assumptionFit: number;
  evidenceStrengthRequired: number;
  costAndSpeed: number;
  stageAppropriateness: number;
  accessEthicsPracticality: number;
}

interface RecommendationDto {
  libraryId: string;
  name: string;
  rank: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  whatItCanProve: string;
  whatItCannotProve: string;
  guardrailNote?: string;
}

const DFV_BADGE: Record<DfvCategory, string> = {
  desirability: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  feasibility: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  viability: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
};

export default function AssumptionDetailPage() {
  const { id, assumptionId } = useParams<{ id: string; assumptionId: string }>();
  const [assumption, setAssumption] = useState<AssumptionDto | null>(null);
  const [decisionQuestion, setDecisionQuestion] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch(`/api/ventures/${id}/assumptions`)
      .then((r) => r.json())
      .then((data: { assumptions: AssumptionDto[] }) => {
        setAssumption(data.assumptions.find((a) => a.id === assumptionId) ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/ventures/${id}/assumptions/${assumptionId}/recommendations`)
      .then((r) => r.json())
      .then((data: { recommendations: RecommendationDto[] }) =>
        setRecommendations(data.recommendations),
      )
      .catch(() => undefined);
  }, [id, assumptionId]);

  async function handleGenerate() {
    setGenerating(true);
    const response = await fetch(
      `/api/ventures/${id}/assumptions/${assumptionId}/recommendations`,
      { method: "POST" },
    );
    if (response.ok) {
      const data = (await response.json()) as { recommendations: RecommendationDto[] };
      setRecommendations(data.recommendations);
    }
    setGenerating(false);
  }

  if (loading) {
    return <main className="mx-auto max-w-3xl px-6 py-12 text-sm text-neutral-500">Loading…</main>;
  }
  if (!assumption) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 text-sm text-neutral-500">Not found.</main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/ventures/${id}/assumptions`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Assumptions
      </Link>

      <div className="mt-2 mb-6">
        <span
          className={cn(
            "mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
            DFV_BADGE[assumption.dfvPrimary],
          )}
        >
          {assumption.dfvPrimary}
        </span>
        <h1 className="text-xl font-semibold">{assumption.statement}</h1>
      </div>

      <div className="mb-8">
        <label htmlFor="decision-question" className="mb-1 block text-sm font-medium">
          What decision will this experiment help you make?
        </label>
        <input
          id="decision-question"
          value={decisionQuestion}
          onChange={(e) => setDecisionQuestion(e.target.value)}
          placeholder="e.g. whether to build a paid pilot offer this quarter"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recommended experiments</h2>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className={cn(
            "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900",
            "hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-200",
          )}
        >
          {generating ? "Ranking…" : recommendations.length > 0 ? "Re-rank" : "Get recommendations"}
        </button>
      </div>

      {recommendations.length === 0 ? (
        <p className="text-sm text-neutral-500">No recommendations yet.</p>
      ) : (
        <ol className="space-y-4">
          {recommendations.map((rec) => (
            <li
              key={rec.libraryId}
              className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">
                  #{rec.rank} {rec.name}
                </span>
                <span className="text-xs text-neutral-500">score {rec.score.toFixed(2)}</span>
              </div>

              {rec.guardrailNote && (
                <p className="mb-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {rec.guardrailNote}
                </p>
              )}

              <dl className="mb-3 grid grid-cols-5 gap-2 text-center text-xs text-neutral-500">
                <div>
                  <dt>Fit</dt>
                  <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                    {rec.scoreBreakdown.assumptionFit.toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                    {rec.scoreBreakdown.evidenceStrengthRequired.toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt>Cost/speed</dt>
                  <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                    {rec.scoreBreakdown.costAndSpeed.toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt>Stage</dt>
                  <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                    {rec.scoreBreakdown.stageAppropriateness.toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt>Access/ethics</dt>
                  <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                    {rec.scoreBreakdown.accessEthicsPracticality.toFixed(2)}
                  </dd>
                </div>
              </dl>

              <p className="mb-1 text-sm">
                <span className="font-medium">Can prove:</span> {rec.whatItCanProve}
              </p>
              <p className="mb-3 text-sm">
                <span className="font-medium">Cannot prove:</span> {rec.whatItCannotProve}
              </p>

              <Link
                href={`/ventures/${id}/test-cards/new?assumptionId=${assumptionId}&libraryId=${rec.libraryId}&decisionQuestion=${encodeURIComponent(decisionQuestion)}`}
                className="text-sm font-medium underline underline-offset-4"
              >
                Create Test Card
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
