---
description: Pre-deployment checklist for observer-ai. Runs TypeScript, lint, checks env vars, audits auth coverage, and flags anything that would break in production.
allowed-tools: Read, Glob, Grep, Bash(npx tsc:*), Bash(npx eslint:*), Bash(ls:*)
---

# Pre-Ship Checklist

You are running a pre-deployment check for observer-ai.

## Step 1 — TypeScript

Run `npx tsc --noEmit` and capture all errors. If there are errors, report them and stop — do not proceed until told to.

## Step 2 — Lint

Run `npx eslint src/ --ext .ts,.tsx --max-warnings 0`

## Step 3 — Auth coverage

Every API route must be protected. Check every file matching `src/app/api/**/route.ts`:

!`find src/app/api -name "route.ts" | sort`

For each route, verify it has `getAuthenticatedWorkspaceId()` with a try/catch returning 401.

**Exceptions** (routes that legitimately skip auth):
- `src/app/api/webhooks/whatsapp/route.ts` — webhook verified by signature
- `src/app/api/auth/**` — auth routes themselves

Flag any route missing auth that isn't in the exceptions list.

## Step 4 — Required env vars

Check that all env vars used in the codebase are documented. Search for all `process.env.` references:

Scan `src/` for `process.env.` usage and compile the full list. Then check which ones have no fallback (`?? "..."` or `|| "..."`), meaning they're required in production.

Compare against `.env.local` if it exists: !`ls .env* 2>/dev/null || echo "no .env files found"`

Flag any required env vars that aren't set.

## Step 5 — TODO / FIXME scan

!`grep -rn "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" --include="*.tsx" | head -30`

Flag any TODOs in API routes or critical paths (lib/, api/).

## Step 6 — Build check

Run `npx next build` — but only if steps 1 and 2 passed. If TypeScript or lint failed, skip this and tell the user.

Actually, skip the build — it takes too long. Just note "Run `npm run build` locally before deploying."

## Step 7 — Production readiness checklist

Read these files and check each item:

- `src/app/api/analyze/route.ts` — does it have error handling for Claude API failures?
- `src/lib/anthropic.ts` — is the model hardcoded? Is there a timeout?
- Any `console.log` with sensitive data? Search: `grep -rn "console.log" src/app/api/`

## Step 8 — Report

Output a clean ship report:

```
Pre-Ship Report — observer-ai
==============================

TypeScript:  ✓ PASS  /  ✗ FAIL (N errors)
Lint:        ✓ PASS  /  ✗ FAIL (N warnings)
Auth:        ✓ All routes protected  /  ✗ N routes unprotected
Env vars:    ✓ All set  /  ✗ Missing: [LIST]
TODOs:       ✓ None in critical paths  /  ⚠ N found

Blockers (must fix before deploy):
  1. [description + file:line]

Warnings (should fix):
  1. [description + file:line]

Ready to ship: YES / NO
```

If there are blockers, do not mark ready to ship.
