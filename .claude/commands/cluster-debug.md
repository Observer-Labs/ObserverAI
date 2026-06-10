---
description: Debug the observer-ai AI analysis and clustering pipeline. Traces the full signal→cluster flow, identifies bottlenecks, and surfaces issues with Claude prompts, Supabase queries, or data shapes.
argument-hint: Optional - describe the symptom (e.g. "no clusters being created", "clusters missing source_breakdown", "low confidence scores")
allowed-tools: Read, Glob, Grep, Bash(npx tsc:*)
---

# Cluster Pipeline Debug

You are debugging the observer-ai signal analysis and clustering pipeline.

**Symptom reported:** $ARGUMENTS

## Pipeline overview

The full flow is:
1. Signals ingested via `/api/ingest/*` → stored in `signals` table
2. `POST /api/analyze` → fetches unreviewed signals → calls Claude → maps to clusters → `upsertClusters()` → marks signals reviewed
3. Clusters distributed via `/api/distribute/*`

## Step 1 — Read the full pipeline

Read all of these files before doing anything else:

- `src/app/api/analyze/route.ts` — the orchestration layer
- `src/lib/anthropic.ts` — the Claude prompt and response parsing
- `src/lib/supabase.ts` — `getPendingSignals()`, `upsertClusters()`, `insertSignals()`
- `src/lib/types.ts` — `Signal`, `Cluster`, `AnalysisResult`, `SourceBreakdown`

## Step 2 — Trace the data shapes

For each step in the pipeline, verify the data shape is consistent:

### Signals going in
- `getPendingSignals(workspaceId)` — what does it select? Does it filter `reviewed = false`?
- Are all `SignalSource` values represented in `SourceBreakdown`?
- Is the `content` field populated on all signal types?

### Claude prompt
- Read the exact prompt in `src/lib/anthropic.ts`
- Does it ask Claude to return `title`, `severity`, `confidence`, `evidence_count`, `source_breakdown`, `business_case`, `recommended_action`, `customer_quote`?
- Is the response parsed as JSON? Is there error handling for malformed JSON?
- What model is being used? Is `max_tokens` sufficient for the response?

### Cluster mapping
- In `analyze/route.ts`, does the mapping from `AnalysisResult` → cluster insert match all required fields?
- Is `severity_label` being derived correctly from `severity` (0-100)?
- Does `source_breakdown` have all 9 source fields?

### Upsert
- Does `upsertClusters()` use `onConflict` correctly?
- Are workspace_id foreign key constraints satisfied?

## Step 3 — Find the bug

Based on the symptom "$ARGUMENTS" and your reading, identify the most likely failure points:

- **"No clusters created"** → Check `getPendingSignals` query, check `reviewed` flag logic, check if Claude call throws, check JSON parsing
- **"Missing source_breakdown fields"** → Check `SourceBreakdown` type vs what Claude returns vs what the mapping sets
- **"Low confidence"** → Check the Claude prompt quality, signal content richness, `evidence_count` calculation
- **"Clusters not auto-distributing"** → Check `auto_distribute` flag in workspace config, check the self-fetch URLs, check `NEXTAUTH_URL` env var
- **"TypeScript errors"** → Run `npx tsc --noEmit` and report

## Step 4 — Run TypeScript check

Run `npx tsc --noEmit` to surface any type mismatches in the pipeline.

## Step 5 — Report

Produce a debug report:

```
Cluster Pipeline Debug Report
==============================

Symptom: <reported symptom>

Pipeline trace:
  ✓ getPendingSignals: <what it does>
  ✓/✗ Claude call: <model, prompt summary, parse approach>
  ✓/✗ Cluster mapping: <issues found>
  ✓/✗ upsertClusters: <issues found>
  ✓/✗ Auto-distribute: <config check>

Root cause identified:
  <specific file:line and what's wrong>

Fix:
  <what needs to change>

TypeScript: PASS / FAIL
```

If you found a fix, apply it. If the fix requires more context (e.g. seeing actual data), tell the user exactly what to check in Supabase or logs.
