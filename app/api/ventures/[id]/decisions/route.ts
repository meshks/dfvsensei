import { NextResponse } from "next/server";
import { PostgresDecisionRepository } from "@/infrastructure/supabase/decision-repository";

export const dynamic = "force-dynamic";

const repository = new PostgresDecisionRepository();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decisions = await repository.listByVenture(id);
  return NextResponse.json({ decisions });
}
