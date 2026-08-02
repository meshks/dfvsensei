import { NextResponse } from "next/server";
import { createVenture, createVentureRequestSchema } from "@/application/ventures/create-venture";
import { listVentures } from "@/application/ventures/list-ventures";
import { PostgresVentureRepository } from "@/infrastructure/supabase/ventures-repository";
import { DEV_USER_ID } from "@/lib/dev-user";

// Reads/writes Postgres; never prerender or cache this route.
export const dynamic = "force-dynamic";

const repository = new PostgresVentureRepository();

export async function GET() {
  const ventures = await listVentures(DEV_USER_ID, repository);
  return NextResponse.json({ ventures });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createVentureRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const venture = await createVenture(parsed.data, DEV_USER_ID, repository);
  return NextResponse.json({ venture }, { status: 201 });
}
