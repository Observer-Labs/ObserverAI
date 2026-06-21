-- 012_add_source_auth_refs.sql
-- Source auth metadata points to external vault records; it never stores
-- partner auth material directly.

CREATE TABLE IF NOT EXISTS source_auth_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  vault_ref TEXT NOT NULL,
  required_fields TEXT[] NOT NULL DEFAULT '{}'::text[],
  provided_fields TEXT[] NOT NULL DEFAULT '{}'::text[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'error', 'revoked')),
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source_id, provider),
  CHECK (array_length(provided_fields, 1) IS NULL OR provided_fields <@ required_fields)
);

CREATE INDEX IF NOT EXISTS source_auth_refs_workspace_idx ON source_auth_refs(workspace_id);
CREATE INDEX IF NOT EXISTS source_auth_refs_source_idx ON source_auth_refs(source_id);
CREATE INDEX IF NOT EXISTS source_auth_refs_provider_idx ON source_auth_refs(provider);
CREATE INDEX IF NOT EXISTS source_auth_refs_status_idx ON source_auth_refs(status);

DROP TRIGGER IF EXISTS source_auth_refs_updated_at ON source_auth_refs;
CREATE TRIGGER source_auth_refs_updated_at BEFORE UPDATE ON source_auth_refs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE source_auth_refs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "source_auth_refs_via_workspace" ON source_auth_refs;
CREATE POLICY "source_auth_refs_via_workspace" ON source_auth_refs
  FOR ALL USING (
    is_workspace_member(workspace_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE source_auth_refs TO authenticated;
