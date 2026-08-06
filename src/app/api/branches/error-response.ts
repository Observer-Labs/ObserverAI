import { NextResponse } from "next/server";
import {
  BranchConflictError,
  BranchLimitError,
  BranchNotFoundError,
  BranchValidationError,
} from "@/lib/branches";

export function branchErrorResponse(error: unknown) {
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

  if (
    error instanceof BranchValidationError ||
    error instanceof BranchConflictError ||
    error instanceof BranchNotFoundError
  ) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unexpected branch error";
  return NextResponse.json({ error: message }, { status: 500 });
}
