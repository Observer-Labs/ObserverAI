-- Persist the projected impact already produced by the analysis contract.
-- The application has written this field since the branch-scoped analysis flow,
-- but the database schema did not include the matching column.

ALTER TABLE clusters
  ADD COLUMN IF NOT EXISTS projected_impact TEXT;
