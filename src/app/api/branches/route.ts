export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import {
  BranchConflictError,
  BranchLimitError,
  BranchValidationError,
  createBranch,
  listBranches,
} from "@/lib/branches";

function branchErrorResponse(error: unknown) {
  if (error instanceof BranchLimitError) {
    return NextResponse.json(
      {
        error: error.message,
        code: "branch_limit_reached",
        branchLimit: error.branchLimit,
        activeBranchCount: error.activeBranchCount,
      },
      { status: error.status },
    );
  }

  if (error instanceof BranchValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof BranchConflictError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unexpected branch error";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET() {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const branches = await listBranches(workspaceId);
    return NextResponse.json({ branches });
  } catch (error) {
    return branchErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const branch = await createBranch(workspaceId, await req.json());
    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    return branchErrorResponse(error);
  }
}
