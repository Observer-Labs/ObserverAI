-- 019: Backfill workspaces.branch_limit
--
-- signup-workspace historically created workspaces without branch_limit,
-- leaving it NULL. The app layer treats NULL as "unlimited" (reserved for
-- enterprise), so every trial workspace could create unlimited branches.
-- Backfill existing rows from their plan and default new rows to the most
-- restrictive tier; the signup route and Polar webhook now set it explicitly.

ALTER TABLE workspaces ALTER COLUMN branch_limit SET DEFAULT 1;

UPDATE workspaces SET branch_limit = 1  WHERE branch_limit IS NULL AND plan = 'starter';
UPDATE workspaces SET branch_limit = 5  WHERE branch_limit IS NULL AND plan = 'growth';
UPDATE workspaces SET branch_limit = 20 WHERE branch_limit IS NULL AND plan = 'scale';

-- trial, expired and any unrecognized plan fall back to the trial limit.
-- Enterprise keeps NULL (= unlimited) intentionally.
UPDATE workspaces
SET branch_limit = 1
WHERE branch_limit IS NULL
  AND (plan IS NULL OR plan <> 'enterprise');
