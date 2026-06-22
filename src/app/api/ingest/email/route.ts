export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchGmailMessages, refreshGmailAccessToken } from "@/lib/email";
import { resolveSourceAuthMaterialFromVault } from "@/lib/source-auth-secret-store";
import { getSupabaseAdmin, getWorkspace, insertSignals } from "@/lib/supabase";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import type { Signal } from "@/lib/types";

type EmailSourceRow = {
  id: string;
  workspace_id: string;
  branch_id: string;
  type: string;
  config: Record<string, unknown>;
};

type EmailAuthRefRow = {
  vault_ref: string;
  status: string;
};

type EmailSignalInput = Omit<Signal, "id" | "created_at" | "branch_id"> & { branch_id?: string };
type ExistingEmailSignal = Pick<EmailSignalInput, "source_id" | "timestamp" | "sender" | "content">;

export async function POST(req: NextRequest) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { source_id?: unknown };
  const sourceId = typeof body.source_id === "string" ? body.source_id.trim() : "";

  const { data, error } = await buildSourceQuery(workspaceId, sourceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sources = (data ?? []) as EmailSourceRow[];
  if (sources.length > 0 || sourceId) {
    const summary = [];
    for (const source of sources) {
      try {
        const authRef = await fetchGmailAuthRef(workspaceId, source.id);
        if (!authRef || authRef.status !== "ready") {
          summary.push({ source_id: source.id, status: "skipped", reason: "missing_auth_ref" });
          continue;
        }

        const material = await resolveSourceAuthMaterialFromVault({
          vaultRef: authRef.vault_ref,
          fields: ["oauthRefreshToken"],
        });
        const refreshToken = material.oauthRefreshToken;
        if (!refreshToken) {
          summary.push({ source_id: source.id, status: "skipped", reason: "missing_auth_ref" });
          continue;
        }

        const accessToken = await refreshGmailAccessToken(refreshToken);
        const messages = await fetchGmailMessages(accessToken);
        const filtered = filterEmailMessages(messages, source.config);
        const parsedSignals = filtered.map((message) => emailMessageToSignal({
          workspaceId,
          branchId: source.branch_id,
          sourceId: source.id,
          message,
        }));
        const newSignals = await filterExistingSignals(workspaceId, source.branch_id, source.id, parsedSignals);
        const inserted = await insertSignals(newSignals);

        await getSupabaseAdmin()
          .from("sources")
          .update({
            status: "connected",
            last_sync_at: new Date().toISOString(),
          })
          .eq("id", source.id)
          .eq("workspace_id", workspaceId);

        summary.push({
          source_id: source.id,
          status: "synced",
          fetched: messages.length,
          ingested: inserted?.length ?? 0,
          existing_duplicates: parsedSignals.length - newSignals.length,
        });
      } catch (error) {
        summary.push({
          source_id: source.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Email ingest failed",
        });
      }
    }

    return NextResponse.json({
      processed: summary.length,
      synced: summary.filter((item) => item.status === "synced").length,
      summary,
    });
  }

  return ingestLegacyWorkspaceEmail(workspaceId);
}

async function ingestLegacyWorkspaceEmail(workspaceId: string) {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace.gmail_token) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
  }

  // Read threshold config (defaults: 7 days back, no domain filter)
  const ingestConfig = workspace.integrations_config?.email;
  if (ingestConfig && !ingestConfig.enabled) {
    return NextResponse.json({ error: "Email ingestion not enabled" }, { status: 400 });
  }

  const messages = await fetchGmailMessages(workspace.gmail_token);
  const filtered = filterEmailMessages(messages, ingestConfig ?? {});

  if (filtered.length === 0) {
    return NextResponse.json({ ingested: 0, message: "No emails matched the configured filters" });
  }

  const signals = filtered.map((m) => ({
    workspace_id: workspaceId,
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

function buildSourceQuery(workspaceId: string, sourceId: string) {
  let query = getSupabaseAdmin()
    .from("sources")
    .select("id, workspace_id, branch_id, type, config")
    .eq("workspace_id", workspaceId)
    .in("type", ["email", "gmail"]);

  if (sourceId) query = query.eq("id", sourceId);
  return query;
}

async function fetchGmailAuthRef(workspaceId: string, sourceId: string): Promise<EmailAuthRefRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("source_auth_refs")
    .select("vault_ref, status")
    .eq("workspace_id", workspaceId)
    .eq("source_id", sourceId)
    .eq("provider", "gmail")
    .maybeSingle();

  if (error) throw error;
  return data as EmailAuthRefRow | null;
}

function filterEmailMessages(
  messages: Array<{ channel: string; sender: string; content: string; timestamp: string }>,
  config: Record<string, unknown>,
) {
  const daysBack = numberConfig(config.max_age_days, 7);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const ageFiltered = messages.filter((message) => {
    try {
      return new Date(message.timestamp) >= cutoff;
    } catch {
      return true;
    }
  });

  const domains = stringConfig(config.sender_domains)
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  if (domains.length === 0) return ageFiltered;

  return ageFiltered.filter((message) => {
    const match = message.sender.match(/@([\w.-]+)/);
    return match ? domains.some((domain) => match[1].toLowerCase().endsWith(domain)) : false;
  });
}

function emailMessageToSignal(input: {
  workspaceId: string;
  branchId: string;
  sourceId: string;
  message: { channel: string; sender: string; content: string; timestamp: string };
}): EmailSignalInput {
  return {
    workspace_id: input.workspaceId,
    branch_id: input.branchId,
    source_id: input.sourceId,
    source: "email",
    source_type: "email",
    channel: input.message.channel,
    sender: input.message.sender,
    content: input.message.content,
    timestamp: input.message.timestamp,
    reviewed: false,
  };
}

async function filterExistingSignals(
  workspaceId: string,
  branchId: string,
  sourceId: string,
  signals: EmailSignalInput[],
) {
  if (signals.length === 0) return signals;

  const timestamps = Array.from(new Set(signals.map((signal) => signal.timestamp))).slice(0, 500);
  const { data, error } = await getSupabaseAdmin()
    .from("signals")
    .select("source_id, timestamp, sender, content")
    .eq("workspace_id", workspaceId)
    .eq("branch_id", branchId)
    .eq("source_id", sourceId)
    .eq("source", "email")
    .in("timestamp", timestamps);

  if (error) throw error;

  const existingKeys = new Set(
    ((data ?? []) as ExistingEmailSignal[]).map((signal) => emailDedupeKey(signal)),
  );

  return signals.filter((signal) => !existingKeys.has(emailDedupeKey(signal)));
}

function emailDedupeKey(signal: ExistingEmailSignal) {
  return [
    signal.source_id ?? "",
    signal.timestamp,
    signal.sender ?? "",
    signal.content,
  ].join("::");
}

function stringConfig(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function numberConfig(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}
