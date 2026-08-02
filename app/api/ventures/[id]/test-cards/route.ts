import { NextResponse } from "next/server";
import {
  createTestCard,
  createTestCardRequestSchema,
} from "@/application/test-cards/create-test-card";
import { getAiProvider } from "@/infrastructure/ai";
import { PostgresAssumptionRepository } from "@/infrastructure/supabase/assumptions-repository";
import { PostgresExperimentInstanceRepository } from "@/infrastructure/supabase/experiment-instance-repository";
import { PostgresExperimentLibraryRepository } from "@/infrastructure/supabase/experiment-library-repository";
import { PostgresTestCardRepository } from "@/infrastructure/supabase/test-card-repository";
import { DEV_USER_ID } from "@/lib/dev-user";

export const dynamic = "force-dynamic";

const assumptionRepository = new PostgresAssumptionRepository();
const libraryRepository = new PostgresExperimentLibraryRepository();
const experimentInstanceRepository = new PostgresExperimentInstanceRepository();
const testCardRepository = new PostgresTestCardRepository();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const testCards = await testCardRepository.listByVenture(id);
  return NextResponse.json({ testCards });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = createTestCardRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const [assumption, library] = await Promise.all([
    assumptionRepository.findById(parsed.data.assumptionId),
    libraryRepository.findById(parsed.data.libraryId),
  ]);

  if (!assumption || !library) {
    return NextResponse.json({ error: "Assumption or experiment not found" }, { status: 404 });
  }

  const experimentInstance = await experimentInstanceRepository.create(
    id,
    library.id,
    assumption.id,
  );

  const result = await createTestCard(
    parsed.data,
    assumption,
    library,
    id,
    experimentInstance.id,
    DEV_USER_ID,
    getAiProvider(),
    testCardRepository,
  );
  return NextResponse.json(result, { status: 201 });
}
