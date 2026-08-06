export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { pauseBranch, updateBranch } from "@/lib/branches";
import { branchErrorResponse } from "../error-response";

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
