export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/auth/signup-workspace
 * Called by the signup page after supabase.auth.signUp() succeeds.
 * Uses the admin client to confirm the userId actually exists in auth.users ,
 * this is safe because Supabase auth is the only source of valid user IDs,
 * and email-confirmation flows do not create a session cookie, so cookie-based
 * verification would always fail.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceName } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    // workspaceName is optional (OAuth signups have no business name yet ,
    // they'll set it in onboarding). Fall back to a sensible default.
    const wsName: string = (typeof workspaceName === "string" && workspaceName.trim())
      ? workspaceName.trim()
      : "My Workspace";

    // Basic format guard before hitting the DB
    if (!UUID_RE.test(userId)) {
      return NextResponse.json({ error: "Invalid userId format" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Confirm the user actually exists in Supabase Auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !authUser || authUser.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-confirm the user's email so they can sign in immediately without
    // waiting for a confirmation email (Supabase free tier limits 3 emails/hour).
    if (!authUser.email_confirmed_at) {
      await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
    }

    // Check workspace doesn't already exist for this user
    const { data: existing } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      return NextResponse.json({ workspaceId: existing.id, created: false });
    }

    // Compute trial / billing defaults
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const resetNext = new Date();
    resetNext.setMonth(resetNext.getMonth() + 1);
    resetNext.setDate(1);
    resetNext.setHours(0, 0, 0, 0);

    // Create workspace with default config
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({
        user_id: userId,
        name: wsName,
        slack_monitored_channels: [],
        // Billing
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
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating workspace:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workspaceId: workspace.id, created: true });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
