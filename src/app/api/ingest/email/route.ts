export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchGmailMessages } from "@/lib/email";
import { getWorkspace, insertSignals } from "@/lib/supabase";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  let wid: string;
  try {
    wid = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const workspace = await getWorkspace(wid);
  if (!workspace.gmail_token) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
  }

  // Read threshold config (defaults: 7 days back, no domain filter)
  const ingestConfig = workspace.integrations_config?.email;
  if (ingestConfig && !ingestConfig.enabled) {
    return NextResponse.json({ error: "Email ingestion not enabled" }, { status: 400 });
  }
  const daysBack = ingestConfig?.max_age_days ?? 7;

  const messages = await fetchGmailMessages(workspace.gmail_token);

  // Apply age filter, fetchGmailMessages doesn't accept a date param, filter post-fetch
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const ageFiltered = messages.filter((m) => {
    try { return new Date(m.timestamp) >= cutoff; } catch { return true; }
  });

  // Apply sender domain filter if configured
  const domainsRaw = ingestConfig?.sender_domains ?? "";
  const domains = domainsRaw
    .split(",")
    .map((d: string) => d.trim().toLowerCase())
    .filter(Boolean);

  const filtered = domains.length === 0
    ? ageFiltered
    : ageFiltered.filter((m) => {
        const match = m.sender.match(/@([\w.-]+)/);
        return match ? domains.some((d: string) => match[1].toLowerCase().endsWith(d)) : false;
      });

  if (filtered.length === 0) {
    return NextResponse.json({ ingested: 0, message: "No emails matched the configured filters" });
  }

  const signals = filtered.map((m) => ({
    workspace_id: wid,
    source: "email" as const,
    channel: m.channel,
    sender: m.sender,
    content: m.content,
    timestamp: m.timestamp,
    reviewed: false,
  }));

  const inserted = await insertSignals(signals);
  return NextResponse.json({ ingested: inserted?.length ?? 0 });
}
