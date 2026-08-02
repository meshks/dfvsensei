import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentIdea } from "@/application/ideas/get-current-idea";
import { PostgresDecisionRepository } from "@/infrastructure/supabase/decision-repository";
import { PostgresIdeaInputRepository } from "@/infrastructure/supabase/idea-inputs-repository";
import { PostgresVentureRepository } from "@/infrastructure/supabase/ventures-repository";

export const dynamic = "force-dynamic";

const DECISION_LABEL: Record<string, string> = {
  proceed: "Proceed",
  pivot: "Pivot",
  repeat: "Repeat",
  refine: "Refine",
  pause: "Pause",
  stop: "Stop",
  escalate: "Escalate",
};

const NAV_ITEMS = [
  { href: "idea", label: "Idea" },
  { href: "assumptions", label: "Assumptions" },
  { href: "map", label: "Risk map" },
  { href: "dashboard", label: "Dashboard" },
  { href: "export", label: "Export" },
];

export default async function VentureHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ventureRepository = new PostgresVentureRepository();
  const venture = await ventureRepository.findById(id);
  if (!venture) notFound();

  const ideaInput = await getCurrentIdea(id, new PostgresIdeaInputRepository());
  const summary = ideaInput?.userEditedSummary ?? ideaInput?.aiGeneratedSummary ?? null;
  const decisions = await new PostgresDecisionRepository().listByVenture(id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/ventures" className="text-sm text-neutral-500 hover:underline">
        ← All ventures
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-semibold">{venture.name}</h1>
      <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
        {venture.entryPath === "market_led" ? "Market-led" : "IP-led"} · stage: {venture.stage}
      </p>

      <nav className="mb-8 flex flex-wrap gap-2 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={`/ventures/${id}/${item.href}`}
            className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="mb-2 text-sm font-medium tracking-wide text-neutral-500 uppercase">Idea</h2>
        {summary ? (
          <p>{summary}</p>
        ) : (
          <div>
            <p className="text-neutral-600 dark:text-neutral-400">
              No idea captured yet. Use the guided template to describe who you&rsquo;re helping and
              why.
            </p>
            <Link
              href={`/ventures/${id}/idea`}
              className="mt-3 inline-block text-sm font-medium underline underline-offset-4"
            >
              Capture the idea
            </Link>
          </div>
        )}
      </section>

      {decisions.length > 0 && (
        <section className="mt-6 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="mb-3 text-sm font-medium tracking-wide text-neutral-500 uppercase">
            Decision history
          </h2>
          <ul className="space-y-3">
            {decisions.map((decision) => (
              <li key={decision.id} className="text-sm">
                <span className="font-medium">
                  {DECISION_LABEL[decision.decisionType] ?? decision.decisionType}
                </span>{" "}
                <span className="text-neutral-500">
                  {new Date(decision.decidedAt).toLocaleDateString()}
                </span>
                {decision.whatChanges && (
                  <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">
                    {decision.whatChanges}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
