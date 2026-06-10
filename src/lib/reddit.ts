import type { RedditConfig } from "./types";

interface RawSignal {
  channel: string;
  sender: string;
  content: string;
  timestamp: string;
}

async function getRedditAccessToken(client_id: string, client_secret: string): Promise<string> {
  const credentials = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // User-Agent is mandatory, Reddit blocks requests without it
      "User-Agent": "ObserverApp/1.0",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Reddit auth error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function fetchRedditMentions(config: RedditConfig): Promise<RawSignal[]> {
  const {
    client_id,
    client_secret,
    subreddits,
    last_sync,
    min_score = 5,    // Community validation gate: net upvotes required
    min_comments = 0, // Engagement gate: 0 = score alone is enough
  } = config;

  const accessToken = await getRedditAccessToken(client_id, client_secret);

  // Parse comma-separated subreddits: "r/typescript, r/nextjs" → ["typescript", "nextjs"]
  const subredditList = subreddits
    .split(",")
    .map((s) => s.trim().replace(/^r\//i, ""))
    .filter(Boolean);

  const lastSyncEpoch = last_sync ? Math.floor(new Date(last_sync).getTime() / 1000) : 0;
  const signals: RawSignal[] = [];

  for (const subreddit of subredditList) {
    try {
      const res = await fetch(
        `https://oauth.reddit.com/r/${subreddit}/new.json?limit=100`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "User-Agent": "ObserverApp/1.0",
            "Accept": "application/json",
          },
        }
      );

      if (!res.ok) {
        console.error(`Reddit fetch error for r/${subreddit}: ${res.status}`);
        continue;
      }

      const data = await res.json() as { data?: { children?: { data: RedditPost }[] } };
      const posts = (data.data?.children ?? []).map((c) => c.data);

      for (const post of posts) {
        // Skip removed/deleted posts, no signal value
        if (post.selftext === "[removed]") continue;

        // Skip posts older than last_sync
        if (lastSyncEpoch > 0 && post.created_utc <= lastSyncEpoch) continue;

        // ── THRESHOLD GATE 1: Community validation ──────────────────────────
        // min_score filters out posts nobody upvoted (spam, ignored posts).
        // A score of 5+ means the community noticed and agreed.
        if (post.score < min_score) continue;

        // ── THRESHOLD GATE 2: Engagement depth (optional) ───────────────────
        // When min_comments > 0, require conversation to have started.
        // Default is 0, score alone is sufficient signal.
        if (min_comments > 0 && (post.num_comments ?? 0) < min_comments) continue;

        // Build content: include selftext if present, otherwise title only (link posts)
        const body = post.selftext?.trim();
        const content = body ? `${post.title}\n\n${body}` : post.title;

        signals.push({
          channel: `reddit-r-${post.subreddit}`,
          sender: post.author,
          content,
          timestamp: new Date(post.created_utc * 1000).toISOString(),
        });
      }

      // Small delay between subreddits to respect rate limits (60 req/min)
      if (subredditList.length > 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (e) {
      console.error(`Error fetching r/${subreddit}:`, e);
    }
  }

  return signals;
}

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  created_utc: number;
  subreddit: string;
  score: number;
  num_comments: number;
  url: string;
}
