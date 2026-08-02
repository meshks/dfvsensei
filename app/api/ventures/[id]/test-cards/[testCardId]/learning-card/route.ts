import { NextResponse } from "next/server";
import {
  createLearningCard,
  createLearningCardRequestSchema,
} from "@/application/learning-cards/create-learning-card";
import { PostgresLearningCardRepository } from "@/infrastructure/supabase/learning-card-repository";
import { DEV_USER_ID } from "@/lib/dev-user";

export const dynamic = "force-dynamic";

const repository = new PostgresLearningCardRepository();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ testCardId: string }> },
) {
  const { testCardId } = await params;
  const learningCard = await repository.findByTestCard(testCardId);
  return NextResponse.json({ learningCard });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ testCardId: string }> },
) {
  const { testCardId } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = createLearningCardRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const learningCard = await createLearningCard(testCardId, parsed.data, DEV_USER_ID, repository);
  return NextResponse.json({ learningCard }, { status: 201 });
}
