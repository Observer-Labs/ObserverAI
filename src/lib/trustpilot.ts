/**
 * Trustpilot Business API v1, review ingestion
 * Docs: https://support.trustpilot.com/hc/en-us/articles/207893816
 */
import type { TrustpilotConfig } from "./types";

export interface TrustpilotSignal {
  channel: string;
  sender: string;
  content: string;
  timestamp: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface TrustpilotReview {
  id: string;
  stars: number;
  title: string;
  text: string;
  createdAt: string;
  consumer?: { displayName?: string };
}

interface TrustpilotResponse {
  reviews: TrustpilotReview[];
}

export async function fetchTrustpilotSignals(
  config: TrustpilotConfig,
  lastSync?: string | null
): Promise<TrustpilotSignal[]> {
  const maxRating = config.max_rating ?? 3;

  // Fetch reviews from Trustpilot Business API
  const url = new URL(
    `https://api.trustpilot.com/v1/private/business-units/${config.business_unit_id}/reviews`
  );
  url.searchParams.set("stars", Array.from({ length: maxRating }, (_, i) => String(i + 1)).join(","));
  url.searchParams.set("perPage", "100");
  url.searchParams.set("orderBy", "createdat.desc");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Trustpilot API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as TrustpilotResponse;
  const reviews: TrustpilotReview[] = data.reviews ?? [];

  const cutoff = lastSync ? new Date(lastSync) : null;

  return reviews
    .filter((r) => {
      if (cutoff && new Date(r.createdAt) <= cutoff) return false;
      return true;
    })
    .map((r) => {
      const stars = r.stars ?? 3;
      const sentiment: "positive" | "negative" | "neutral" =
        stars >= 4 ? "positive" : stars <= 2 ? "negative" : "neutral";

      const text = [r.title, r.text].filter(Boolean).join(", ");

      return {
        channel: "trustpilot",
        sender: r.consumer?.displayName ?? "Anonymous",
        content: `⭐${stars}/5, ${text}`,
        timestamp: r.createdAt,
        sentiment,
      };
    });
}
