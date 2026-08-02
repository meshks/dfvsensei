import { NextResponse } from "next/server";
import {
  NoLearningCardError,
  recordDecision,
  recordDecisionRequestSchema,
} from "@/application/decisions/record-decision";
import { PostgresDecisionRepository } from "@/infrastructure/supabase/decision-repository";
import { PostgresLearningCardRepository } from "@/infrastructure/supabase/learning-card-repository";
import { PostgresTestCardRepository } from "@/infrastructure/supabase/test-card-repository";
import { DEV_USER_ID } from "@/lib/dev-user";

export const dynamic = "force-dynamic";

const decisionRepository = new PostgresDecisionRepository();
const learningCardRepository = new PostgresLearningCardRepository();
const testCardRepository = new PostgresTestCardRepository();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; testCardId: string }> },
) {
  const { id, testCardId } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = recordDecisionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const testCard = await testCardRepository.findById(testCardId);
  if (!testCard) {
    return NextResponse.json({ error: "Test Card not found" }, { status: 404 });
  }

  const learningCard = await learningCardRepository.findByTestCard(testCardId);

  try {
    const decision = await recordDecision(
      id,
      testCard.assumptionId,
      learningCard,
      parsed.data,
      DEV_USER_ID,
      decisionRepository,
    );
    return NextResponse.json({ decision }, { status: 201 });
  } catch (err) {
    if (err instanceof NoLearningCardError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
