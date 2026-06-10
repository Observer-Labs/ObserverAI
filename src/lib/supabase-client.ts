import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase instance using @supabase/ssr.
// createBrowserClient stores session tokens in cookies (not localStorage)
// so they're visible to Next.js middleware and server-side API routes.
// PKCE flow (default) is required for Google OAuth — do not override flowType.
export const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key",
);
