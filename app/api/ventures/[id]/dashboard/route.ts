import { NextResponse } from "next/server";
import { listAssumptions } from "@/application/assumptions/list-assumptions";
import { buildDashboard } from "@/application/dashboard/get-dashboard";
import { PostgresAssumptionRepository } from "@/infrastructure/supabase/assumptions-repository";
import { PostgresDecisionRepository } from "@/infrastructure/supabase/decision-repository";
import { PostgresTestCardRepository } from "@/infrastructure/supabase/test-card-repository";

export const dynamic = "force-dynamic";

const assumptionRepository = new PostgresAssumptionRepository();
const testCardRepository = new PostgresTestCardRepository();
const decisionRepository = new PostgresDecisionRepository();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [assumptions, testCards, decisions] = await Promise.all([
    listAssumptions(id, assumptionRepository),
    testCardRepository.listByVenture(id),
    decisionRepository.listByVenture(id),
  ]);

  const dashboard = buildDashboard(assumptions, testCards, decisions);
  return NextResponse.json({ dashboard });
}
