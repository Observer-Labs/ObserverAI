"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-green)]" />
      </div>
    );
  }

  const slackConnected = !!workspace.slack_token;
  const emailConnected = !!workspace.gmail_token;

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-0 h-[40%] w-1/2 bg-[radial-gradient(ellipse_at_top_left,rgba(110,168,255,0.08)_0%,transparent_70%)]" />
        <div className="absolute top-0 right-0 h-[40%] w-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(167,139,250,0.07)_0%,transparent_70%)]" />
      </div>

      {/* Top Bar */}
      <div className="sticky top-0 z-40 border-b bg-[rgba(11,12,16,0.92)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-[60px] max-w-[1000px] items-center gap-4 px-6">
          <Logo href="/" size={22} textSize="0.9rem" gap={8} />
          <div className="h-6 w-px bg-border" />
          <span className="text-[0.9rem] font-semibold text-foreground">Integrations</span>
          <div className="flex-1" />
          <Button asChild variant="outline" className="h-auto px-[14px] py-[6px] text-[0.8rem]">
            <Link href="/dashboard">← Dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="h-auto px-[14px] py-[6px] text-[0.8rem]">
            <Link href="/settings/distribution">Distribution</Link>
          </Button>
        </div>
      </div>

      <div className="relative z-[1] mx-auto max-w-[1000px] px-6 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-[1.75rem] font-extrabold text-foreground">Observer Integrations</h1>
          <p className="leading-[1.6] text-muted-foreground">
            Connect your product data sources. Observer ingests signals automatically and surfaces intent gaps using Claude AI.
          </p>
        </div>

        {syncResult && (
          <div
            className={cn(
              "mb-6 rounded-xl border px-5 py-3",
              syncResult.count >= 0
                ? "border-[rgba(70,230,166,0.3)] bg-[rgba(70,230,166,0.1)] text-[var(--accent-green)]"
                : "border-[rgba(255,92,122,0.3)] bg-[rgba(255,92,122,0.1)] text-destructive"
            )}
          >
            {syncResult.count >= 0
              ? `✓ Synced ${syncResult.count} new signals from ${syncResult.source}`
              : `✗ Sync failed for ${syncResult.source}, check your credentials`}
          </div>
        )}

        <div className="flex flex-col gap-5">

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
              <div className="mb-4">
                <Button asChild>
                  <a href={`/api/auth/slack?state=${workspace.id ?? ""}`}>⚡ Connect with Slack</a>
                </Button>
                <p className={hintClass}>You need to connect Slack via OAuth before enabling ingestion.</p>
              </div>
            ) : (
              <div className="mb-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="text-[0.8rem] font-semibold text-[var(--accent-green)]">✓ Slack workspace connected</span>
                  <a href={`/api/auth/slack?state=${workspace.id ?? ""}`} className="text-[0.78rem] text-muted-foreground no-underline">Re-authenticate →</a>
                </div>
                {/* Channels */}
                <Label className={labelClass}>Channels to monitor</Label>
                <div className="mb-2 flex gap-2">
                  <Input placeholder="general or C0123ABCD" id="slack-ch-input" className="flex-1" />
                  <Button variant="ghost" className="whitespace-nowrap"
                    onClick={() => {
                      const inp = document.getElementById("slack-ch-input") as HTMLInputElement;
                      const v = inp?.value.trim();
                      if (v && !channels.includes(v)) { setChannels([...channels, v]); inp.value = ""; }
                    }}>Add</Button>
                </div>
                {channels.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {channels.map((ch) => (
                      <Badge key={ch} variant="outline" className="gap-[5px] rounded-full border-[rgba(70,230,166,0.25)] bg-[rgba(70,230,166,0.1)] px-2.5 py-[3px] text-[0.78rem] font-normal text-[var(--accent-green)]">
                        # {ch}
                        <button onClick={() => setChannels(channels.filter((c) => c !== ch))}
                          className="cursor-pointer border-0 bg-transparent p-0 leading-none text-muted-foreground">×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClass}>Days back</Label>
                <Input type="number" min={1} max={90} value={config.slack.max_age_days}
                  onChange={(e) => updateField("slack", "max_age_days", Number(e.target.value))} />
                <p className={hintClass}>Only pull messages from last N days</p>
              </div>
              <div>
                <Label className={labelClass}>Keyword filter <span className="text-[0.7rem] normal-case">(optional)</span></Label>
                <Input placeholder="bug, crash, feedback" value={config.slack.keyword_filter}
                  onChange={(e) => updateField("slack", "keyword_filter", e.target.value)} />
                <p className={hintClass}>Comma-separated, empty = all messages</p>
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
              <div className="mb-4">
                <Button asChild>
                  <a href={`/api/auth/gmail?state=${workspace.id ?? ""}`}>✉️ Connect Gmail</a>
                </Button>
                <p className={hintClass}>You need to connect Gmail via OAuth before enabling ingestion.</p>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2.5">
                <span className="text-[0.8rem] font-semibold text-[var(--accent-green)]">✓ Gmail connected</span>
                <a href={`/api/auth/gmail?state=${workspace.id ?? ""}`} className="text-[0.78rem] text-muted-foreground no-underline">Re-authenticate →</a>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClass}>Days back</Label>
                <Input type="number" min={1} max={90} value={config.email.max_age_days}
                  onChange={(e) => updateField("email", "max_age_days", Number(e.target.value))} />
                <p className={hintClass}>Only pull emails from last N days</p>
              </div>
              <div>
                <Label className={labelClass}>Sender domains <span className="text-[0.7rem] normal-case">(optional)</span></Label>
                <Input placeholder="acmecorp.com, partner.io" value={config.email.sender_domains}
                  onChange={(e) => updateField("email", "sender_domains", e.target.value)} />
                <p className={hintClass}>Comma-separated, empty = all senders</p>
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
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClass}>Subdomain</Label>
                <Input placeholder="yourcompany (without .zendesk.com)" value={config.zendesk.subdomain} onChange={(e) => updateField("zendesk", "subdomain", e.target.value)} />
              </div>
              <div>
                <Label className={labelClass}>Email</Label>
                <Input placeholder="admin@yourcompany.com" value={config.zendesk.email} onChange={(e) => updateField("zendesk", "email", e.target.value)} />
              </div>
              <div className="col-span-full">
                <Label className={labelClass}>API Token</Label>
                <Input type="password" placeholder="Zendesk API token" value={config.zendesk.api_token} onChange={(e) => updateField("zendesk", "api_token", e.target.value)} />
                <p className={hintClass}>Admin Center → Apps & Integrations → Zendesk API → API token</p>
              </div>
            </div>
            <div className="border-t border-muted pt-3.5">
              <p className={sectionTitleClass}>Observer thresholds</p>
              <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                <div>
                  <Label className={labelClass}>Min priority</Label>
                  <select className={cn(selectClass, "w-full")} value={config.zendesk.min_priority} onChange={(e) => updateField("zendesk", "min_priority", e.target.value)}>
                    <option value="low">Low (include all)</option>
                    <option value="normal">Normal and above</option>
                    <option value="high">High and above</option>
                    <option value="urgent">Urgent only</option>
                  </select>
                </div>
                <div className="pt-[22px]">
                  <Label className="flex cursor-pointer items-center gap-2 font-normal">
                    <input type="checkbox" checked={config.zendesk.exclude_closed} onChange={(e) => updateField("zendesk", "exclude_closed", e.target.checked)} className="accent-[var(--accent-green)]" />
                    <span className="text-[0.8rem] text-muted-foreground">Exclude closed tickets</span>
                  </Label>
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
            <div className="mb-3.5">
              <Label className={labelClass}>Access Token</Label>
              <Input type="password" placeholder="Intercom access token" value={config.intercom.access_token} onChange={(e) => updateField("intercom", "access_token", e.target.value)} />
              <p className={hintClass}>Settings → Developers → Your app → Authentication → Access Token</p>
            </div>
            <div className="border-t border-muted pt-3.5">
              <p className={sectionTitleClass}>Observer thresholds</p>
              <Label className="flex cursor-pointer items-center gap-2 font-normal">
                <input type="checkbox" checked={config.intercom.open_only} onChange={(e) => updateField("intercom", "open_only", e.target.checked)} className="accent-[var(--accent-green)]" />
                <span className="text-[0.8rem] text-muted-foreground">Open conversations only (recommended)</span>
              </Label>
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
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClass}>Domain</Label>
                <Input placeholder="yourcompany.atlassian.net" value={config.jira.domain} onChange={(e) => updateField("jira", "domain", e.target.value)} />
              </div>
              <div>
                <Label className={labelClass}>Project Key</Label>
                <Input placeholder="PROJ" value={config.jira.project_key} onChange={(e) => updateField("jira", "project_key", e.target.value)} />
              </div>
              <div>
                <Label className={labelClass}>Email</Label>
                <Input placeholder="admin@yourcompany.com" value={config.jira.email} onChange={(e) => updateField("jira", "email", e.target.value)} />
              </div>
              <div>
                <Label className={labelClass}>API Token</Label>
                <Input type="password" placeholder="Jira API token" value={config.jira.api_token} onChange={(e) => updateField("jira", "api_token", e.target.value)} />
              </div>
            </div>
            <p className={hintClass}>id.atlassian.com → Security → Create and manage API tokens</p>
            <div className="mt-2 border-t border-muted pt-3.5">
              <p className={sectionTitleClass}>Observer thresholds</p>
              <div className="mb-2.5 grid grid-cols-2 gap-3">
                <div>
                  <Label className={labelClass}>Min priority</Label>
                  <select className={cn(selectClass, "w-full")} value={config.jira.min_priority} onChange={(e) => updateField("jira", "min_priority", e.target.value)}>
                    <option value="lowest">All (Lowest+)</option>
                    <option value="low">Low and above</option>
                    <option value="medium">Medium and above</option>
                    <option value="high">High and above</option>
                    <option value="highest">Highest only</option>
                  </select>
                </div>
                <div>
                  <Label className={labelClass}>Issue types <span className="text-[0.7rem] normal-case">(optional)</span></Label>
                  <Input placeholder="Bug, Story, Epic" value={config.jira.issue_types} onChange={(e) => updateField("jira", "issue_types", e.target.value)} />
                  <p className={hintClass}>Comma-separated, empty = all types</p>
                </div>
              </div>
              <Label className="flex cursor-pointer items-center gap-2 font-normal">
                <input type="checkbox" checked={config.jira.exclude_done} onChange={(e) => updateField("jira", "exclude_done", e.target.checked)} className="accent-[var(--accent-green)]" />
                <span className="text-[0.8rem] text-muted-foreground">Exclude Done / Closed / Resolved issues</span>
              </Label>
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
            <div className="mb-3">
              <Label className={labelClass}>iOS App ID</Label>
              <Input placeholder="1234567890" value={config.appstore.app_id_ios} onChange={(e) => updateField("appstore", "app_id_ios", e.target.value)} />
              <p className={hintClass}>From App Store URL: apps.apple.com/app/id{"{ID}"}</p>
            </div>
            <div className="border-t border-muted pt-3.5">
              <p className={sectionTitleClass}>Observer thresholds</p>
              <div>
                <Label className={labelClass}>Max rating to ingest ≤</Label>
                <div className="flex items-center gap-3">
                  <Input type="number" min={1} max={5} value={config.appstore.max_rating}
                    onChange={(e) => updateField("appstore", "max_rating", Number(e.target.value))} className="w-[72px]" />
                  <span className="text-[0.8rem] text-muted-foreground">
                    {"⭐".repeat(Math.min(5, config.appstore.max_rating || 3))} and below
                  </span>
                </div>
                <p className={hintClass}>Only ingest reviews with this star rating or fewer. Default 3 surfaces negative and mixed reviews.</p>
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
            <div className="mb-3 grid grid-cols-3 gap-3">
              <div>
                <Label className={labelClass}>Owner</Label>
                <Input placeholder="myorg" value={config.github.owner} onChange={(e) => updateField("github", "owner", e.target.value)} />
              </div>
              <div>
                <Label className={labelClass}>Repository</Label>
                <Input placeholder="my-repo" value={config.github.repo} onChange={(e) => updateField("github", "repo", e.target.value)} />
              </div>
              <div>
                <Label className={labelClass}>Personal Access Token</Label>
                <Input type="password" placeholder="github_pat_..." value={config.github.token} onChange={(e) => updateField("github", "token", e.target.value)} />
              </div>
            </div>
            <p className={hintClass}>Settings → Developer settings → Personal access tokens → Fine-grained (read:issues)</p>
            <div className="mt-2 border-t border-muted pt-3.5">
              <p className={sectionTitleClass}>Observer thresholds</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={labelClass}>Min reactions</Label>
                  <Input type="number" min={0} value={config.github.min_reactions}
                    onChange={(e) => updateField("github", "min_reactions", Number(e.target.value))} />
                  <p className={hintClass}>Only issues with at least this many 👍 reactions</p>
                </div>
                <div>
                  <Label className={labelClass}>Label filter <span className="text-[0.7rem] normal-case">(optional)</span></Label>
                  <Input placeholder="bug, enhancement, feedback" value={config.github.labels}
                    onChange={(e) => updateField("github", "labels", e.target.value)} />
                  <p className={hintClass}>Comma-separated, empty = all labels</p>
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
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClass}>Client ID</Label>
                <Input placeholder="Reddit app client ID" value={config.reddit.client_id} onChange={(e) => updateField("reddit", "client_id", e.target.value)} />
              </div>
              <div>
                <Label className={labelClass}>Client Secret</Label>
                <Input type="password" placeholder="Reddit app client secret" value={config.reddit.client_secret} onChange={(e) => updateField("reddit", "client_secret", e.target.value)} />
              </div>
              <div className="col-span-full">
                <Label className={labelClass}>Subreddits to monitor</Label>
                <Input placeholder="r/typescript, r/nextjs, r/yourproduct" value={config.reddit.subreddits} onChange={(e) => updateField("reddit", "subreddits", e.target.value)} />
                <p className={hintClass}>reddit.com/prefs/apps → Create App (script type) to get credentials</p>
              </div>
            </div>
            <div className="border-t border-muted pt-3.5">
              <p className={sectionTitleClass}>Observer thresholds</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={labelClass}>Min upvotes</Label>
                  <Input type="number" min={0} value={config.reddit.min_score}
                    onChange={(e) => updateField("reddit", "min_score", Number(e.target.value))} />
                  <p className={hintClass}>Filters low-quality / throwaway posts</p>
                </div>
                <div>
                  <Label className={labelClass}>Min comments</Label>
                  <Input type="number" min={0} value={config.reddit.min_comments}
                    onChange={(e) => updateField("reddit", "min_comments", Number(e.target.value))} />
                  <p className={hintClass}>Only posts with engagement</p>
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
    <div className={cn("rounded-[14px] border bg-card p-7 shadow-sm transition-opacity duration-200", enabled ? "opacity-100" : "opacity-75")}>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border text-[1.4rem]"
            style={{ background: `${color}15`, borderColor: `${color}30` }}
          >
            {icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-foreground">{name}</span>
              {badge && (
                <Badge
                  variant="outline"
                  className="rounded-full px-2 py-[2px] text-[0.65rem] font-normal"
                  style={{ color, background: `${color}15`, borderColor: `${color}30` }}
                >
                  {badge}
                </Badge>
              )}
              {enabled && (
                <Badge variant="outline" className="rounded-full border-[rgba(70,230,166,0.25)] bg-[rgba(70,230,166,0.1)] px-2 py-[2px] text-[0.65rem] font-normal text-[var(--accent-green)]">
                  Active
                </Badge>
              )}
            </div>
            <p className="mt-1 text-[0.8rem] leading-[1.4] text-muted-foreground">{description}</p>
          </div>
        </div>
        {/* Toggle */}
        <Switch checked={enabled} onCheckedChange={onToggle} className="shrink-0" />
      </div>

      {/* Fields, only shown when enabled */}
      {enabled && (
        <div className="mb-5">
          {children}
        </div>
      )}

      {/* Footer actions */}
      {enabled && (
        <div className="flex flex-wrap items-center gap-2.5">
          <Button onClick={onSave} disabled={saving} className="h-auto px-4 py-[6px] text-[0.8rem]">
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
          </Button>
          <Button variant="outline" onClick={onSync} disabled={syncing} className="h-auto px-4 py-[6px] text-[0.8rem]">
            {syncing ? "Syncing…" : "↻ Sync Now"}
          </Button>
          <span className="ml-1 text-[0.75rem] text-muted-foreground">
            Last synced: {formatLastSync(lastSync)}
          </span>
        </div>
      )}
    </div>
  );
}

const labelClass =
  "mb-1.5 block text-[0.75rem] font-medium uppercase tracking-[0.05em] text-muted-foreground";

const hintClass = "mt-1.5 text-[0.72rem] leading-[1.4] text-muted-foreground";

const sectionTitleClass =
  "mb-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";
