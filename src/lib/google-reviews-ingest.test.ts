import { describe, expect, it } from "vitest";
import {
  GOOGLE_REVIEWS_MAX_SYNC_WINDOW_DAYS,
  googleReviewDedupeKey,
  googleReviewSummaryCandidateKey,
  googleReviewsSummaryToSignal,
  googleReviewSummarySignalToAnalysisResult,
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
      content: "Servis cok yavas.",
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
    expect(normalizeGoogleReviewsSyncWindowDays(undefined)).toBe(7);
    expect(normalizeGoogleReviewsSyncWindowDays("120")).toBe(120);
    expect(normalizeGoogleReviewsSyncWindowDays("999")).toBe(GOOGLE_REVIEWS_MAX_SYNC_WINDOW_DAYS);
    expect(normalizeGoogleReviewsSyncWindowDays("-5")).toBe(1);
  });

  it("treats 3-star and lower Google reviews as actionable", () => {
    expect(isGoogleReviewActionable({ rating: 3 })).toBe(true);
    expect(isGoogleReviewActionable({ rating: 4 })).toBe(false);
    expect(isGoogleReviewActionable({ rating: null })).toBe(false);
  });

  it("builds a general Google review summary signal", () => {
    const signal = googleReviewsSummaryToSignal({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      reviews: [
        {
          external_review_id: "review-1",
          reviewer_name: "Aylin",
          comment: "Harika hizmet.",
          rating: 5,
          reviewed_at: "2026-02-20T09:00:00.000Z",
        },
        {
          external_review_id: "review-2",
          reviewer_name: "Mert",
          comment: "",
          rating: 4,
          reviewed_at: "2026-02-21T09:00:00.000Z",
        },
      ],
    });

    expect(signal).toMatchObject({
      source: "googlereviews",
      channel: "review_summary",
      sender: "Google Reviews",
      sentiment: "positive",
      tags: ["google_reviews_summary:source-1", "google_reviews_total:2", "google_reviews_average:4.5"],
    });
    expect(signal?.content).toContain("Genel Yorum Özeti");
    expect(signal?.content).toContain("Puan dağılımı: 5 yıldız: 1, 4 yıldız: 1");
    expect(googleReviewSummaryCandidateKey("source-1")).toBe("general_review_summary:source-1");
  });

  it("converts a Google review summary signal to a deterministic analysis result", () => {
    const signal = googleReviewsSummaryToSignal({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      reviews: [{
        external_review_id: "review-1",
        reviewer_name: "Aylin",
        comment: "Harika hizmet.",
        rating: 5,
        reviewed_at: "2026-02-20T09:00:00.000Z",
      }],
    });

    expect(signal && googleReviewSummarySignalToAnalysisResult({
      ...signal,
      id: "signal-1",
      branch_id: "branch-1",
      created_at: "2026-06-26T00:00:00.000Z",
    })).toMatchObject({
      title: "Genel Yorum Özeti",
      severity: 20,
      evidence_count: 1,
      category: "musteri",
      customer_quote: undefined,
      source_breakdown: expect.objectContaining({ googlereviews: 1 }),
    });
  });

  it("carries previous general analysis context into the next summary result", () => {
    const signal = googleReviewsSummaryToSignal({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      reviews: [{
        external_review_id: "review-1",
        reviewer_name: "Aylin",
        comment: "Hizmet iyi.",
        rating: 5,
        reviewed_at: "2026-02-20T09:00:00.000Z",
      }],
    });

    const result = signal && googleReviewSummarySignalToAnalysisResult({
      ...signal,
      id: "signal-1",
      branch_id: "branch-1",
      created_at: "2026-06-26T00:00:00.000Z",
    }, {
      business_case: "Müşteriler özellikle hızlı iletişim ve uzmanlığı vurguluyor.",
      recommended_action: null,
    });

    expect(result?.business_case).toContain("Önceki genel analizle karşılaştırıldığında");
    expect(result?.business_case).not.toContain("Puan dağılımı:");
    expect(result?.recommended_action).toContain("tekrar eden temaları");
  });

  it("localizes the safe general summary fallback without exposing review text", () => {
    const signal = googleReviewsSummaryToSignal({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      reviews: [{
        external_review_id: "review-1",
        reviewer_name: "Aylin",
        comment: "Harika hizmet.",
        rating: 5,
        reviewed_at: "2026-02-20T09:00:00.000Z",
      }],
    });

    const result = signal && googleReviewSummarySignalToAnalysisResult({
      ...signal,
      id: "signal-1",
      branch_id: "branch-1",
      created_at: "2026-06-26T00:00:00.000Z",
    }, null, "en");

    expect(result?.title).toBe("Overall Review Summary");
    expect(result?.business_case).toContain("strong customer satisfaction");
    expect(result?.business_case).not.toContain("Harika hizmet");
    expect(result?.customer_quote).toBeUndefined();
  });
});
