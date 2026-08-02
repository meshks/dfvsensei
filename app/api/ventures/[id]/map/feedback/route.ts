import { NextResponse } from "next/server";
import { listAssumptions } from "@/application/assumptions/list-assumptions";
import { getCurrentMapSnapshot } from "@/application/map/get-current-map-snapshot";
import { getMapFeedback } from "@/application/map/get-map-feedback";
import { getAiProvider } from "@/infrastructure/ai";
import { PostgresAssumptionMapRepository } from "@/infrastructure/supabase/assumption-map-repository";
import { PostgresAssumptionRepository } from "@/infrastructure/supabase/assumptions-repository";

export const dynamic = "force-dynamic";

const mapRepository = new PostgresAssumptionMapRepository();
const assumptionRepository = new PostgresAssumptionRepository();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [assumptions, snapshot] = await Promise.all([
    listAssumptions(id, assumptionRepository),
    getCurrentMapSnapshot(id, mapRepository),
  ]);

  const positions =
    snapshot?.positions ??
    assumptions.map((a) => ({
      assumptionId: a.id,
      importance: a.importanceScore ?? 5,
      evidenceStrength: a.evidenceStrengthScore ?? 5,
    }));

  const feedback = await getMapFeedback(assumptions, positions, getAiProvider());
  return NextResponse.json({ feedback });
}
