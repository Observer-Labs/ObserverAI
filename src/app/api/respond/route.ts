export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * One-click email approve/reject.
 * URL: /api/respond?id=<deliveryId>&action=approve|reject
 * No login required, delivery ID acts as a signed token.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const action = searchParams.get("action");

  if (!id || !["approve", "reject"].includes(action ?? "")) {
    return new NextResponse(errorPage("Invalid link"), { status: 400, headers: { "Content-Type": "text/html" } });
  }

  // Look up the delivery record
  const { data: delivery, error } = await supabaseAdmin
    .from("deliveries")
    .select("id, cluster_id, status")
    .eq("id", id)
    .single();

  if (error || !delivery) {
    return new NextResponse(errorPage("This link is invalid or has expired."), { status: 404, headers: { "Content-Type": "text/html" } });
  }

  // Idempotent, already actioned
  if (delivery.status === "approved" || delivery.status === "rejected") {
    return new NextResponse(
      confirmPage(delivery.status as "approved" | "rejected", delivery.cluster_id, true),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  // Update delivery status
  await supabaseAdmin
    .from("deliveries")
    .update({ status: newStatus, response: `${newStatus} via email link` })
    .eq("id", id);

  // Update cluster status
  await supabaseAdmin
    .from("clusters")
    .update({ status: newStatus === "approved" ? "approved" : "dismissed" })
    .eq("id", delivery.cluster_id);

  return new NextResponse(
    confirmPage(newStatus, delivery.cluster_id, false),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function confirmPage(
  status: "approved" | "rejected",
  clusterId: string,
  alreadyDone: boolean
): string {
  const isApproved = status === "approved";
  const color = isApproved ? "#46e6a6" : "#ff5c7a";
  const emoji = isApproved ? "✅" : "❌";
  const label = isApproved ? "Approved" : "Rejected";
  const headline = alreadyDone
    ? `Already ${label}`
    : `Intent Gap ${label}`;
  const subtext = alreadyDone
    ? "This gap has already been actioned."
    : isApproved
    ? "This intent gap has been marked for action. Your team will be notified."
    : "This intent gap has been dismissed. No further action will be taken.";

  const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard?gap=${clusterId}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Observer, ${label}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0b0c10; font-family: -apple-system, Inter, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #121526; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 48px 40px; max-width: 420px; width: 100%; text-align: center; }
    .icon { font-size: 3rem; margin-bottom: 20px; }
    h1 { color: ${color}; font-size: 1.5rem; font-weight: 800; margin-bottom: 12px; }
    p { color: #9aa3b2; font-size: 0.9rem; line-height: 1.65; margin-bottom: 28px; }
    a { display: inline-block; background: ${color}; color: #0b0c10; padding: 10px 24px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 0.85rem; }
    .brand { margin-top: 32px; font-size: 0.72rem; color: rgba(255,255,255,0.2); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${emoji}</div>
    <h1>${headline}</h1>
    <p>${subtext}</p>
    <a href="${dashboardUrl}">View in Observer →</a>
    <div class="brand">Observer · Product Intelligence</div>
  </div>
</body>
</html>`;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Observer, Error</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0b0c10; font-family: -apple-system, Inter, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #121526; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 48px 40px; max-width: 420px; width: 100%; text-align: center; }
    h1 { color: #ff5c7a; font-size: 1.3rem; font-weight: 700; margin-bottom: 12px; }
    p { color: #9aa3b2; font-size: 0.88rem; line-height: 1.65; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚠️ Something went wrong</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
