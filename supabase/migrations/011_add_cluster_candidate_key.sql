-- Deterministic daily pipeline key for idempotent candidate persistence.
-- User decisions on approved/dismissed clusters are preserved by application
-- code; this column only lets active generated clusters be refreshed safely.

ALTER TABLE clusters
  ADD COLUMN IF NOT EXISTS candidate_key TEXT;

CREATE INDEX IF NOT EXISTS clusters_candidate_key_idx ON clusters(candidate_key);
