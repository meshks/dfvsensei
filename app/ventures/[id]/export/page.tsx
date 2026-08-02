import Link from "next/link";
import { notFound } from "next/navigation";
import { exportVenture } from "@/application/export/export-venture";
import { PostgresAssumptionMapRepository } from "@/infrastructure/supabase/assumption-map-repository";
import { PostgresAssumptionRepository } from "@/infrastructure/supabase/assumptions-repository";
import { PostgresDecisionRepository } from "@/infrastructure/supabase/decision-repository";
import { PostgresEvidenceRepository } from "@/infrastructure/supabase/evidence-repository";
import { PostgresIdeaInputRepository } from "@/infrastructure/supabase/idea-inputs-repository";
import { PostgresLearningCardRepository } from "@/infrastructure/supabase/learning-card-repository";
import { PostgresTestCardRepository } from "@/infrastructure/supabase/test-card-repository";
import { PostgresVentureRepository } from "@/infrastructure/supabase/ventures-repository";

export const dynamic = "force-dynamic";

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const data = await exportVenture(id, {
    venture: new PostgresVentureRepository(),
    idea: new PostgresIdeaInputRepository(),
    assumptions: new PostgresAssumptionRepository(),
    map: new PostgresAssumptionMapRepository(),
    testCards: new PostgresTestCardRepository(),
    evidence: new PostgresEvidenceRepository(),
    learningCards: new PostgresLearningCardRepository(),
    decisions: new PostgresDecisionRepository(),
  });
  if (!data) notFound();

  const evidenceCount = data.testCards.reduce((sum, tc) => sum + tc.evidenceItems.length, 0);
  const learningCardCount = data.testCards.filter((tc) => tc.learningCard !== null).length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/ventures/${id}`} className="text-sm text-neutral-500 hover:underline">
        ← Venture
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Export</h1>

      <div className="mb-6 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">
          Exports the full venture graph: idea, assumptions, map snapshot, Test Cards, evidence,
          Learning Cards, and decisions.
        </p>
        <ul className="space-y-1 text-sm">
          <li>Idea captured: {data.ideaInput ? "yes" : "no"}</li>
          <li>Assumptions: {data.assumptions.length}</li>
          <li>Map snapshot saved: {data.mapSnapshot ? "yes" : "no"}</li>
          <li>Test Cards: {data.testCards.length}</li>
          <li>Evidence items: {evidenceCount}</li>
          <li>Learning Cards: {learningCardCount}</li>
          <li>Decisions: {data.decisions.length}</li>
        </ul>
      </div>

      <a
        href={`/api/ventures/${id}/export`}
        download={`venture-${id}.json`}
        className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Download JSON
      </a>
    </main>
  );
}
