import type { GoogleBusinessReview } from "./google-business-profile";
import type { Signal } from "./types";

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
  const content = input.review.comment || ratingText;
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

function sentimentFromRating(rating: number | null): "positive" | "negative" | "neutral" {
  if (rating === null) return "neutral";
  if (rating <= 3) return "negative";
  if (rating >= 4) return "positive";
  return "neutral";
}
