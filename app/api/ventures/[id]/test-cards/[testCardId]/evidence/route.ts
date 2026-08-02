import { NextResponse } from "next/server";
import {
  recordEvidence,
  recordEvidenceRequestSchema,
} from "@/application/evidence/record-evidence";
import { PostgresEvidenceRepository } from "@/infrastructure/supabase/evidence-repository";
import { DEV_USER_ID } from "@/lib/dev-user";

export const dynamic = "force-dynamic";

const repository = new PostgresEvidenceRepository();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ testCardId: string }> },
) {
  const { testCardId } = await params;
  const evidenceItems = await repository.listByTestCard(testCardId);
  return NextResponse.json({ evidenceItems });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ testCardId: string }> },
) {
  const { testCardId } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = recordEvidenceRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const evidenceItem = await recordEvidence(testCardId, parsed.data, DEV_USER_ID, repository);
  return NextResponse.json({ evidenceItem }, { status: 201 });
}
