-- ─── Migration 003: Auth + RLS ────────────────────────────────────────────────
-- Add user_id to workspaces so each workspace is owned by one Supabase Auth user

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Ensure one workspace per user
ALTER TABLE workspaces
  DROP CONSTRAINT IF EXISTS workspaces_user_id_unique;

ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_user_id_unique UNIQUE (user_id);

-- ─── Enable Row Level Security ────────────────────────────────────────────────
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- ─── Drop old policies if re-running ────────────────────────────────────────
DROP POLICY IF EXISTS "workspace_owner"         ON workspaces;
DROP POLICY IF EXISTS "signals_via_workspace"   ON signals;
DROP POLICY IF EXISTS "clusters_via_workspace"  ON clusters;
DROP POLICY IF EXISTS "deliveries_via_workspace" ON deliveries;

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
-- Users can only see/modify their own workspace
CREATE POLICY "workspace_owner" ON workspaces
  FOR ALL USING (user_id = auth.uid());

-- Users can only see signals belonging to their workspace
CREATE POLICY "signals_via_workspace" ON signals
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

-- Users can only see clusters belonging to their workspace
CREATE POLICY "clusters_via_workspace" ON clusters
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

-- Users can only see deliveries belonging to their workspace's clusters
CREATE POLICY "deliveries_via_workspace" ON deliveries
  FOR ALL USING (
    cluster_id IN (
      SELECT c.id FROM clusters c
      JOIN workspaces w ON c.workspace_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

-- NOTE: The service_role key (used in API routes via supabaseAdmin) bypasses RLS automatically.
-- RLS only applies to anon/authenticated keys. No changes needed to API code for this.

-- ─── Backfill Instructions ────────────────────────────────────────────────────
-- After creating your first account, run this to link the dev workspace:
--   UPDATE workspaces
--   SET user_id = '<paste-your-user-uuid-here>'
--   WHERE id = '00000000-0000-0000-0000-000000000001';
-- Your user UUID is visible in Supabase → Authentication → Users
