-- 013_source_auth_vault_rpc.sql
-- Server-side wrappers for source auth material stored in Supabase Vault.
-- App code stores only supabase-vault:// references in application tables.

CREATE SCHEMA IF NOT EXISTS vault;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.source_auth_vault_store(
  p_workspace_id UUID,
  p_source_id UUID,
  p_provider TEXT,
  p_secret JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id UUID;
  v_secret_name TEXT;
BEGIN
  IF p_workspace_id IS NULL OR p_source_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id and source_id are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sources
    WHERE id = p_source_id
      AND workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'Source not found';
  END IF;

  v_secret_name := 'source-auth-' || p_source_id::TEXT || '-' || regexp_replace(p_provider, '[^a-zA-Z0-9_-]', '-', 'g');

  SELECT vault.create_secret(
    p_secret::TEXT,
    v_secret_name,
    'Observer source auth material'
  )
  INTO v_secret_id;

  RETURN 'supabase-vault://source-auth/' || v_secret_id::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.source_auth_vault_read(
  p_vault_ref TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id UUID;
  v_secret TEXT;
BEGIN
  IF p_vault_ref !~ '^supabase-vault://source-auth/[0-9a-fA-F-]{36}$' THEN
    RAISE EXCEPTION 'Invalid source auth vault reference';
  END IF;

  v_secret_id := substring(p_vault_ref FROM '([0-9a-fA-F-]{36})$')::UUID;

  SELECT decrypted_secret
  INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = v_secret_id;

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Source auth secret not found';
  END IF;

  RETURN v_secret::JSONB;
END;
$$;

REVOKE ALL ON FUNCTION public.source_auth_vault_store(UUID, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.source_auth_vault_read(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.source_auth_vault_store(UUID, UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.source_auth_vault_read(TEXT) TO service_role;
