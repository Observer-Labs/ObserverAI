export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { createSourceRecord, SourceNotFoundError, SourceValidationError } from "@/lib/source-records";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const branchId = req.nextUrl.searchParams.get("branch_id")?.trim();
  let query = getSupabaseAdmin()
    .from("sources")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data ?? [] });
}

export async function POST(req: NextRequest) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const source = await createSourceRecord(workspaceId, await req.json().catch(() => ({})));
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof SourceValidationError || error instanceof SourceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Source creation failed" },
      { status: 500 },
    );
  }
}
