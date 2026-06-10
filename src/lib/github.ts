import type { GitHubConfig } from "./types";

interface RawSignal {
  channel: string;
  sender: string;
  content: string;
  timestamp: string;
  tags?: string[];
}

export async function fetchGitHubIssues(config: GitHubConfig): Promise<RawSignal[]> {
  const {
    token,
    owner,
    repo,
    last_sync,
    min_reactions = 0, // 0 = all issues; raise to filter out single-person reports
    labels = "",       // Empty = all labels; configure to focus on specific categories
  } = config;

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ObserverApp/1.0",
  };

  const params = new URLSearchParams({
    state: "open",
    sort: "created",
    direction: "desc",
    per_page: "100",
  });

  if (last_sync) {
    // GitHub `since` filters by updated_at, this may re-surface updated old issues, which is acceptable
    params.set("since", last_sync);
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?${params}`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }

  const issues = await res.json() as GitHubIssue[];

  // ── Parse label whitelist (case-insensitive) ─────────────────────────────
  // e.g. "bug, feature request, regression" → Set of lowercased strings
  const labelWhitelist = labels
    .split(",")
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);

  return issues
    // Filter out pull requests (GitHub returns PRs in issues endpoint by default)
    .filter((i) => !i.pull_request)

    // ── THRESHOLD GATE 1: Community validation via reactions ─────────────────
    // reactions.total_count counts all emoji reactions (👍 ❤️ 🎉 etc.)
    // Default 0 means all issues qualify, good for small repos / dev tools.
    // Raise to 3+ to surface only issues multiple users explicitly validated.
    .filter((i) => (i.reactions?.total_count ?? 0) >= min_reactions)

    // ── THRESHOLD GATE 2: Label whitelist ───────────────────────────────────
    // When labels are configured, only ingest issues that carry at least one
    // of the configured labels. This focuses signal on e.g. "bug" + "feature-request"
    // and ignores "documentation", "good first issue", "question", etc.
    // Empty = no label filter (all issues pass through).
    .filter((i) => {
      if (labelWhitelist.length === 0) return true;
      const issueLabels = i.labels.map((l) => l.name.toLowerCase());
      return labelWhitelist.some((wl) => issueLabels.includes(wl));
    })

    .map((issue) => ({
      channel: `github-${owner}-${repo}`,
      sender: issue.user.login,
      content: `[#${issue.number}] ${issue.title}\n\n${issue.body ?? ""}`.trim(),
      timestamp: issue.created_at,
      tags: issue.labels.map((l) => l.name),
    }));
}

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  user: { login: string };
  labels: { name: string }[];
  created_at: string;
  pull_request?: unknown;
  reactions?: { total_count: number; "+1": number };
}
