export const dynamic = "force-dynamic";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?error=auth_callback_error`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${siteUrl}/login?error=auth_callback_error`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login?error=auth_callback_error`);
  }

  // Ensure workspace exists (idempotent — existing users just get created:false)
  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("workspaces")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.redirect(`${siteUrl}/dashboard`);
  }

  // New OAuth user → create workspace + send to onboarding
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const wsName = meta.full_name || meta.name || user.email?.split("@")[0] || "My Workspace";
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const resetNext = new Date();
  resetNext.setMonth(resetNext.getMonth() + 1);
  resetNext.setDate(1);
  resetNext.setHours(0, 0, 0, 0);

  await admin.from("workspaces").insert({
    user_id: user.id,
    name: wsName,
    slack_monitored_channels: [],
    plan: "trial",
    trial_ends_at: trialEndsAt,
    analysis_count: 0,
    analysis_count_reset_at: resetNext.toISOString(),
    distribution_config: {
      slack: { enabled: false, channels: [], severity_threshold: "high", schedule: "instant" },
      whatsapp: { enabled: false, recipient_numbers: [], critical_only: true },
      email: { enabled: false, recipients: [], schedule: "daily" },
      auto_distribute: false,
    },
    integrations_config: {
      slack:    { enabled: false, max_age_days: 7, keyword_filter: "", last_sync: null },
      email:    { enabled: false, max_age_days: 7, sender_domains: "", last_sync: null },
      zendesk:  { enabled: false, subdomain: "", email: "", api_token: "", min_priority: "normal", exclude_closed: true, last_sync: null },
      intercom: { enabled: false, access_token: "", open_only: true, last_sync: null },
      jira:     { enabled: false, domain: "", email: "", api_token: "", project_key: "", min_priority: "low", exclude_done: true, issue_types: "", last_sync: null },
      appstore: { enabled: false, app_id_ios: "", app_id_android: "", max_rating: 3, last_sync: null },
      github:   { enabled: false, token: "", owner: "", repo: "", min_reactions: 0, labels: "", last_sync: null },
      reddit:   { enabled: false, client_id: "", client_secret: "", subreddits: "", min_score: 5, min_comments: 0, last_sync: null },
    },
  });

  return NextResponse.redirect(`${siteUrl}/onboarding/whatsapp`);
}
