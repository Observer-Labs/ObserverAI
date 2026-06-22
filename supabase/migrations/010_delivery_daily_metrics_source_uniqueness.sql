-- Make delivery daily metrics idempotent per concrete source.
-- The previous key was branch+platform+date only, which blocks multiple
-- same-platform sources under one branch.

ALTER TABLE delivery_daily_metrics
  DROP CONSTRAINT IF EXISTS delivery_daily_metrics_workspace_id_branch_id_platform_metric_date_key;

ALTER TABLE delivery_daily_metrics
  ADD CONSTRAINT delivery_daily_metrics_workspace_branch_source_platform_date_key
  UNIQUE NULLS NOT DISTINCT (workspace_id, branch_id, source_id, platform, metric_date);
