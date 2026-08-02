import { NextResponse } from "next/server";
import {
  captureIdea,
  captureIdeaRequestSchema,
  editIdeaSummary,
  editIdeaSummaryRequestSchema,
} from "@/application/ideas/capture-idea";
import { getCurrentIdea } from "@/application/ideas/get-current-idea";
import { getAiProvider } from "@/infrastructure/ai";
import { PostgresIdeaInputRepository } from "@/infrastructure/supabase/idea-inputs-repository";
import { DEV_USER_ID } from "@/lib/dev-user";

export const dynamic = "force-dynamic";

const repository = new PostgresIdeaInputRepository();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ideaInput = await getCurrentIdea(id, repository);
  return NextResponse.json({ ideaInput });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = captureIdeaRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await captureIdea(parsed.data, id, DEV_USER_ID, getAiProvider(), repository);
  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = editIdeaSummaryRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const current = await getCurrentIdea(id, repository);
  if (!current) {
    return NextResponse.json({ error: "No idea input to edit yet" }, { status: 404 });
  }

  const ideaInput = await editIdeaSummary(parsed.data, current, DEV_USER_ID, repository);
  return NextResponse.json({ ideaInput });
}
