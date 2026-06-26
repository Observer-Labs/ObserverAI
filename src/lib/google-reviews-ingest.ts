import type { GoogleBusinessReview } from "./google-business-profile";
import type { AnalysisResult, Signal } from "./types";

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
    tags: [
      `google_review:${input.review.external_review_id}`,
      ...(typeof input.review.rating === "number" ? [`google_rating:${input.review.rating}`] : []),
    ],
  };
}

export function googleReviewsSummaryToSignal(input: {
  workspaceId: string;
  branchId: string;
  sourceId: string;
  reviews: GoogleBusinessReview[];
}): GoogleReviewSignalInput | null {
  if (input.reviews.length === 0) return null;

  const ratedReviews = input.reviews.filter((review) => typeof review.rating === "number");
  const ratingCounts = ratingDistribution(ratedReviews);
  const averageRating = ratedReviews.length > 0
    ? ratedReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / ratedReviews.length
    : null;
  const timestamps = input.reviews
    .map((review) => new Date(review.update_time ?? review.reviewed_at).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const oldest = timestamps[0] ? new Date(timestamps[0]).toISOString().slice(0, 10) : "bilinmiyor";
  const newest = timestamps.at(-1) ? new Date(timestamps.at(-1)!).toISOString().slice(0, 10) : "bilinmiyor";
  const samples = input.reviews
    .filter((review) => review.comment.trim())
    .slice(0, 5)
    .map((review) => `- ${review.rating ?? "?"}/5: ${review.comment.trim()}`);

  const content = [
    "Genel Yorum Özeti",
    `Toplam Google yorumu: ${input.reviews.length}`,
    `Ortalama puan: ${averageRating === null ? "bilinmiyor" : `${averageRating.toFixed(1)}/5`}`,
    `Puan dağılımı: ${formatRatingDistribution(ratingCounts)}`,
    `Tarih aralığı: ${oldest} - ${newest}`,
    samples.length > 0
      ? `Öne çıkan yorum örnekleri:\n${samples.join("\n")}`
      : "Yorum metni yok; yalnızca puan dağılımı mevcut.",
  ].join("\n");

  return {
    workspace_id: input.workspaceId,
    branch_id: input.branchId,
    source_id: input.sourceId,
    source: "googlereviews",
    source_type: "googlereviews",
    channel: "review_summary",
    sender: "Google Reviews",
    content,
    timestamp: timestamps.at(-1) ? new Date(timestamps.at(-1)!).toISOString() : new Date().toISOString(),
    sentiment: averageRating === null ? "neutral" : averageRating >= 4 ? "positive" : averageRating <= 3 ? "negative" : "neutral",
    reviewed: false,
    tags: [
      `google_reviews_summary:${input.sourceId}`,
      `google_reviews_total:${input.reviews.length}`,
      ...(averageRating === null ? [] : [`google_reviews_average:${averageRating.toFixed(1)}`]),
    ],
  };
}

export function googleReviewSummarySignalToAnalysisResult(signal: Signal): AnalysisResult | null {
  if (signal.source !== "googlereviews" || signal.channel !== "review_summary") return null;

  const evidenceCount = numberFromTag(signal.tags, "google_reviews_total") ?? 1;
  const averageRating = numberFromTag(signal.tags, "google_reviews_average");
  const severity = averageRating === undefined ? 25 : averageRating >= 4 ? 20 : averageRating >= 3 ? 35 : 55;

  return {
    title: "Genel Yorum Özeti",
    severity,
    confidence: 0.92,
    evidence_count: evidenceCount,
    source_breakdown: {
      slack: 0,
      email: 0,
      whatsapp: 0,
      googlereviews: evidenceCount,
      zendesk: 0,
      intercom: 0,
      jira: 0,
      appstore: 0,
      googleplay: 0,
      googleanalytics: 0,
      github: 0,
      reddit: 0,
      shopify: 0,
      trustpilot: 0,
    },
    business_case: signal.content,
    recommended_action: averageRating !== undefined && averageRating >= 4
      ? "Acil aksiyon sinyali yok. Yeni 3 yıldız ve altı yorumlar geldiğinde aksiyon akışına alın; genel itibarı düzenli izleyin."
      : "Yorum özetindeki düşük puan ve tekrar eden temaları ayrı aksiyon başlıklarına ayırıp takip edin.",
    category: "musteri",
    customer_quote: signal.content.split("\n").find((line) => line.startsWith("- "))?.replace(/^- /, ""),
    projected_impact: "Google işletme itibarının genel görünümü",
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

function ratingDistribution(reviews: Array<Pick<GoogleBusinessReview, "rating">>) {
  return reviews.reduce<Record<number, number>>((acc, review) => {
    if (typeof review.rating === "number") acc[review.rating] = (acc[review.rating] ?? 0) + 1;
    return acc;
  }, {});
}

function formatRatingDistribution(counts: Record<number, number>) {
  const parts = [5, 4, 3, 2, 1]
    .filter((rating) => counts[rating])
    .map((rating) => `${rating} yıldız: ${counts[rating]}`);
  return parts.length > 0 ? parts.join(", ") : "puan yok";
}

function numberFromTag(tags: string[] | undefined, prefix: string) {
  const tag = tags?.find((value) => value.startsWith(`${prefix}:`));
  if (!tag) return undefined;
  const value = Number(tag.slice(prefix.length + 1));
  return Number.isFinite(value) ? value : undefined;
}
