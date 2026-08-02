import { NextResponse } from "next/server";
import {
  TestCardThresholdError,
  updateTestCard,
  updateTestCardRequestSchema,
} from "@/application/test-cards/update-test-card";
import { PostgresTestCardRepository } from "@/infrastructure/supabase/test-card-repository";

export const dynamic = "force-dynamic";

const repository = new PostgresTestCardRepository();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ testCardId: string }> },
) {
  const { testCardId } = await params;
  const testCard = await repository.findById(testCardId);
  if (!testCard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ testCard });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ testCardId: string }> },
) {
  const { testCardId } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateTestCardRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const current = await repository.findById(testCardId);
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const testCard = await updateTestCard(testCardId, parsed.data, current, repository);
    return NextResponse.json({ testCard });
  } catch (err) {
    if (err instanceof TestCardThresholdError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
