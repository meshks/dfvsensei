import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <p className="text-sm font-medium tracking-wide text-neutral-500 uppercase">DFV Sensei</p>
      <h1 className="text-3xl font-semibold text-balance">
        Turn business ideas into evidence-based commercialisation decisions.
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Idea → Assumption → Experiment → Evidence → Learning → Decision.
      </p>
      <Link
        href="/ventures"
        className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Go to ventures
      </Link>
    </main>
  );
}
