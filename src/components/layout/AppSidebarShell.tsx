"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { getPlanStatus } from "@/lib/polar";
import type { Workspace } from "@/lib/types";

const SIDEBAR_PATHS = [
  "/dashboard",
  "/sources",
  "/connect",
  "/alerts",
  "/settings",
  "/history",
  "/delivery-log",
];

const SOURCE_KEYS = [
  "googlereviews",
  "getir",
  "yemeksepeti",
  "trendyol",
  "pos",
  "googleanalytics",
  "appstore",
  "email",
  "reddit",
  "zendesk",
  "intercom",
  "slack",
  "github",
  "jira",
  "shopify",
  "googleplay",
  "trustpilot",
] as const;

function shouldShowSidebar(pathname: string) {
  return SIDEBAR_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function countConnectedSources(workspace: Workspace | null) {
  if (!workspace) return 0;

  const integrations = workspace.integrations_config ?? {};
  let count = SOURCE_KEYS.filter((key) => {
    if (key === "email") return Boolean(workspace.gmail_token);
    if (key === "slack") return Boolean(workspace.slack_token);
    const config = integrations[key as keyof typeof integrations] as { enabled?: boolean } | undefined;
    return Boolean(config?.enabled);
  }).length;

  if (workspace.gmail_token && count === 0) count += 1;
  return count;
}

export default function AppSidebarShell() {
  const pathname = usePathname();
  const visible = shouldShowSidebar(pathname);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [userInitials, setUserInitials] = useState("?");

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    async function loadShellData() {
      try {
        const [sessionRes, workspaceRes] = await Promise.all([
          fetch("/api/auth/session"),
          fetch("/api/workspace"),
        ]);

        if (cancelled) return;

        if (sessionRes.ok) {
          const session = await sessionRes.json().catch(() => null);
          const email = session?.user?.email as string | undefined;
          if (email) setUserInitials(email.substring(0, 2).toUpperCase());
        }

        if (workspaceRes.ok) {
          const data = await workspaceRes.json().catch(() => null);
          setWorkspace(data?.workspace ?? null);
        }
      } catch {
        if (!cancelled) setWorkspace(null);
      }
    }

    void loadShellData();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const planStatus = useMemo(() => {
    if (!workspace) return null;
    try {
      return getPlanStatus(workspace);
    } catch {
      return null;
    }
  }, [workspace]);

  if (!visible) return null;

  return (
    <Sidebar
      sourceCount={countConnectedSources(workspace)}
      userInitials={userInitials}
      workspaceName={workspace?.name}
      plan={planStatus?.plan}
      runsLeft={planStatus?.runsLeft}
      trialDaysLeft={planStatus?.daysLeft}
    />
  );
}
