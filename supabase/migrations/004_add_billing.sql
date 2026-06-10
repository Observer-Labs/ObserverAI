-- 004_add_billing.sql
-- Adds Polar billing / plan columns to workspaces

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS polar_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS polar_order_id TEXT,
  ADD COLUMN IF NOT EXISTS polar_status TEXT,
  ADD COLUMN IF NOT EXISTS polar_renews_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS polar_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analysis_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS analysis_count_reset_at TIMESTAMPTZ
    DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month';

-- Backfill: give existing workspaces a full 14-day trial from today
UPDATE workspaces
SET trial_ends_at = NOW() + INTERVAL '14 days'
WHERE trial_ends_at IS NULL;
