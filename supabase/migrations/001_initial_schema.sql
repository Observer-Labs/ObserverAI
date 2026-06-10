-- Observer AI - Initial Schema
-- Run this in your Supabase SQL editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Workspaces ───────────────────────────────────────────────────────────────
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Workspace',
  slack_token TEXT,
  slack_team_id TEXT,
  slack_bot_token TEXT,
  slack_monitored_channels TEXT[] DEFAULT '{}',
  gmail_token TEXT,
  gmail_refresh_token TEXT,
  whatsapp_config JSONB DEFAULT '{"enabled":false,"webhook_verified":false,"recipient_numbers":[],"critical_only":true}',
  distribution_config JSONB DEFAULT '{
    "slack":{"enabled":false,"channels":[],"severity_threshold":"high","schedule":"instant"},
    "whatsapp":{"enabled":false,"recipient_numbers":[],"critical_only":true},
    "email":{"enabled":false,"recipients":[],"schedule":"daily"}
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Signals ──────────────────────────────────────────────────────────────────
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('slack', 'email', 'whatsapp')),
  channel TEXT NOT NULL,
  sender TEXT,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  tags TEXT[] DEFAULT '{}',
  reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX signals_workspace_idx ON signals(workspace_id);
CREATE INDEX signals_source_idx ON signals(source);
CREATE INDEX signals_timestamp_idx ON signals(timestamp DESC);
CREATE INDEX signals_reviewed_idx ON signals(reviewed);

-- ─── Clusters (Intent Gaps) ───────────────────────────────────────────────────
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  severity INTEGER NOT NULL DEFAULT 0 CHECK (severity >= 0 AND severity <= 100),
  severity_label TEXT NOT NULL DEFAULT 'low' CHECK (severity_label IN ('high', 'medium', 'low')),
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  evidence_count INTEGER NOT NULL DEFAULT 0,
  source_breakdown JSONB NOT NULL DEFAULT '{"slack":0,"email":0,"whatsapp":0}',
  business_case TEXT,
  recommended_action TEXT,
  customer_quote TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX clusters_workspace_idx ON clusters(workspace_id);
CREATE INDEX clusters_severity_idx ON clusters(severity DESC);
CREATE INDEX clusters_status_idx ON clusters(status);

-- ─── Deliveries ───────────────────────────────────────────────────────────────
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('slack', 'whatsapp', 'email')),
  recipient TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending')),
  response TEXT
);

CREATE INDEX deliveries_cluster_idx ON deliveries(cluster_id);
CREATE INDEX deliveries_status_idx ON deliveries(status);

-- ─── Updated at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clusters_updated_at BEFORE UPDATE ON clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Row Level Security ────────────────────────────────────────────────────────
-- For simplicity, we use service key on server. Enable RLS for production.
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by server API routes with SUPABASE_SERVICE_KEY)
-- Add your own policies here if you need user-level auth

-- ─── Seed demo workspace ───────────────────────────────────────────────────────
INSERT INTO workspaces (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Workspace');
