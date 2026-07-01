-- password_reset_tokens is server-only. It must never be reachable through
-- the public Data API with anon/authenticated credentials.
-- Server routes use the service role key which bypasses RLS.

REVOKE ALL PRIVILEGES ON TABLE public.password_reset_tokens FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.password_reset_tokens FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.password_reset_tokens FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.password_reset_tokens TO service_role;
