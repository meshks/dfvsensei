import { NextResponse } from "next/server";
import { getRecommendations } from "@/application/experiments/get-recommendations";
import { recommendExperiments } from "@/application/experiments/recommend-experiments";
import { getAiProvider } from "@/infrastructure/ai";
import { PostgresAssumptionRepository } from "@/infrastructure/supabase/assumptions-repository";
import { PostgresExperimentLibraryRepository } from "@/infrastructure/supabase/experiment-library-repository";
import { PostgresExperimentRecommendationRepository } from "@/infrastructure/supabase/experiment-recommendation-repository";
import { PostgresVentureRepository } from "@/infrastructure/supabase/ventures-repository";

export const dynamic = "force-dynamic";

const assumptionRepository = new PostgresAssumptionRepository();
const ventureRepository = new PostgresVentureRepository();
const libraryRepository = new PostgresExperimentLibraryRepository();
const recommendationRepository = new PostgresExperimentRecommendationRepository();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assumptionId: string }> },
) {
  const { assumptionId } = await params;
  const recommendations = await getRecommendations(
    assumptionId,
    recommendationRepository,
    libraryRepository,
  );
  return NextResponse.json({ recommendations });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; assumptionId: string }> },
) {
  const { id, assumptionId } = await params;
  const [venture, assumption] = await Promise.all([
    ventureRepository.findById(id),
    assumptionRepository.findById(assumptionId),
  ]);

  if (!venture || !assumption) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const recommendations = await recommendExperiments(
    assumption,
    venture.stage,
    getAiProvider(),
    libraryRepository,
    recommendationRepository,
  );
  return NextResponse.json({ recommendations });
}
