import { describe, expect, it } from "vitest";
import { googleReviewDedupeKey, googleReviewToSignal } from "./google-reviews-ingest";

describe("google reviews ingest helpers", () => {
  it("maps Google reviews to branch-scoped signals", () => {
    expect(googleReviewToSignal({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      review: {
        external_review_id: "review-1",
        reviewer_name: "Aylin",
        comment: "Servis cok yavas.",
        rating: 1,
        reviewed_at: "2026-06-20T09:00:00.000Z",
        update_time: "2026-06-20T09:30:00.000Z",
      },
    })).toEqual({
      workspace_id: "workspace-1",
      branch_id: "branch-1",
      source_id: "source-1",
      source: "googlereviews",
      source_type: "googlereviews",
      channel: "review",
      sender: "Aylin",
      content: "Servis cok yavas.",
      timestamp: "2026-06-20T09:30:00.000Z",
      sentiment: "negative",
      reviewed: false,
    });
  });

  it("dedupes by source, timestamp, sender, and content", () => {
    expect(googleReviewDedupeKey({
      source_id: "source-1",
      timestamp: "2026-06-20T09:30:00.000Z",
      sender: "Aylin",
      content: "Servis cok yavas.",
    })).toBe("source-1\u001f2026-06-20T09:30:00.000Z\u001fAylin\u001fServis cok yavas.");
  });
});
