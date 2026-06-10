-- 006_add_output_config.sql
-- Stores optional outbound output integrations such as Jira, Notion, and Google Docs.

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS output_config JSONB DEFAULT '{
    "notion": {"enabled":false,"api_key":"","database_id":""},
    "jira": {"enabled":false,"domain":"","email":"","api_token":"","project_key":""},
    "google_docs": {"enabled":false,"service_account_key":"","folder_id":""}
  }';

UPDATE workspaces
SET output_config = '{
  "notion": {"enabled":false,"api_key":"","database_id":""},
  "jira": {"enabled":false,"domain":"","email":"","api_token":"","project_key":""},
  "google_docs": {"enabled":false,"service_account_key":"","folder_id":""}
}'::jsonb
WHERE output_config IS NULL;
