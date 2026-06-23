export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getSupabaseAdmin();

  const [
    { count: workspaceCount },
    { data: planRows },
    { data: recentWorkspaces },
    { data: deliveryStats },
    { data: tokenRows },
    { count: signalCount },
    { count: clusterCount },
    { data: failedDeliveries },
  ] = await Promise.all([
    db.from("workspaces").select("id", { count: "exact", head: true }),
    db.from("workspaces").select("plan"),
    db.from("workspaces").select("id, name, plan, analysis_count, created_at, trial_ends_at, polar_status, user_id").order("created_at", { ascending: false }).limit(50),
    db.from("deliveries").select("status"),
    db.from("token_usage").select("input_tokens, output_tokens").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    db.from("signals").select("id", { count: "exact", head: true }),
    db.from("clusters").select("id", { count: "exact", head: true }),
    db.from("deliveries").select("id", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  const planDistribution = (planRows ?? []).reduce<Record<string, number>>((acc, row) => {
    const plan = row.plan ?? "trial";
    acc[plan] = (acc[plan] ?? 0) + 1;
    return acc;
  }, {});

  const deliveryStatusCounts = (deliveryStats ?? []).reduce<Record<string, number>>((acc, row) => {
    const s = row.status ?? "unknown";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const totalInputTokens = (tokenRows ?? []).reduce((sum, row) => sum + (row.input_tokens ?? 0), 0);
  const totalOutputTokens = (tokenRows ?? []).reduce((sum, row) => sum + (row.output_tokens ?? 0), 0);

  // Build user_id → email map by fetching auth users in bulk
  const workspaces = recentWorkspaces ?? [];
  const userIds = [...new Set(workspaces.map((w) => w.user_id).filter(Boolean))];
  const emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    try {
      const { data: usersPage } = await db.auth.admin.listUsers({ perPage: 1000 });
      for (const u of usersPage?.users ?? []) {
        if (u.email) emailMap[u.id] = u.email;
      }
    } catch { /* non-fatal */ }
  }

  const customers = workspaces.map(({ user_id, ...ws }) => ({
    ...ws,
    email: user_id ? (emailMap[user_id] ?? undefined) : undefined,
  }));

  return NextResponse.json({
    overview: {
      workspaceCount: workspaceCount ?? 0,
      signalCount: signalCount ?? 0,
      clusterCount: clusterCount ?? 0,
      failedDeliveries: (failedDeliveries as unknown as { count: number } | null)?.count ?? 0,
    },
    planDistribution,
    customers,
    delivery: deliveryStatusCounts,
    tokenUsage30d: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    },
  });
}
