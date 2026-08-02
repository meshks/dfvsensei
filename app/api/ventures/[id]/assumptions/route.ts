import { NextResponse } from "next/server";
import { extractAssumptions } from "@/application/assumptions/extract-assumptions";
import { listAssumptions } from "@/application/assumptions/list-assumptions";
import { getCurrentIdea } from "@/application/ideas/get-current-idea";
import { getAiProvider } from "@/infrastructure/ai";
import { PostgresAssumptionRepository } from "@/infrastructure/supabase/assumptions-repository";
import { PostgresIdeaInputRepository } from "@/infrastructure/supabase/idea-inputs-repository";
import { PostgresVentureRepository } from "@/infrastructure/supabase/ventures-repository";
import { DEV_USER_ID } from "@/lib/dev-user";

export const dynamic = "force-dynamic";

const assumptionRepository = new PostgresAssumptionRepository();
const ideaRepository = new PostgresIdeaInputRepository();
const ventureRepository = new PostgresVentureRepository();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assumptions = await listAssumptions(id, assumptionRepository);
  return NextResponse.json({ assumptions });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venture = await ventureRepository.findById(id);
  if (!venture) {
    return NextResponse.json({ error: "Venture not found" }, { status: 404 });
  }

  const ideaInput = await getCurrentIdea(id, ideaRepository);
  const result = await extractAssumptions(
    id,
    venture.entryPath,
    ideaInput,
    DEV_USER_ID,
    getAiProvider(),
    assumptionRepository,
  );
  return NextResponse.json(result, { status: 201 });
}
