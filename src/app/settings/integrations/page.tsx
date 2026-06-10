"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { IntegrationsConfig } from "@/lib/types";

interface WorkspaceMeta {
  slack_token?: string;
  slack_bot_token?: string;
  slack_monitored_channels?: string[];
  gmail_token?: string;
  id?: string;
}

const defaultConfig: IntegrationsConfig = {
  slack:           { enabled: false, max_age_days: 7, keyword_filter: "", last_sync: null },
  email:           { enabled: false, max_age_days: 7, sender_domains: "", last_sync: null },
  zendesk:         { enabled: false, subdomain: "", email: "", api_token: "", min_priority: "normal", exclude_closed: true, last_sync: null },
  intercom:        { enabled: false, access_token: "", open_only: true, last_sync: null },
  jira:            { enabled: false, domain: "", email: "", api_token: "", project_key: "", min_priority: "low", exclude_done: true, issue_types: "", last_sync: null },
  appstore:        { enabled: false, app_id_ios: "", app_id_android: "", max_rating: 3, last_sync: null },
  googleplay:      { enabled: false, package_name: "", service_account_key: "", max_rating: 3, last_sync: null },
  googleanalytics: { enabled: false, property_id: "", service_account_email: "", service_account_key: "", event_filter: "", last_sync: null },
  github:          { enabled: false, token: "", owner: "", repo: "", min_reactions: 0, labels: "", last_sync: null },
  reddit:          { enabled: false, client_id: "", client_secret: "", subreddits: "", min_score: 5, min_comments: 0, last_sync: null },
};

