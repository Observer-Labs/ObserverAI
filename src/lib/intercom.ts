import type { IntercomConfig } from "./types";

interface RawSignal {
  channel: string;
  sender: string;
  content: string;
  timestamp: string;
}

export async function fetchIntercomConversations(config: IntercomConfig): Promise<RawSignal[]> {
  const { access_token, last_sync } = config;
  const headers = {
    "Authorization": `Bearer ${access_token}`,
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Intercom-Version": "2.10",
  };

  const queryValue: IntercomQueryCondition[] = [
    { field: "state", operator: "=", value: "open" },
  ];

  if (last_sync) {
    const unixEpoch = Math.floor(new Date(last_sync).getTime() / 1000);
    queryValue.push({ field: "created_at", operator: ">", value: unixEpoch });
  }

  const body = {
    query: { operator: "AND", value: queryValue },
    sort: { field: "created_at", order: "descending" },
    pagination: { per_page: 100 },
  };

  const res = await fetch("https://api.intercom.io/conversations/search", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Intercom API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { conversations?: IntercomConversation[] };
  const conversations: IntercomConversation[] = data.conversations ?? [];

  return conversations
    .filter((c) => c.source?.body)
    .map((c) => ({
      channel: "intercom-conversations",
      sender: c.contacts?.contacts?.[0]?.id ?? "unknown",
      content: stripHtml(c.source.body),
      timestamp: new Date(c.created_at * 1000).toISOString(),
    }));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

interface IntercomQueryCondition {
  field: string;
  operator: string;
  value: string | number;
}

interface IntercomConversation {
  id: string;
  created_at: number;
  source: { type: string; body: string };
  contacts: { contacts: { type: string; id: string }[] };
}
