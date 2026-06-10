// One-off: create confirmed Supabase auth users + workspaces for the team.
// Run: node scripts/create-team-logins.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Load .env.local
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);

const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY"); process.exit(1); }

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const PASSWORD = process.env.TEAM_PASSWORD || env.TEAM_PASSWORD;
if (!PASSWORD) { console.error("Set TEAM_PASSWORD env var before running this script."); process.exit(1); }
const PEOPLE = [
  { email: "halil@observerai.app", name: "Halil İbrahim Çakıroğlu", workspace: "Halil — Observer" },
  { email: "kadir@observerai.app", name: "Kadir Can Tüfek",          workspace: "Kadir — Observer" },
];

function workspaceDefaults(userId, name) {
  const trialEndsAt = new Date(Date.now() + 14 * 864e5).toISOString();
  const resetNext = new Date(); resetNext.setMonth(resetNext.getMonth() + 1); resetNext.setDate(1); resetNext.setHours(0, 0, 0, 0);
  return {
    user_id: userId, name,
    slack_monitored_channels: [],
    plan: "trial", trial_ends_at: trialEndsAt,
    analysis_count: 0, analysis_count_reset_at: resetNext.toISOString(),
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
  };
}

async function findUserByEmail(email) {
  // paginate listUsers
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 200) break;
  }
  return null;
}

for (const p of PEOPLE) {
  let user = await findUserByEmail(p.email);
  if (user) {
    // reset password + ensure confirmed
    await admin.auth.admin.updateUserById(user.id, { password: PASSWORD, email_confirm: true, user_metadata: { full_name: p.name } });
    console.log(`↻ updated ${p.email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: p.name },
    });
    if (error) { console.error(`✗ ${p.email}:`, error.message); continue; }
    user = data.user;
    console.log(`✓ created ${p.email}`);
  }

  // ensure workspace
  const { data: existing } = await admin.from("workspaces").select("id").eq("user_id", user.id).maybeSingle();
  if (existing) {
    console.log(`  · workspace exists (${existing.id})`);
  } else {
    const { data: ws, error: wErr } = await admin.from("workspaces").insert(workspaceDefaults(user.id, p.workspace)).select("id").single();
    if (wErr) console.error(`  ✗ workspace:`, wErr.message);
    else console.log(`  · workspace created (${ws.id})`);
  }
}

console.log("\nTeam login users are ready. Password was read from TEAM_PASSWORD and was not printed.");