function formatLastSync(ts: string | null): string {
  if (!ts) return "Never synced";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function IntegrationsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<IntegrationsConfig>(defaultConfig);
  const [workspace, setWorkspace] = useState<WorkspaceMeta>({});
  const [channels, setChannels] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [savedSource, setSavedSource] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ source: string; count: number } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const authRes = await fetch("/api/auth/session");
        if (!authRes.ok) { router.push("/login?redirect=/settings/integrations"); return; }
        const wsRes = await fetch("/api/workspace");
        if (!wsRes.ok) { router.push("/login?redirect=/settings/integrations"); return; }
        const wd = await wsRes.json();
        const ws = wd.workspace ?? {};
        setWorkspace(ws);
        setChannels(ws.slack_monitored_channels ?? []);
        if (ws.integrations_config) {
          setConfig((prev) => ({ ...prev, ...ws.integrations_config }));
        }
        setAuthChecked(true);
      } catch {
        router.push("/login?redirect=/settings/integrations");
      }
    })();
  }, [router]);

  const saveIntegration = async (source: keyof IntegrationsConfig) => {
    setSaving(source);
    if (source === "slack") {
      await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { slack_monitored_channels: channels, integrations_config: config } }),
      });
    } else {
      await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { integrations_config: config } }),
      });
    }
    setSaving(null);
    setSavedSource(source);
    setTimeout(() => setSavedSource(null), 2000);
  };

  const syncNow = async (source: keyof IntegrationsConfig) => {
    setSyncing(source);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/ingest/${source}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      setSyncResult({ source, count: data.ingested ?? 0 });
      const ws = await fetch("/api/workspace").then((r) => r.json());
      if (ws.workspace?.integrations_config) {
        setConfig((prev) => ({ ...prev, ...ws.workspace.integrations_config }));
      }
    } catch {
      setSyncResult({ source, count: -1 });
    } finally {
      setSyncing(null);
      setTimeout(() => setSyncResult(null), 4000);
    }
  };

  const updateField = <K extends keyof IntegrationsConfig>(
    source: K,
    field: string,
    value: string | boolean | number
  ) => {
    setConfig((prev) => ({
      ...prev,
      [source]: { ...prev[source], [field]: value },
    }));
  };

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(70,230,166,0.2)", borderTopColor: "var(--accent-green)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const slackConnected = !!workspace.slack_token;
  const emailConnected = !!workspace.gmail_token;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "40%", background: "radial-gradient(ellipse at top left, rgba(110,168,255,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "40%", background: "radial-gradient(ellipse at top right, rgba(167,139,250,0.07) 0%, transparent 70%)" }} />
      </div>

      {/* Top Bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(11,12,16,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 60 }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <div className="brand-dot" style={{ width: 22, height: 22 }} />
            <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "0.9rem" }}>Observer</span>
          </Link>
          <div style={{ width: 1, height: 24, background: "var(--border)" }} />
          <span style={{ color: "var(--foreground)", fontWeight: 600, fontSize: "0.9rem" }}>Integrations</span>
          <div style={{ flex: 1 }} />
          <Link href="/dashboard" className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.8rem", padding: "6px 14px" }}>← Dashboard</Link>
          <Link href="/settings/distribution" className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.8rem", padding: "6px 14px" }}>Distribution</Link>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: "var(--foreground)", fontWeight: 800, fontSize: "1.75rem", marginBottom: 8 }}>Observer Integrations</h1>
          <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            Connect your product data sources. Observer ingests signals automatically and surfaces intent gaps using Claude AI.
          </p>
        </div>

        {syncResult && (
          <div style={{ marginBottom: 24, padding: "12px 20px", borderRadius: 12, background: syncResult.count >= 0 ? "rgba(70,230,166,0.1)" : "rgba(255,92,122,0.1)", border: `1px solid ${syncResult.count >= 0 ? "rgba(70,230,166,0.3)" : "rgba(255,92,122,0.3)"}`, color: syncResult.count >= 0 ? "var(--accent-green)" : "var(--danger)" }}>
            {syncResult.count >= 0
              ? `✓ Synced ${syncResult.count} new signals from ${syncResult.source}`
              : `✗ Sync failed for ${syncResult.source}, check your credentials`}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Slack (OAuth source) ── */}
          <IntegrationCard
            name="Slack" icon="⚡" color="#e879f9"
            description="Pull team messages from monitored channels. OAuth-authenticated."
            enabled={config.slack.enabled}
            lastSync={config.slack.last_sync}
            onToggle={(v) => updateField("slack", "enabled", v)}
            onSave={() => saveIntegration("slack")}
            onSync={() => syncNow("slack")}
            saving={saving === "slack"}
            syncing={syncing === "slack"}
            saved={savedSource === "slack"}
            badge={slackConnected ? "OAuth Connected" : undefined}
          >
            {!slackConnected ? (
              <div style={{ marginBottom: 16 }}>
                <a href={`/api/auth/slack?state=${workspace.id ?? ""}`} className="btn-primary"
                  style={{ textDecoration: "none", display: "inline-flex" }}>
                  ⚡ Connect with Slack
                </a>
                <p style={hintStyle}>You need to connect Slack via OAuth before enabling ingestion.</p>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ color: "var(--accent-green)", fontSize: "0.8rem", fontWeight: 600 }}>✓ Slack workspace connected</span>
                  <a href={`/api/auth/slack?state=${workspace.id ?? ""}`} style={{ color: "var(--muted)", fontSize: "0.78rem", textDecoration: "none" }}>Re-authenticate →</a>
                </div>
                {/* Channels */}
                <label style={labelStyle}>Channels to monitor</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input className="obs-input" placeholder="general or C0123ABCD" id="slack-ch-input" style={{ flex: 1 }} />
                  <button className="btn-ghost" style={{ whiteSpace: "nowrap" }}
                    onClick={() => {
                      const inp = document.getElementById("slack-ch-input") as HTMLInputElement;
                      const v = inp?.value.trim();
                      if (v && !channels.includes(v)) { setChannels([...channels, v]); inp.value = ""; }
                    }}>Add</button>
                </div>
                {channels.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {channels.map((ch) => (
                      <div key={ch} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 9999, background: "rgba(70,230,166,0.1)", border: "1px solid rgba(70,230,166,0.25)", fontSize: "0.78rem", color: "var(--accent-green)" }}>
                        # {ch}
                        <button onClick={() => setChannels(channels.filter((c) => c !== ch))}
                          style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Days back</label>
                <input className="obs-input" type="number" min={1} max={90} value={config.slack.max_age_days}
                  onChange={(e) => updateField("slack", "max_age_days", Number(e.target.value))} />
                <p style={hintStyle}>Only pull messages from last N days</p>
              </div>
              <div>
                <label style={labelStyle}>Keyword filter <span style={{ textTransform: "none", fontSize: "0.7rem" }}>(optional)</span></label>
                <input className="obs-input" placeholder="bug, crash, feedback" value={config.slack.keyword_filter}
                  onChange={(e) => updateField("slack", "keyword_filter", e.target.value)} />
                <p style={hintStyle}>Comma-separated, empty = all messages</p>
              </div>
            </div>
          </IntegrationCard>

          {/* ── Email / Gmail (OAuth source) ── */}
          <IntegrationCard
            name="Email" icon="✉️" color="#6ea8ff"
            description="Pull inbox emails as signals. Gmail OAuth, reads subject, sender, and body snippet."
            enabled={config.email.enabled}
            lastSync={config.email.last_sync}
            onToggle={(v) => updateField("email", "enabled", v)}
            onSave={() => saveIntegration("email")}
            onSync={() => syncNow("email")}
            saving={saving === "email"}
            syncing={syncing === "email"}
            saved={savedSource === "email"}
            badge={emailConnected ? "OAuth Connected" : undefined}
          >
            {!emailConnected ? (
              <div style={{ marginBottom: 16 }}>
                <a href={`/api/auth/gmail?state=${workspace.id ?? ""}`} className="btn-primary"
                  style={{ textDecoration: "none", display: "inline-flex" }}>
                  ✉️ Connect Gmail
                </a>
                <p style={hintStyle}>You need to connect Gmail via OAuth before enabling ingestion.</p>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ color: "var(--accent-green)", fontSize: "0.8rem", fontWeight: 600 }}>✓ Gmail connected</span>
                <a href={`/api/auth/gmail?state=${workspace.id ?? ""}`} style={{ color: "var(--muted)", fontSize: "0.78rem", textDecoration: "none" }}>Re-authenticate →</a>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Days back</label>
                <input className="obs-input" type="number" min={1} max={90} value={config.email.max_age_days}
                  onChange={(e) => updateField("email", "max_age_days", Number(e.target.value))} />
                <p style={hintStyle}>Only pull emails from last N days</p>
              </div>
              <div>
                <label style={labelStyle}>Sender domains <span style={{ textTransform: "none", fontSize: "0.7rem" }}>(optional)</span></label>
                <input className="obs-input" placeholder="acmecorp.com, partner.io" value={config.email.sender_domains}
                  onChange={(e) => updateField("email", "sender_domains", e.target.value)} />
                <p style={hintStyle}>Comma-separated, empty = all senders</p>
              </div>
            </div>
          </IntegrationCard>

          {/* ── Zendesk ── */}
          <IntegrationCard
            name="Zendesk" icon="🎫" color="#f79a00"
            description="Pull support tickets and customer conversations. High signal-to-noise for real product pain."
            enabled={config.zendesk.enabled}
            lastSync={config.zendesk.last_sync}
            onToggle={(v) => updateField("zendesk", "enabled", v)}
            onSave={() => saveIntegration("zendesk")}
            onSync={() => syncNow("zendesk")}
            saving={saving === "zendesk"}
            syncing={syncing === "zendesk"}
            saved={savedSource === "zendesk"}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Subdomain</label>
                <input className="obs-input" placeholder="yourcompany (without .zendesk.com)" value={config.zendesk.subdomain} onChange={(e) => updateField("zendesk", "subdomain", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input className="obs-input" placeholder="admin@yourcompany.com" value={config.zendesk.email} onChange={(e) => updateField("zendesk", "email", e.target.value)} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>API Token</label>
                <input className="obs-input" type="password" placeholder="Zendesk API token" value={config.zendesk.api_token} onChange={(e) => updateField("zendesk", "api_token", e.target.value)} />
                <p style={hintStyle}>Admin Center → Apps & Integrations → Zendesk API → API token</p>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--muted-surface)", paddingTop: 14 }}>
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Observer thresholds</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
                <div>
                  <label style={labelStyle}>Min priority</label>
                  <select className="obs-input" value={config.zendesk.min_priority} onChange={(e) => updateField("zendesk", "min_priority", e.target.value)} style={{ width: "100%" }}>
                    <option value="low">Low (include all)</option>
                    <option value="normal">Normal and above</option>
                    <option value="high">High and above</option>
                    <option value="urgent">Urgent only</option>
                  </select>
                </div>
                <div style={{ paddingTop: 22 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={config.zendesk.exclude_closed} onChange={(e) => updateField("zendesk", "exclude_closed", e.target.checked)} style={{ accentColor: "var(--accent-green)" }} />
                    <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Exclude closed tickets</span>
                  </label>
                </div>
              </div>
            </div>
          </IntegrationCard>

          {/* ── Intercom ── */}
          <IntegrationCard
            name="Intercom" icon="💼" color="#4dabf7"
            description="Pull customer conversations and support chats. Captures the exact language customers use."
            enabled={config.intercom.enabled}
            lastSync={config.intercom.last_sync}
            onToggle={(v) => updateField("intercom", "enabled", v)}
            onSave={() => saveIntegration("intercom")}
            onSync={() => syncNow("intercom")}
            saving={saving === "intercom"}
            syncing={syncing === "intercom"}
            saved={savedSource === "intercom"}
          >
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Access Token</label>
              <input className="obs-input" type="password" placeholder="Intercom access token" value={config.intercom.access_token} onChange={(e) => updateField("intercom", "access_token", e.target.value)} />
              <p style={hintStyle}>Settings → Developers → Your app → Authentication → Access Token</p>
            </div>
            <div style={{ borderTop: "1px solid var(--muted-surface)", paddingTop: 14 }}>
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Observer thresholds</p>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={config.intercom.open_only} onChange={(e) => updateField("intercom", "open_only", e.target.checked)} style={{ accentColor: "var(--accent-green)" }} />
                <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Open conversations only (recommended)</span>
              </label>
            </div>
          </IntegrationCard>

          {/* ── Jira ── */}
          <IntegrationCard
            name="Jira" icon="📋" color="#2684ff"
            description="Pull issues and feature requests. Also powers the Execution Reality tab with live sprint data."
            enabled={config.jira.enabled}
            lastSync={config.jira.last_sync}
            onToggle={(v) => updateField("jira", "enabled", v)}
            onSave={() => saveIntegration("jira")}
            onSync={() => syncNow("jira")}
            saving={saving === "jira"}
            syncing={syncing === "jira"}
            saved={savedSource === "jira"}
            badge="Powers Execution Reality tab"
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Domain</label>
                <input className="obs-input" placeholder="yourcompany.atlassian.net" value={config.jira.domain} onChange={(e) => updateField("jira", "domain", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Project Key</label>
                <input className="obs-input" placeholder="PROJ" value={config.jira.project_key} onChange={(e) => updateField("jira", "project_key", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input className="obs-input" placeholder="admin@yourcompany.com" value={config.jira.email} onChange={(e) => updateField("jira", "email", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>API Token</label>
                <input className="obs-input" type="password" placeholder="Jira API token" value={config.jira.api_token} onChange={(e) => updateField("jira", "api_token", e.target.value)} />
              </div>
            </div>
            <p style={hintStyle}>id.atlassian.com → Security → Create and manage API tokens</p>
            <div style={{ borderTop: "1px solid var(--muted-surface)", paddingTop: 14, marginTop: 8 }}>
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Observer thresholds</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Min priority</label>
                  <select className="obs-input" value={config.jira.min_priority} onChange={(e) => updateField("jira", "min_priority", e.target.value)} style={{ width: "100%" }}>
                    <option value="lowest">All (Lowest+)</option>
                    <option value="low">Low and above</option>
                    <option value="medium">Medium and above</option>
                    <option value="high">High and above</option>
                    <option value="highest">Highest only</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Issue types <span style={{ textTransform: "none", fontSize: "0.7rem" }}>(optional)</span></label>
                  <input className="obs-input" placeholder="Bug, Story, Epic" value={config.jira.issue_types} onChange={(e) => updateField("jira", "issue_types", e.target.value)} />
                  <p style={hintStyle}>Comma-separated, empty = all types</p>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={config.jira.exclude_done} onChange={(e) => updateField("jira", "exclude_done", e.target.checked)} style={{ accentColor: "var(--accent-green)" }} />
                <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Exclude Done / Closed / Resolved issues</span>
              </label>
            </div>
          </IntegrationCard>

          {/* ── App Store ── */}
          <IntegrationCard
            name="App Store Reviews" icon="⭐" color="#a78bfa"
            description="Pull iOS App Store reviews. Unfiltered customer sentiment at scale, no auth required for iOS."
            enabled={config.appstore.enabled}
            lastSync={config.appstore.last_sync}
            onToggle={(v) => updateField("appstore", "enabled", v)}
            onSave={() => saveIntegration("appstore")}
            onSync={() => syncNow("appstore")}
            saving={saving === "appstore"}
            syncing={syncing === "appstore"}
            saved={savedSource === "appstore"}
          >
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>iOS App ID</label>
              <input className="obs-input" placeholder="1234567890" value={config.appstore.app_id_ios} onChange={(e) => updateField("appstore", "app_id_ios", e.target.value)} />
              <p style={hintStyle}>From App Store URL: apps.apple.com/app/id{"{ID}"}</p>
            </div>
            <div style={{ borderTop: "1px solid var(--muted-surface)", paddingTop: 14 }}>
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Observer thresholds</p>
              <div>
                <label style={labelStyle}>Max rating to ingest ≤</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input className="obs-input" type="number" min={1} max={5} value={config.appstore.max_rating}
                    onChange={(e) => updateField("appstore", "max_rating", Number(e.target.value))} style={{ width: 72 }} />
                  <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {"⭐".repeat(Math.min(5, config.appstore.max_rating || 3))} and below
                  </span>
                </div>
                <p style={hintStyle}>Only ingest reviews with this star rating or fewer. Default 3 surfaces negative and mixed reviews.</p>
              </div>
            </div>
          </IntegrationCard>

          {/* ── GitHub ── */}
          <IntegrationCard
            name="GitHub Issues" icon="🐙" color="#c9d1d9"
            description="Pull open issues from your repo. Technical users' pain points, prioritized by reactions."
            enabled={config.github.enabled}
            lastSync={config.github.last_sync}
            onToggle={(v) => updateField("github", "enabled", v)}
            onSave={() => saveIntegration("github")}
            onSync={() => syncNow("github")}
            saving={saving === "github"}
            syncing={syncing === "github"}
            saved={savedSource === "github"}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Owner</label>
                <input className="obs-input" placeholder="myorg" value={config.github.owner} onChange={(e) => updateField("github", "owner", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Repository</label>
                <input className="obs-input" placeholder="my-repo" value={config.github.repo} onChange={(e) => updateField("github", "repo", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Personal Access Token</label>
                <input className="obs-input" type="password" placeholder="github_pat_..." value={config.github.token} onChange={(e) => updateField("github", "token", e.target.value)} />
              </div>
            </div>
            <p style={hintStyle}>Settings → Developer settings → Personal access tokens → Fine-grained (read:issues)</p>
            <div style={{ borderTop: "1px solid var(--muted-surface)", paddingTop: 14, marginTop: 8 }}>
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Observer thresholds</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Min reactions</label>
                  <input className="obs-input" type="number" min={0} value={config.github.min_reactions}
                    onChange={(e) => updateField("github", "min_reactions", Number(e.target.value))} />
                  <p style={hintStyle}>Only issues with at least this many 👍 reactions</p>
                </div>
                <div>
                  <label style={labelStyle}>Label filter <span style={{ textTransform: "none", fontSize: "0.7rem" }}>(optional)</span></label>
                  <input className="obs-input" placeholder="bug, enhancement, feedback" value={config.github.labels}
                    onChange={(e) => updateField("github", "labels", e.target.value)} />
                  <p style={hintStyle}>Comma-separated, empty = all labels</p>
                </div>
              </div>
            </div>
          </IntegrationCard>

          {/* ── Reddit ── */}
          <IntegrationCard
            name="Reddit Mentions" icon="👾" color="#ff4500"
            description="Monitor subreddit discussions about your product. Unfiltered public sentiment."
            enabled={config.reddit.enabled}
            lastSync={config.reddit.last_sync}
            onToggle={(v) => updateField("reddit", "enabled", v)}
            onSave={() => saveIntegration("reddit")}
            onSync={() => syncNow("reddit")}
            saving={saving === "reddit"}
            syncing={syncing === "reddit"}
            saved={savedSource === "reddit"}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Client ID</label>
                <input className="obs-input" placeholder="Reddit app client ID" value={config.reddit.client_id} onChange={(e) => updateField("reddit", "client_id", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Client Secret</label>
                <input className="obs-input" type="password" placeholder="Reddit app client secret" value={config.reddit.client_secret} onChange={(e) => updateField("reddit", "client_secret", e.target.value)} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Subreddits to monitor</label>
                <input className="obs-input" placeholder="r/typescript, r/nextjs, r/yourproduct" value={config.reddit.subreddits} onChange={(e) => updateField("reddit", "subreddits", e.target.value)} />
                <p style={hintStyle}>reddit.com/prefs/apps → Create App (script type) to get credentials</p>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--muted-surface)", paddingTop: 14 }}>
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Observer thresholds</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Min upvotes</label>
                  <input className="obs-input" type="number" min={0} value={config.reddit.min_score}
                    onChange={(e) => updateField("reddit", "min_score", Number(e.target.value))} />
                  <p style={hintStyle}>Filters low-quality / throwaway posts</p>
                </div>
                <div>
                  <label style={labelStyle}>Min comments</label>
                  <input className="obs-input" type="number" min={0} value={config.reddit.min_comments}
                    onChange={(e) => updateField("reddit", "min_comments", Number(e.target.value))} />
                  <p style={hintStyle}>Only posts with engagement</p>
                </div>
              </div>
            </div>
          </IntegrationCard>

        </div>
      </div>
    </div>
  );
}

// ─── IntegrationCard component ────────────────────────────────────────────────

interface IntegrationCardProps {
  name: string;
  icon: string;
  color: string;
  description: string;
  enabled: boolean;
  lastSync: string | null;
  onToggle: (v: boolean) => void;
  onSave: () => void;
  onSync: () => void;
  saving: boolean;
  syncing: boolean;
  saved: boolean;
  badge?: string;
  children: React.ReactNode;
}

function IntegrationCard({ name, icon, color, description, enabled, lastSync, onToggle, onSave, onSync, saving, syncing, saved, badge, children }: IntegrationCardProps) {
  return (
    <div className="obs-card" style={{ padding: 28, opacity: enabled ? 1 : 0.75, transition: "opacity 0.2s" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${color}15`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
            {icon}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1rem" }}>{name}</span>
              {badge && (
                <span style={{ fontSize: "0.65rem", color: color, background: `${color}15`, padding: "2px 8px", borderRadius: 9999, border: `1px solid ${color}30` }}>
                  {badge}
                </span>
              )}
              {enabled && (
                <span style={{ fontSize: "0.65rem", color: "var(--accent-green)", background: "rgba(70,230,166,0.1)", padding: "2px 8px", borderRadius: 9999, border: "1px solid rgba(70,230,166,0.25)" }}>
                  Active
                </span>
              )}
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: "4px 0 0", lineHeight: 1.4 }}>{description}</p>
          </div>
        </div>
        {/* Toggle */}
        <button
          onClick={() => onToggle(!enabled)}
          style={{ width: 44, height: 24, borderRadius: 9999, background: enabled ? "var(--primary)" : "var(--border)", border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}
        >
          <div style={{ position: "absolute", top: 3, left: enabled ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: enabled ? "var(--primary-foreground)" : "oklch(0.7 0.02 257)", transition: "left 0.2s" }} />
        </button>
      </div>

      {/* Fields, only shown when enabled */}
      {enabled && (
        <div style={{ marginBottom: 20 }}>
          {children}
        </div>
      )}

      {/* Footer actions */}
      {enabled && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={onSave} disabled={saving} style={{ fontSize: "0.8rem", padding: "6px 16px" }}>
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
          </button>
          <button className="btn-secondary" onClick={onSync} disabled={syncing} style={{ fontSize: "0.8rem", padding: "6px 16px" }}>
            {syncing ? "Syncing…" : "↻ Sync Now"}
          </button>
          <span style={{ color: "var(--muted)", fontSize: "0.75rem", marginLeft: 4 }}>
            Last synced: {formatLastSync(lastSync)}
          </span>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", color: "var(--muted)", fontSize: "0.75rem", fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em",
};

const hintStyle: React.CSSProperties = {
  color: "var(--muted)", fontSize: "0.72rem", marginTop: 6, lineHeight: 1.4,
};
