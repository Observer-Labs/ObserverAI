import type { GoogleBusinessReview } from "./google-business-profile";
import type { Signal } from "./types";

export const GOOGLE_REVIEWS_DEFAULT_SYNC_WINDOW_DAYS = 150;
export const GOOGLE_REVIEWS_MAX_SYNC_WINDOW_DAYS = 150;
export const GOOGLE_REVIEWS_ACTIONABLE_MAX_RATING = 3;

export type GoogleReviewSignalInput = Omit<Signal, "id" | "created_at" | "branch_id"> & {
  branch_id?: string;
};

export function googleReviewToSignal(input: {
  workspaceId: string;
  branchId: string;
  sourceId: string;
  review: GoogleBusinessReview;
}): GoogleReviewSignalInput {
  const ratingText = typeof input.review.rating === "number" ? `Google rating: ${input.review.rating}` : "Google review";
  const content = input.review.comment
    ? `${ratingText}: ${input.review.comment}`
    : ratingText;
  const timestamp = input.review.update_time ?? input.review.reviewed_at;

  return {
    workspace_id: input.workspaceId,
    branch_id: input.branchId,
    source_id: input.sourceId,
    source: "googlereviews",
    source_type: "googlereviews",
    channel: "review",
    sender: input.review.reviewer_name,
    content,
    timestamp,
    sentiment: sentimentFromRating(input.review.rating),
    reviewed: false,
    tags: [
      `google_review:${input.review.external_review_id}`,
      ...(typeof input.review.rating === "number" ? [`google_rating:${input.review.rating}`] : []),
    ],
  };
}

export function googleReviewDedupeKey(
  signal: Pick<GoogleReviewSignalInput, "timestamp" | "sender" | "content" | "source_id">,
) {
  return [
    signal.source_id ?? "",
    signal.timestamp,
    signal.sender ?? "",
    signal.content,
  ].join("\u001f");
}

export function normalizeGoogleReviewsSyncWindowDays(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return GOOGLE_REVIEWS_DEFAULT_SYNC_WINDOW_DAYS;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return GOOGLE_REVIEWS_DEFAULT_SYNC_WINDOW_DAYS;
  return Math.min(Math.max(Math.round(parsed), 1), GOOGLE_REVIEWS_MAX_SYNC_WINDOW_DAYS);
}

export function isGoogleReviewActionable(review: Pick<GoogleBusinessReview, "rating">) {
  return typeof review.rating === "number" && review.rating <= GOOGLE_REVIEWS_ACTIONABLE_MAX_RATING;
}

function sentimentFromRating(rating: number | null): "positive" | "negative" | "neutral" {
  if (rating === null) return "neutral";
  if (rating <= GOOGLE_REVIEWS_ACTIONABLE_MAX_RATING) return "negative";
  if (rating >= 4) return "positive";
  return "neutral";
}
