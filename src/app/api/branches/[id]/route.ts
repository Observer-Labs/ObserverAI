export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import {
  BranchConflictError,
  BranchNotFoundError,
  BranchValidationError,
  pauseBranch,
  updateBranch,
} from "@/lib/branches";

function branchErrorResponse(error: unknown) {
  if (
    error instanceof BranchConflictError ||
    error instanceof BranchNotFoundError ||
    error instanceof BranchValidationError
  ) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unexpected branch error";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function PATCH(
  req: NextRequest,
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
    const branch = await updateBranch(workspaceId, id, await req.json());
    return NextResponse.json({ branch });
  } catch (error) {
    return branchErrorResponse(error);
  }
}

export async function DELETE(
  _req: NextRequest,
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
    const branch = await pauseBranch(workspaceId, id);
    return NextResponse.json({ branch });
  } catch (error) {
    return branchErrorResponse(error);
  }
}
