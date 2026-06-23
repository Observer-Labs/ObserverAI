-- Admin management: replaces env-var based OBSERVER_ADMIN_EMAILS gate.
-- First admin is seeded manually via SQL; subsequent admins are managed
-- through the /admin UI by existing admins.

CREATE TABLE IF NOT EXISTS admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  added_by   TEXT,  -- email of the admin who added this entry (NULL for seed)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
