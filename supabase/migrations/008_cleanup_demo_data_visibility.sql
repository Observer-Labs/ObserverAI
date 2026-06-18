-- Keep demo data opt-in only.
-- Existing demo signals should not make a workspace look populated by default.

WITH demo_only_workspaces AS (
  SELECT DISTINCT demo.workspace_id
  FROM signals demo
  WHERE demo.channel = 'demo'
    AND NOT EXISTS (
      SELECT 1
      FROM signals real
      WHERE real.workspace_id = demo.workspace_id
        AND real.channel <> 'demo'
    )
)
DELETE FROM clusters
WHERE workspace_id IN (SELECT workspace_id FROM demo_only_workspaces)
  AND status = 'active';

DELETE FROM signals
WHERE channel = 'demo';
