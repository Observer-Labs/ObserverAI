import type { JiraConfig, SprintItem } from "./types";

interface RawSignal {
  channel: string;
  sender: string;
  content: string;
  timestamp: string;
}

// Priority order used for threshold comparison.
// We build the JQL IN clause from all priorities at or above the configured minimum.
const JIRA_PRIORITY_ORDER = ["lowest", "low", "medium", "high", "highest"] as const;

export async function fetchJiraIssues(config: JiraConfig): Promise<RawSignal[]> {
  const {
    domain,
    email,
    api_token,
    project_key,
    last_sync,
    min_priority = "medium",  // Only Medium, High, Highest, Low/Lowest = tech debt noise
    exclude_done = true,       // Skip closed issues, they're resolved, not active signals
    issue_types = "",          // Empty = all types; e.g. "Bug,Story" to focus
  } = config;

  const credentials = Buffer.from(`${email}:${api_token}`).toString("base64");
  const headers = {
    "Authorization": `Basic ${credentials}`,
    "Accept": "application/json",
  };

  // ── Build JQL with all threshold filters pushed server-side ─────────────
  // Server-side JQL is far more efficient than client-side filtering:
  // Jira evaluates the filter index, so we get only matching records back.
  const jqlParts: string[] = [`project=${project_key}`];

  // Time window, only ingest issues created after last sync
  if (last_sync) {
    const date = new Date(last_sync).toISOString().split("T")[0];
    jqlParts.push(`created>="${date}"`);
  }

  // ── THRESHOLD GATE 1: Priority floor ──────────────────────────────────
  // Map the configured minimum to all priorities that should pass through.
  // "medium" → ["Medium", "High", "Highest"], excludes Lowest + Low noise.
  // "high"   → ["High", "Highest"], only urgent issues become signals.
  // "lowest" → all priorities pass (no filter applied, avoids redundant JQL).
  const minIdx = JIRA_PRIORITY_ORDER.indexOf(min_priority.toLowerCase() as typeof JIRA_PRIORITY_ORDER[number]);
  const validIdx = minIdx === -1 ? 2 : minIdx; // default to "medium" if unrecognised
  if (validIdx > 0) {
    const includedPriorities = JIRA_PRIORITY_ORDER
      .slice(validIdx)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1));
    jqlParts.push(`priority in (${includedPriorities.join(",")})`);
  }

  // ── THRESHOLD GATE 2: Status exclusion ────────────────────────────────
  // Done/Closed issues are already resolved, including them adds historical
  // noise without any actionable signal.
  if (exclude_done) {
    jqlParts.push(`status NOT IN (Done,Closed,Resolved,"Won't Fix",Duplicate)`);
  }

  // ── THRESHOLD GATE 3: Issue type whitelist ────────────────────────────
  // When configured, restrict to specific issue types so e.g. "Epic" or
  // "Sub-task" don't dilute the signal with structural overhead issues.
  if (issue_types.trim()) {
    const types = issue_types
      .split(",")
      .map((t) => `"${t.trim()}"`)
      .filter(Boolean)
      .join(",");
    jqlParts.push(`issuetype in (${types})`);
  }

  const jql = jqlParts.join(" AND ") + " ORDER BY created DESC";

  const params = new URLSearchParams({
    jql,
    maxResults: "100",
    fields: "summary,description,status,priority,assignee,created,issuetype",
  });

  const res = await fetch(`https://${domain}/rest/api/3/search?${params}`, { headers });
  if (!res.ok) {
    throw new Error(`Jira API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { issues?: JiraIssue[] };
  const issues: JiraIssue[] = data.issues ?? [];

  return issues.map((issue) => {
    // Enrich content with structured metadata so the AI clustering pipeline
    // has context on priority and issue type without needing to join data.
    const priorityLabel = issue.fields.priority?.name ?? "Unknown";
    const statusLabel = issue.fields.status?.name ?? "Unknown";
    const typeLabel = issue.fields.issuetype?.name ?? "Issue";
    const description = extractADFText(issue.fields.description);

    const content = [
      `[${issue.key}] ${issue.fields.summary}`,
      `Priority: ${priorityLabel} · Status: ${statusLabel} · Type: ${typeLabel}`,
      description,
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    return {
      channel: `jira-${project_key}`,
      sender: issue.fields.assignee?.emailAddress ?? "unassigned",
      content,
      timestamp: issue.fields.created,
    };
  });
}

export async function fetchJiraCurrentSprint(config: JiraConfig): Promise<SprintItem[]> {
  const { domain, email, api_token, project_key } = config;
  const credentials = Buffer.from(`${email}:${api_token}`).toString("base64");
  const headers = {
    "Authorization": `Basic ${credentials}`,
    "Accept": "application/json",
  };

  try {
    // Step 1: Get board
    const boardRes = await fetch(
      `https://${domain}/rest/agile/1.0/board?projectKeyOrId=${project_key}`,
      { headers }
    );
    if (!boardRes.ok) return [];
    const boardData = await boardRes.json() as { values?: { id: number }[] };
    const boardId = boardData.values?.[0]?.id;
    if (!boardId) return [];

    // Step 2: Get active sprint
    const sprintRes = await fetch(
      `https://${domain}/rest/agile/1.0/board/${boardId}/sprint?state=active`,
      { headers }
    );
    if (!sprintRes.ok) return [];
    const sprintData = await sprintRes.json() as { values?: { id: number }[] };
    const sprintId = sprintData.values?.[0]?.id;
    if (!sprintId) return [];

    // Step 3: Get sprint issues
    const issuesRes = await fetch(
      `https://${domain}/rest/agile/1.0/sprint/${sprintId}/issue?fields=summary,status,priority,issuetype&maxResults=50`,
      { headers }
    );
    if (!issuesRes.ok) return [];
    const issuesData = await issuesRes.json() as { issues?: JiraIssue[] };

    return (issuesData.issues ?? []).map((issue) => ({
      id: issue.id,
      key: issue.key,
      title: issue.fields.summary,
      status: issue.fields.status?.name ?? "Unknown",
      priority: issue.fields.priority?.name ?? "Medium",
      type: issue.fields.issuetype?.name ?? "Task",
    }));
  } catch {
    // Agile API not available on next-gen/team-managed projects, return empty
    return [];
  }
}

// Recursively extract plain text from Atlassian Document Format (ADF)
function extractADFText(node: ADFNode | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  const children = node.content ?? [];
  return children.map(extractADFText).join(" ").replace(/\s+/g, " ").trim();
}

interface ADFNode {
  type: string;
  text?: string;
  content?: ADFNode[];
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: ADFNode | null;
    status: { name: string };
    priority: { name: string } | null;
    assignee: { emailAddress: string } | null;
    created: string;
    issuetype: { name: string };
  };
}
