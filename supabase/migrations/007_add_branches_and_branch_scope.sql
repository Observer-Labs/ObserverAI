-- 007_add_branches_and_branch_scope.sql
-- Observer v2 foundation: workspace -> branch -> source/signal/cluster.

-- ─── Workspace membership + plan branch limits ───────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, user_id, 'owner'
FROM workspaces
WHERE user_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS branch_limit INTEGER;

UPDATE workspaces
SET branch_limit = CASE plan
  WHEN 'starter' THEN 1
  WHEN 'growth' THEN 5
  WHEN 'scale' THEN 20
  WHEN 'enterprise' THEN NULL
  ELSE 1
END
WHERE branch_limit IS NULL;

-- ─── Branches ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Ana Şube',
  brand TEXT,
  district TEXT,
  city TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  baseline_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS branches_workspace_name_idx
  ON branches(workspace_id, name);
CREATE INDEX IF NOT EXISTS branches_workspace_idx ON branches(workspace_id);
CREATE INDEX IF NOT EXISTS branches_status_idx ON branches(status);

DROP TRIGGER IF EXISTS branches_updated_at ON branches;
CREATE TRIGGER branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO branches (workspace_id, name, timezone, status)
SELECT w.id, 'Ana Şube', 'Europe/Istanbul', 'active'
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM branches b WHERE b.workspace_id = w.id
);

-- ─── Sources ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'google_reviews', 'googlereviews', 'getir', 'yemeksepeti', 'trendyol',
    'pos', 'ga4', 'googleanalytics', 'gmail', 'email', 'csv',
    'slack', 'whatsapp', 'zendesk', 'intercom', 'jira', 'appstore',
    'googleplay', 'github', 'reddit', 'shopify', 'trustpilot'
  )),
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('connected', 'pending', 'error')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  credentials JSONB,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sources_workspace_idx ON sources(workspace_id);
CREATE INDEX IF NOT EXISTS sources_branch_idx ON sources(branch_id);
CREATE INDEX IF NOT EXISTS sources_type_idx ON sources(type);
CREATE INDEX IF NOT EXISTS sources_status_idx ON sources(status);

-- ─── Signals branch/source scope ─────────────────────────────────────────────
ALTER TABLE signals
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS metric_name TEXT,
  ADD COLUMN IF NOT EXISTS metric_value NUMERIC;

UPDATE signals s
SET branch_id = b.id
FROM branches b
WHERE s.branch_id IS NULL
  AND b.workspace_id = s.workspace_id;

UPDATE signals
SET source_type = source
WHERE source_type IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM signals WHERE branch_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce signals.branch_id: existing signals without workspace/default branch remain';
  END IF;
END $$;

ALTER TABLE signals
  ALTER COLUMN branch_id SET NOT NULL;

ALTER TABLE signals DROP CONSTRAINT IF EXISTS signals_source_check;
ALTER TABLE signals ADD CONSTRAINT signals_source_check
  CHECK (source IN (
    'slack', 'email', 'whatsapp',
    'zendesk', 'intercom', 'jira',
    'appstore', 'github', 'reddit',
    'googleplay', 'googleanalytics', 'shopify', 'trustpilot',
    'googlereviews', 'google_reviews', 'getir', 'yemeksepeti', 'trendyol',
    'pos', 'ga4', 'gmail', 'csv'
  ));

CREATE INDEX IF NOT EXISTS signals_branch_idx ON signals(branch_id);
CREATE INDEX IF NOT EXISTS signals_workspace_branch_idx ON signals(workspace_id, branch_id);
CREATE INDEX IF NOT EXISTS signals_source_id_idx ON signals(source_id);
CREATE INDEX IF NOT EXISTS signals_metric_idx ON signals(metric_name, timestamp DESC);

-- ─── Correlations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  primary_metric TEXT,
  correlated_signal_ids UUID[] NOT NULL DEFAULT '{}',
  hypothesis TEXT,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS correlations_workspace_idx ON correlations(workspace_id);
CREATE INDEX IF NOT EXISTS correlations_branch_idx ON correlations(branch_id);
CREATE INDEX IF NOT EXISTS correlations_window_idx ON correlations(window_start, window_end);

-- ─── Clusters branch/correlation scope ───────────────────────────────────────
ALTER TABLE clusters
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS root_cause TEXT,
  ADD COLUMN IF NOT EXISTS metric_delta NUMERIC,
  ADD COLUMN IF NOT EXISTS correlation_id UUID REFERENCES correlations(id) ON DELETE SET NULL;

