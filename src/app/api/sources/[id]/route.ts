export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { deleteSourceRecord, SourceNotFoundError, SourceValidationError } from "@/lib/source-records";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await deleteSourceRecord(workspaceId, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof SourceValidationError || error instanceof SourceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Source deletion failed" },
      { status: 500 },
    );
  }
}
