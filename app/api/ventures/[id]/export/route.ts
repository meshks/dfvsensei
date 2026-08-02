import { NextResponse } from "next/server";
import { exportVenture } from "@/application/export/export-venture";
import { PostgresAssumptionMapRepository } from "@/infrastructure/supabase/assumption-map-repository";
import { PostgresAssumptionRepository } from "@/infrastructure/supabase/assumptions-repository";
import { PostgresDecisionRepository } from "@/infrastructure/supabase/decision-repository";
import { PostgresEvidenceRepository } from "@/infrastructure/supabase/evidence-repository";
import { PostgresIdeaInputRepository } from "@/infrastructure/supabase/idea-inputs-repository";
import { PostgresLearningCardRepository } from "@/infrastructure/supabase/learning-card-repository";
import { PostgresTestCardRepository } from "@/infrastructure/supabase/test-card-repository";
import { PostgresVentureRepository } from "@/infrastructure/supabase/ventures-repository";

export const dynamic = "force-dynamic";

const repositories = {
  venture: new PostgresVentureRepository(),
  idea: new PostgresIdeaInputRepository(),
  assumptions: new PostgresAssumptionRepository(),
  map: new PostgresAssumptionMapRepository(),
  testCards: new PostgresTestCardRepository(),
  evidence: new PostgresEvidenceRepository(),
  learningCards: new PostgresLearningCardRepository(),
  decisions: new PostgresDecisionRepository(),
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await exportVenture(id, repositories);

  if (!data) {
    return NextResponse.json({ error: "Venture not found" }, { status: 404 });
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="venture-${id}.json"`,
    },
  });
}
