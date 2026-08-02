"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function NewTestCardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const assumptionId = searchParams.get("assumptionId");
  const libraryId = searchParams.get("libraryId");
  const decisionQuestion = searchParams.get("decisionQuestion") ?? undefined;
  const missingParams = !assumptionId || !libraryId;

  useEffect(() => {
    if (missingParams) return;

    fetch(`/api/ventures/${id}/test-cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assumptionId, libraryId, decisionQuestion }),
    })
      .then(async (response) => {
        if (!response.ok) {
          setError("Something went wrong creating the Test Card.");
          return;
        }
        const data = (await response.json()) as { testCard: { id: string } };
        router.replace(`/ventures/${id}/test-cards/${data.testCard.id}`);
      })
      .catch(() => setError("Something went wrong creating the Test Card."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, missingParams]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm text-neutral-500">
      {missingParams
        ? "Missing assumption or experiment reference."
        : (error ?? "Drafting the Test Card…")}
    </main>
  );
}
