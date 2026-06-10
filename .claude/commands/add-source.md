---
description: Scaffold a new signal ingest source for observer-ai. Adds the route, types, config interface, and wires it into the workspace.
argument-hint: Source name (e.g. "linear", "hubspot", "pagerduty")
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npx tsc:*)
---

# Add New Ingest Source

You are adding a new signal ingest source to observer-ai. The source name is: **$ARGUMENTS**

## Project context

- Ingest routes live in: `src/app/api/ingest/<source>/route.ts`
- Signal sources are typed in: `src/lib/types.ts` (`SignalSource` union, `SourceBreakdown`, `IntegrationsConfig`)
- All routes follow the same pattern: auth → fetch workspace config → call external API → map to signals → `insertSignals()`
- Existing sources for reference: !`ls src/app/api/ingest/`

Read these files for exact patterns before writing anything:
- `src/app/api/ingest/slack/route.ts` — simplest route pattern
- `src/app/api/ingest/zendesk/route.ts` — external API with config pattern
- `src/lib/types.ts` — all type definitions

## Your task

Work through these steps in order using TodoWrite to track progress:

### Step 1 — Clarify
If $ARGUMENTS is empty or unclear, ask the user: what is the source name, what external API does it call, and what config fields does it need (API key, subdomain, etc.)?

### Step 2 — Read existing patterns
Read the files listed above. Understand the exact shape of `insertSignals()` calls, how config is stored in `workspace.integrations_config`, and how `SignalSource` is typed.

### Step 3 — Update `src/lib/types.ts`
1. Add the new source name to the `SignalSource` union type
2. Add a `count: number` field to `SourceBreakdown` for the new source
3. Add a config interface `<Source>Config` with `enabled: boolean`, relevant credentials, and `last_sync: string | null`
4. Add the config to `IntegrationsConfig`

### Step 4 — Create the route
Create `src/app/api/ingest/<source>/route.ts` following this exact structure:
```ts
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
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
  const config = workspace.integrations_config?.<source>;
  if (!config?.enabled || !config.<required_credential>) {
    return NextResponse.json({ error: "<Source> not configured" }, { status: 400 });
  }

  // TODO: fetch from external API using config credentials
  const items: Array<{ content: string; channel: string; sender?: string; timestamp: string }> = [];

  const signals = items.map((item) => ({
    workspace_id: wid,
    source: "<source>" as const,
    channel: item.channel,
    sender: item.sender,
    content: item.content,
    timestamp: item.timestamp,
    reviewed: false,
  }));

  const inserted = await insertSignals(signals);
  return NextResponse.json({ ingested: inserted?.length ?? 0 });
}
```

Fill in the actual API fetching logic using the config credentials. Keep it realistic — use `fetch()` with the right auth headers.

### Step 5 — Type-check
Run: `npx tsc --noEmit`
Fix any type errors before finishing.

### Step 6 — Report
Tell the user:
- What files were created/modified
- What env vars or config fields the user needs to fill in
- What the ingest endpoint URL is (`POST /api/ingest/<source>`)
- What's left to do (e.g. add UI in settings/integrations page, add to dashboard source breakdown)
