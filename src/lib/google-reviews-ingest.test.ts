import { describe, expect, it } from "vitest";
import {
  GOOGLE_REVIEWS_MAX_SYNC_WINDOW_DAYS,
  googleReviewDedupeKey,
  googleReviewToSignal,
  isGoogleReviewActionable,
  normalizeGoogleReviewsSyncWindowDays,
} from "./google-reviews-ingest";

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
      content: "Google rating: 1: Servis cok yavas.",
      timestamp: "2026-06-20T09:30:00.000Z",
      sentiment: "negative",
      reviewed: false,
      tags: ["google_review:review-1", "google_rating:1"],
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

  it("caps the Google review history window at 150 days", () => {
    expect(normalizeGoogleReviewsSyncWindowDays(undefined)).toBe(150);
    expect(normalizeGoogleReviewsSyncWindowDays("120")).toBe(120);
    expect(normalizeGoogleReviewsSyncWindowDays("999")).toBe(GOOGLE_REVIEWS_MAX_SYNC_WINDOW_DAYS);
    expect(normalizeGoogleReviewsSyncWindowDays("-5")).toBe(1);
  });

  it("treats 3-star and lower Google reviews as actionable", () => {
    expect(isGoogleReviewActionable({ rating: 3 })).toBe(true);
    expect(isGoogleReviewActionable({ rating: 4 })).toBe(false);
    expect(isGoogleReviewActionable({ rating: null })).toBe(false);
  });
});