UPDATE clusters c
SET branch_id = b.id
FROM branches b
WHERE c.branch_id IS NULL
  AND b.workspace_id = c.workspace_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM clusters WHERE branch_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce clusters.branch_id: existing clusters without workspace/default branch remain';
  END IF;
END $$;

ALTER TABLE clusters
  ALTER COLUMN branch_id SET NOT NULL;

ALTER TABLE clusters DROP CONSTRAINT IF EXISTS clusters_severity_label_check;
ALTER TABLE clusters ADD CONSTRAINT clusters_severity_label_check
  CHECK (severity_label IN ('critical', 'high', 'medium', 'low'));

ALTER TABLE clusters DROP CONSTRAINT IF EXISTS clusters_status_check;
ALTER TABLE clusters ADD CONSTRAINT clusters_status_check
  CHECK (status IN ('active', 'reviewed', 'actioned', 'approved', 'dismissed'));

CREATE INDEX IF NOT EXISTS clusters_branch_idx ON clusters(branch_id);
CREATE INDEX IF NOT EXISTS clusters_workspace_branch_idx ON clusters(workspace_id, branch_id);
CREATE INDEX IF NOT EXISTS clusters_correlation_idx ON clusters(correlation_id);

-- ─── Deliveries branch scope ─────────────────────────────────────────────────
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS decision TEXT CHECK (decision IN ('approved', 'dismissed', 'pending'));

UPDATE deliveries d
SET branch_id = c.branch_id
FROM clusters c
WHERE d.branch_id IS NULL
  AND d.cluster_id = c.id;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM deliveries WHERE branch_id IS NULL) THEN
    ALTER TABLE deliveries ALTER COLUMN branch_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS deliveries_branch_idx ON deliveries(branch_id);

-- ─── Token usage ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS token_usage_workspace_idx ON token_usage(workspace_id);
CREATE INDEX IF NOT EXISTS token_usage_branch_idx ON token_usage(branch_id);
CREATE INDEX IF NOT EXISTS token_usage_created_at_idx ON token_usage(created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_workspace_member(target_workspace_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspaces w
    WHERE w.id = target_workspace_id
      AND w.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = target_workspace_id
      AND wm.user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

DROP POLICY IF EXISTS "workspace_members_owner" ON workspace_members;
DROP POLICY IF EXISTS "workspace_owner" ON workspaces;
DROP POLICY IF EXISTS "signals_via_workspace" ON signals;
DROP POLICY IF EXISTS "clusters_via_workspace" ON clusters;
DROP POLICY IF EXISTS "deliveries_via_workspace" ON deliveries;
DROP POLICY IF EXISTS "branches_via_workspace" ON branches;
DROP POLICY IF EXISTS "sources_via_workspace" ON sources;
DROP POLICY IF EXISTS "correlations_via_workspace" ON correlations;
DROP POLICY IF EXISTS "token_usage_via_workspace" ON token_usage;

CREATE POLICY "workspace_members_owner" ON workspace_members
  FOR ALL USING (
    is_workspace_member(workspace_id)
  );

CREATE POLICY "workspace_owner" ON workspaces
  FOR ALL USING (
    is_workspace_member(id)
  );

CREATE POLICY "signals_via_workspace" ON signals
  FOR ALL USING (
    is_workspace_member(workspace_id)
  );

CREATE POLICY "clusters_via_workspace" ON clusters
  FOR ALL USING (
    is_workspace_member(workspace_id)
  );

CREATE POLICY "deliveries_via_workspace" ON deliveries
  FOR ALL USING (
    branch_id IN (
      SELECT b.id FROM branches b
      WHERE is_workspace_member(b.workspace_id)
    )
  );

CREATE POLICY "branches_via_workspace" ON branches
  FOR ALL USING (
    is_workspace_member(workspace_id)
  );

CREATE POLICY "sources_via_workspace" ON sources
  FOR ALL USING (
    is_workspace_member(workspace_id)
  );

CREATE POLICY "correlations_via_workspace" ON correlations
  FOR ALL USING (
    is_workspace_member(workspace_id)
  );

CREATE POLICY "token_usage_via_workspace" ON token_usage
  FOR ALL USING (
    is_workspace_member(workspace_id)
  );
