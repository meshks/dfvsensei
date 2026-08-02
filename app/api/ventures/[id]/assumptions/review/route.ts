import { NextResponse } from "next/server";
import { listAssumptions } from "@/application/assumptions/list-assumptions";
import { reviewAssumptionQuality } from "@/application/assumptions/review-assumption-quality";
import { getAiProvider } from "@/infrastructure/ai";
import { PostgresAssumptionRepository } from "@/infrastructure/supabase/assumptions-repository";

export const dynamic = "force-dynamic";

const repository = new PostgresAssumptionRepository();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assumptions = await listAssumptions(id, repository);
  const reviews = await reviewAssumptionQuality(assumptions, getAiProvider());
  return NextResponse.json({ reviews });
}
