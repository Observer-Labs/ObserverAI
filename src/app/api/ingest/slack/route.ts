export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchSlackMessages } from "@/lib/slack";
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
  if (!workspace.slack_token) {
    return NextResponse.json({ error: "Slack not connected" }, { status: 400 });
  }

  const channels = workspace.slack_monitored_channels ?? [];
  if (channels.length === 0) {
    return NextResponse.json({ error: "No channels configured" }, { status: 400 });
  }

  // Read threshold config (defaults: 7 days back, no keyword filter)
  const ingestConfig = workspace.integrations_config?.slack;
  if (ingestConfig && !ingestConfig.enabled) {
    return NextResponse.json({ error: "Slack ingestion not enabled" }, { status: 400 });
  }
  const daysBack = ingestConfig?.max_age_days ?? 7;

  const messages = await fetchSlackMessages(
    workspace.slack_bot_token ?? workspace.slack_token,
    channels,
    daysBack,
  );

  // Apply keyword filter if configured
  const keywordsRaw = ingestConfig?.keyword_filter ?? "";
  const keywords = keywordsRaw
    .split(",")
    .map((k: string) => k.trim().toLowerCase())
    .filter(Boolean);

  const filtered = keywords.length === 0
    ? messages
    : messages.filter((m) => keywords.some((kw: string) => m.content.toLowerCase().includes(kw)));

  if (filtered.length === 0) {
    return NextResponse.json({ ingested: 0, message: "No messages matched the configured filters" });
  }

  const signals = filtered.map((m) => ({
    workspace_id: wid,
    source: "slack" as const,
    channel: m.channel,
    sender: m.sender,
    content: m.content,
    timestamp: m.timestamp,
    reviewed: false,
  }));

  const inserted = await insertSignals(signals);
  return NextResponse.json({ ingested: inserted?.length ?? 0 });
}
