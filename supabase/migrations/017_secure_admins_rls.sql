-- The admins table is server-only. It contains privileged account emails and
-- must never be reachable through the public Data API with anon/authenticated
-- credentials. Server routes use the service role.

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.admins FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.admins FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.admins FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admins TO service_role;
