---
description: Audit all observer-ai ingest routes for consistency, auth coverage, error handling, and type correctness. Reports issues and fixes them.
allowed-tools: Read, Glob, Grep, Edit, Bash(npx tsc:*)
---

# Signal Health Audit

You are auditing all ingest routes in observer-ai for correctness and consistency.

## Project snapshot

- All ingest routes: !`ls src/app/api/ingest/`
- All distribute routes: !`ls src/app/api/distribute/`
- Type definitions: `src/lib/types.ts`
- Auth helper: `src/lib/auth.ts`

## Your task

Use TodoWrite to track each step. Work systematically.

### Step 1 — Read all routes in parallel
Read every file in `src/app/api/ingest/*/route.ts` and `src/app/api/distribute/*/route.ts`. Also read `src/lib/types.ts` and `src/lib/auth.ts`.

### Step 2 — Check each ingest route against this checklist

For **every** ingest route, verify:

| Check | Expected |
|-------|----------|
| Auth guard | `getAuthenticatedWorkspaceId()` wrapped in try/catch returning 401 |
| Config check | Verifies the relevant integration is `enabled` and credentials exist |
| Source constant | Uses `"<source>" as const` matching the `SignalSource` union in types.ts |
| Calls `insertSignals()` | Not a raw Supabase insert |
| Returns `{ ingested: number }` | Consistent response shape |
| `export const dynamic = "force-dynamic"` | Present at top of file |
| No hardcoded credentials | No API keys or tokens in source |

For **every** distribute route, verify:

| Check | Expected |
|-------|----------|
| Auth guard | `getAuthenticatedWorkspaceId()` try/catch → 401 |
| Config enabled check | Checks `distribution_config.<channel>.enabled` |
| Handles send failure gracefully | try/catch around external API call |
| Returns `{ sent: boolean }` or equivalent | Consistent shape |

### Step 3 — Check types.ts coverage

- Every source in `src/app/api/ingest/` should be in the `SignalSource` union
- Every source should have a field in `SourceBreakdown`
- Every source with config (zendesk, jira, etc.) should have a matching entry in `IntegrationsConfig`

Find any gaps: !`ls src/app/api/ingest/`

### Step 4 — Run TypeScript

Run `npx tsc --noEmit` and capture any errors.

### Step 5 — Fix issues

For each issue found in steps 2–4:
- Fix it directly in the file
- Note what you fixed in your final report

### Step 6 — Report

Output a clean summary:

```
Signal Health Report
====================

Ingest routes: X/Y passing
Distribute routes: X/Y passing
Type coverage: X/Y sources typed

Issues found and fixed:
- [route] [description of fix]

Issues requiring manual attention:
- [description]

TypeScript: PASS / FAIL
  [errors if any]
```
