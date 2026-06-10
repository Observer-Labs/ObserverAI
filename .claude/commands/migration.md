---
description: Create a new numbered Supabase migration for observer-ai. Handles schema changes, RLS policies, and indexes.
argument-hint: Describe the schema change (e.g. "add user_id to clusters", "add api_keys table")
allowed-tools: Read, Write, Bash(ls:*)
---

# Create Supabase Migration

You are creating a new Supabase migration for observer-ai.

**Change requested:** $ARGUMENTS

## Current state

- Existing migrations: !`ls supabase/migrations/`
- Latest migration content: !`cat supabase/migrations/$(ls supabase/migrations/ | tail -1)`

## Your task

### Step 1 — Understand the change
If $ARGUMENTS is empty or vague, ask the user to describe:
- What tables are being added or modified?
- What columns are being added/changed/dropped?
- Are there any foreign keys or indexes needed?
- Does this affect RLS policies?

### Step 2 — Determine the next migration number
Look at existing migrations (e.g. `001_initial_schema.sql`, `002_add_integrations.sql`). The next number is the highest existing number + 1, zero-padded to 3 digits.

Read the latest migration to understand existing schema conventions (column naming, constraint naming, index naming patterns).

### Step 3 — Write the migration file

Create `supabase/migrations/<NNN>_<slug>.sql` where `<slug>` is a snake_case description of the change.

Follow these conventions from the existing migrations:
- Use `IF NOT EXISTS` for new tables
- Use `IF EXISTS` / `IF NOT EXISTS` for column additions to be idempotent
- Include RLS: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
- Add workspace-scoped RLS policies: users can only see rows where `workspace_id` matches their workspace
- Add indexes for foreign keys and frequently filtered columns
- Use `uuid` for IDs with `gen_random_uuid()` default
- Use `timestamptz` for timestamps with `now()` default

Template for a new table:
```sql
-- Migration: <NNN>_<slug>
-- Description: <what this does>

CREATE TABLE IF NOT EXISTS <table_name> (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- ... your columns ...
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table_name>_workspace_isolation" ON <table_name>
  USING (workspace_id = (current_setting('app.workspace_id'))::uuid);

CREATE INDEX IF NOT EXISTS <table_name>_workspace_id_idx ON <table_name>(workspace_id);
```

Template for altering an existing table:
```sql
-- Migration: <NNN>_<slug>
-- Description: <what this does>

ALTER TABLE <table_name>
  ADD COLUMN IF NOT EXISTS <column> <type> <constraints>;
```

### Step 4 — Report
Tell the user:
- The file path created
- A plain-English summary of what the migration does
- Any manual steps needed (e.g. update `src/lib/types.ts` to reflect schema changes, update Supabase client queries)
- How to apply it: `supabase db push` or `supabase migration up`
