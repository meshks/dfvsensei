import { NextResponse } from "next/server";
import { listAssumptions } from "@/application/assumptions/list-assumptions";
import { getCurrentMapSnapshot } from "@/application/map/get-current-map-snapshot";
import { saveMapSnapshot, saveMapSnapshotRequestSchema } from "@/application/map/save-map-snapshot";
import { PostgresAssumptionMapRepository } from "@/infrastructure/supabase/assumption-map-repository";
import { PostgresAssumptionRepository } from "@/infrastructure/supabase/assumptions-repository";
import { DEV_USER_ID } from "@/lib/dev-user";

export const dynamic = "force-dynamic";

const mapRepository = new PostgresAssumptionMapRepository();
const assumptionRepository = new PostgresAssumptionRepository();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [assumptions, snapshot] = await Promise.all([
    listAssumptions(id, assumptionRepository),
    getCurrentMapSnapshot(id, mapRepository),
  ]);

  const positionByAssumption = new Map((snapshot?.positions ?? []).map((p) => [p.assumptionId, p]));

  const items = assumptions.map((assumption) => {
    const saved = positionByAssumption.get(assumption.id);
    return {
      id: assumption.id,
      statement: assumption.statement,
      dfvPrimary: assumption.dfvPrimary,
      importance: saved?.importance ?? assumption.importanceScore ?? 5,
      evidenceStrength: saved?.evidenceStrength ?? assumption.evidenceStrengthScore ?? 5,
    };
  });

  return NextResponse.json({ items, hasSavedSnapshot: snapshot !== null });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = saveMapSnapshotRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const snapshot = await saveMapSnapshot(id, parsed.data, DEV_USER_ID, mapRepository);

  // Keep the assumption's own score fields in sync so other screens (list,
  // recommendations) reflect the latest placement without a second write path.
  await Promise.all(
    parsed.data.positions.map((position) =>
      assumptionRepository.update(
        position.assumptionId,
        { importanceScore: position.importance, evidenceStrengthScore: position.evidenceStrength },
        DEV_USER_ID,
      ),
    ),
  );

  return NextResponse.json({ snapshot });
}
