import type { AppStoreConfig } from "./types";

interface RawSignal {
  channel: string;
  sender: string;
  content: string;
  timestamp: string;
}

export async function fetchAppStoreReviews(config: AppStoreConfig): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];

  // ── max_rating threshold ─────────────────────────────────────────────────
  // App Store is a negative-signal source by design. We want to catch reviews
  // where users are frustrated, 1-3 stars signal pain, churn risk, and feature gaps.
  // 4-5 star reviews confirm what's working but don't drive product action.
  // Default: max_rating = 3 (only 1, 2, 3 star reviews become signals).
  const maxRating = config.max_rating ?? 3;

  // iOS, iTunes RSS feed (public, no auth required)
  if (config.app_id_ios) {
    try {
      const res = await fetch(
        `https://itunes.apple.com/rss/customerreviews/id=${config.app_id_ios}/sortBy=mostRecent/page=1/json`,
        { headers: { "Accept": "application/json" } }
      );
      if (res.ok) {
        const data = await res.json() as { feed?: { entry?: AppStoreEntry[] } };
        // First entry is app metadata, skip it with slice(1)
        const entries: AppStoreEntry[] = (data.feed?.entry ?? []).slice(1);

        for (const entry of entries) {
          const ratingStr = entry["im:rating"]?.label ?? "5";
          const ratingNum = parseInt(ratingStr, 10);

          // ── THRESHOLD GATE: Sentiment filter ────────────────────────────
          // Only ingest reviews at or below max_rating.
          // A review rated 4+ means the user is satisfied, not a pain signal.
          // Skip it to reduce noise in the clustering pipeline.
          if (!isNaN(ratingNum) && ratingNum > maxRating) continue;

          const title = entry.title?.label ?? "";
          const body = entry.content?.label ?? "";
          const author = entry.author?.name?.label ?? "anonymous";
          const updated = entry.updated?.label ?? new Date().toISOString();

          signals.push({
            channel: `appstore-ios-${config.app_id_ios}`,
            sender: author,
            content: `[${ratingNum}/5 ★] ${title}: ${body}`.trim(),
            timestamp: new Date(updated).toISOString(),
          });
        }
      }
    } catch (e) {
      console.error("App Store iOS fetch error:", e);
    }
  }

  // Android (Google Play), no reliable public API without google-play-scraper package.
  // Add app_id_android to config for future use when that dependency is approved.
  if (config.app_id_android) {
    console.warn(
      "Google Play reviews require the google-play-scraper npm package. " +
      "Android reviews are not fetched in this version."
    );
  }

  return signals;
}

interface AppStoreEntry {
  "im:rating"?: { label: string };
  title?: { label: string };
  content?: { label: string };
  author?: { name?: { label: string } };
  updated?: { label: string };
  id?: { label: string };
}
