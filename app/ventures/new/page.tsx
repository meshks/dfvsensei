"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type EntryPath = "market_led" | "ip_led";

export default function NewVenturePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [entryPath, setEntryPath] = useState<EntryPath>("market_led");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/ventures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, shortDescription, entryPath }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Something went wrong creating the venture.");
      setSubmitting(false);
      return;
    }

    router.push("/ventures");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">New venture</h1>
      <p className="mb-8 text-sm text-neutral-600 dark:text-neutral-400">
        Choose an entry path and give your venture a name. You can change the entry path and expand
        the idea later without losing data.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Entry path</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <EntryPathOption
              value="market_led"
              selected={entryPath === "market_led"}
              onSelect={setEntryPath}
              title="Market-led"
              description="Start from an unmet customer problem."
            />
            <EntryPathOption
              value="ip_led"
              selected={entryPath === "ip_led"}
              onSelect={setEntryPath}
              title="IP-led"
              description="Start from existing technology or research."
            />
          </div>
        </fieldset>

        <div>
          <label htmlFor="venture-name" className="mb-1 block text-sm font-medium">
            Venture name
          </label>
          <input
            id="venture-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            placeholder="e.g. Glass Cleanliness Inspector"
          />
        </div>

        <div>
          <label htmlFor="venture-description" className="mb-1 block text-sm font-medium">
            Short description
          </label>
          <textarea
            id="venture-description"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            placeholder="One or two sentences -- you'll expand this with the guided idea template next."
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || name.trim().length === 0}
          className={cn(
            "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900",
            "hover:bg-neutral-700 dark:hover:bg-neutral-200",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {submitting ? "Creating…" : "Create venture"}
        </button>
      </form>
    </main>
  );
}

function EntryPathOption({
  value,
  selected,
  onSelect,
  title,
  description,
}: {
  value: EntryPath;
  selected: boolean;
  onSelect: (value: EntryPath) => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(value)}
      className={cn(
        "rounded-md border px-4 py-3 text-left text-sm transition-colors",
        selected
          ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900"
          : "border-neutral-300 dark:border-neutral-700",
      )}
    >
      <span className="block font-medium">{title}</span>
      <span className="mt-1 block text-neutral-600 dark:text-neutral-400">{description}</span>
    </button>
  );
}
