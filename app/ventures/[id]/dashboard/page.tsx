import Link from "next/link";
import { listAssumptions } from "@/application/assumptions/list-assumptions";
import { buildDashboard } from "@/application/dashboard/get-dashboard";
import { PostgresAssumptionRepository } from "@/infrastructure/supabase/assumptions-repository";
import { PostgresDecisionRepository } from "@/infrastructure/supabase/decision-repository";
import { PostgresTestCardRepository } from "@/infrastructure/supabase/test-card-repository";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const DFV_LABEL: Record<string, string> = {
  desirability: "Desirability",
  feasibility: "Feasibility",
  viability: "Viability",
};

const DFV_BAR_COLOR: Record<string, string> = {
  desirability: "bg-orange-500",
  feasibility: "bg-blue-500",
  viability: "bg-green-500",
};

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [assumptions, testCards, decisions] = await Promise.all([
    listAssumptions(id, new PostgresAssumptionRepository()),
    new PostgresTestCardRepository().listByVenture(id),
    new PostgresDecisionRepository().listByVenture(id),
  ]);
  const dashboard = buildDashboard(assumptions, testCards, decisions);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href={`/ventures/${id}`} className="text-sm text-neutral-500 hover:underline">
        ← Venture
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Dashboard</h1>

      <section className="mb-6 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-1 text-sm font-medium tracking-wide text-neutral-500 uppercase">
          DFV confidence
        </h2>
        <p className="mb-4 text-xs text-neutral-500">
          Average evidence strength per category -- shown separately on purpose; there is no single
          blended venture score.
        </p>
        <div className="space-y-3">
          {dashboard.dfvConfidence.map((d) => (
            <div key={d.category}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{DFV_LABEL[d.category]}</span>
                <span className="text-neutral-500">
                  {d.averageEvidenceStrength === null
                    ? "no scored assumptions"
                    : `${d.averageEvidenceStrength.toFixed(1)} / 10 (${d.assumptionCount} assumption${d.assumptionCount === 1 ? "" : "s"})`}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className={cn("h-2 rounded-full", DFV_BAR_COLOR[d.category])}
                  style={{
                    width: `${((d.averageEvidenceStrength ?? 0) / 10) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-1 text-sm font-medium tracking-wide text-neutral-500 uppercase">
          Unresolved high-risk assumptions
        </h2>
        <p className="mb-4 text-xs text-neutral-500">
          Ranked by risk_priority (importance × evidence gap) -- a prioritisation aid, not an
          objective ranking.
        </p>
        {dashboard.topRiskyAssumptions.length === 0 ? (
          <p className="text-sm text-neutral-500">No scored assumptions yet.</p>
        ) : (
          <ol className="space-y-2">
            {dashboard.topRiskyAssumptions.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <Link
                  href={`/ventures/${id}/assumptions/${a.id}`}
                  className="underline underline-offset-4"
                >
                  {a.statement}
                </Link>
                <span className="ml-2 shrink-0 text-neutral-500">{a.riskPriority.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-medium tracking-wide text-neutral-500 uppercase">
          Experiment backlog
        </h2>
        <div className="grid grid-cols-4 gap-3 text-center text-sm">
          <div>
            <p className="text-2xl font-semibold">{dashboard.testCardCounts.draft}</p>
            <p className="text-neutral-500">Draft</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{dashboard.testCardCounts.ready}</p>
            <p className="text-neutral-500">Ready</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{dashboard.testCardCounts.running}</p>
            <p className="text-neutral-500">Running</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{dashboard.testCardCounts.complete}</p>
            <p className="text-neutral-500">Complete</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-neutral-500">
          {dashboard.decisionCount} decision(s) recorded.
        </p>
      </section>
    </main>
  );
}
