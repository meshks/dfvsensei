import Link from "next/link";
import { listVentures } from "@/application/ventures/list-ventures";
import { PostgresVentureRepository } from "@/infrastructure/supabase/ventures-repository";
import { DEV_USER_ID } from "@/lib/dev-user";
import { cn } from "@/lib/cn";

// Reads from Postgres per request; must never be prerendered at build time
// (build environments may not have a live DATABASE_URL -- see lib/env.ts).
export const dynamic = "force-dynamic";

const ENTRY_PATH_LABEL: Record<string, string> = {
  market_led: "Market-led",
  ip_led: "IP-led",
};

export default async function VenturesPage() {
  const repository = new PostgresVentureRepository();
  const ventures = await listVentures(DEV_USER_ID, repository);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ventures</h1>
        <Link
          href="/ventures/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          New venture
        </Link>
      </div>

      {ventures.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <p className="text-neutral-600 dark:text-neutral-400">
            No ventures yet. Create one to start extracting assumptions.
          </p>
          <Link
            href="/ventures/new"
            className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
          >
            Create your first venture
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {ventures.map((venture) => (
            <li key={venture.id} className="py-4">
              <p className="font-medium">{venture.name}</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {venture.shortDescription || "No description yet."}
              </p>
              <span
                className={cn(
                  "mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                  "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
                )}
              >
                {ENTRY_PATH_LABEL[venture.entryPath] ?? venture.entryPath}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
