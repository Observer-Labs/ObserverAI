-- Observer AI - Migration 002: Add integrations_config
-- Run this in your Supabase SQL editor

-- Step 1: Add integrations_config column to workspaces
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS integrations_config JSONB DEFAULT '{
    "zendesk":  {"enabled":false,"subdomain":"","email":"","api_token":"","last_sync":null},
    "intercom": {"enabled":false,"access_token":"","last_sync":null},
    "jira":     {"enabled":false,"domain":"","email":"","api_token":"","project_key":"","last_sync":null},
    "appstore": {"enabled":false,"app_id_ios":"","app_id_android":"","last_sync":null},
    "github":   {"enabled":false,"token":"","owner":"","repo":"","last_sync":null},
    "reddit":   {"enabled":false,"client_id":"","client_secret":"","subreddits":"","last_sync":null}
  }';

-- Step 2: Widen the signals.source CHECK constraint
ALTER TABLE signals DROP CONSTRAINT IF EXISTS signals_source_check;
ALTER TABLE signals ADD CONSTRAINT signals_source_check
  CHECK (source IN (
    'slack', 'email', 'whatsapp',
    'zendesk', 'intercom', 'jira',
    'appstore', 'github', 'reddit'
  ));

-- Step 3: Backfill existing rows that have NULL
UPDATE workspaces
SET integrations_config = '{
  "zendesk":  {"enabled":false,"subdomain":"","email":"","api_token":"","last_sync":null},
  "intercom": {"enabled":false,"access_token":"","last_sync":null},
  "jira":     {"enabled":false,"domain":"","email":"","api_token":"","project_key":"","last_sync":null},
  "appstore": {"enabled":false,"app_id_ios":"","app_id_android":"","last_sync":null},
  "github":   {"enabled":false,"token":"","owner":"","repo":"","last_sync":null},
  "reddit":   {"enabled":false,"client_id":"","client_secret":"","subreddits":"","last_sync":null}
}'::jsonb
WHERE integrations_config IS NULL;
