import { NextResponse } from "next/server";
import { deleteAssumption } from "@/application/assumptions/delete-assumption";
import {
  updateAssumption,
  updateAssumptionRequestSchema,
} from "@/application/assumptions/update-assumption";
import { PostgresAssumptionRepository } from "@/infrastructure/supabase/assumptions-repository";
import { DEV_USER_ID } from "@/lib/dev-user";

export const dynamic = "force-dynamic";

const repository = new PostgresAssumptionRepository();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; assumptionId: string }> },
) {
  const { assumptionId } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateAssumptionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await repository.findById(assumptionId);
  if (!existing) {
    return NextResponse.json({ error: "Assumption not found" }, { status: 404 });
  }

  const assumption = await updateAssumption(
    assumptionId,
    parsed.data,
    existing.source === "ai_generated",
    DEV_USER_ID,
    repository,
  );
  return NextResponse.json({ assumption });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; assumptionId: string }> },
) {
  const { assumptionId } = await params;
  await deleteAssumption(assumptionId, repository);
  return NextResponse.json({ ok: true });
}
