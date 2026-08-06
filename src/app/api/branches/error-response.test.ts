import { describe, expect, it } from "vitest";
import { branchErrorResponse } from "./error-response";
import {
  BranchConflictError,
  BranchLimitError,
  BranchNotFoundError,
  BranchValidationError,
} from "@/lib/branches";

describe("branchErrorResponse", () => {
  it("maps BranchLimitError to 402 with the upgrade code the UI expects", async () => {
    const res = branchErrorResponse(new BranchLimitError("limit", 1, 1));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("branch_limit_reached");
    expect(body.branchLimit).toBe(1);
    expect(body.activeBranchCount).toBe(1);
  });

  it("maps validation, conflict and not-found errors to their status", async () => {
    expect(branchErrorResponse(new BranchValidationError("bad")).status).toBe(400);
    expect(branchErrorResponse(new BranchConflictError("dup")).status).toBe(409);
    expect(branchErrorResponse(new BranchNotFoundError("gone")).status).toBe(404);
  });

  it("falls back to 500 for unknown errors", () => {
    expect(branchErrorResponse(new Error("boom")).status).toBe(500);
  });
});
