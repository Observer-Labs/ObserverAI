export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { createBranch, listBranches } from "@/lib/branches";
import { branchErrorResponse } from "./error-response";

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
