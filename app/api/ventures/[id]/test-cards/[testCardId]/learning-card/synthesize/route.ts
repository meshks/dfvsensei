import { NextResponse } from "next/server";
import { synthesizeLearningCard } from "@/application/learning-cards/synthesize-learning-card";
import { getAiProvider } from "@/infrastructure/ai";
import { PostgresEvidenceRepository } from "@/infrastructure/supabase/evidence-repository";
import { PostgresTestCardRepository } from "@/infrastructure/supabase/test-card-repository";

export const dynamic = "force-dynamic";

const testCardRepository = new PostgresTestCardRepository();
const evidenceRepository = new PostgresEvidenceRepository();

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ testCardId: string }> },
) {
  const { testCardId } = await params;
  const testCard = await testCardRepository.findById(testCardId);
  if (!testCard) {
    return NextResponse.json({ error: "Test Card not found" }, { status: 404 });
  }

  const evidence = await evidenceRepository.listByTestCard(testCardId);
  const draft = await synthesizeLearningCard(testCard, evidence, getAiProvider());
  return NextResponse.json({ draft });
}
