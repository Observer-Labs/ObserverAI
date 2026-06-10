export const dynamic = "force-dynamic";
import { Webhooks } from "@polar-sh/nextjs";
import { updateWorkspaceBilling, getWorkspaceIdByEmail } from "@/lib/supabase";

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Resolve workspace ID from the subscription payload.
 * Primary source: metadata.workspace_id (set when checkout was created).
 * Fallback: look up workspace by customer email.
 */
async function resolveWorkspaceId(
  metadata: Record<string, unknown>,
  customerEmail: string,
): Promise<string | null> {
  const fromMeta = metadata?.["workspace_id"];
  if (typeof fromMeta === "string" && fromMeta) return fromMeta;
  return getWorkspaceIdByEmail(customerEmail);
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onSubscriptionCreated: async ({ data }) => {
    const wid = await resolveWorkspaceId(
      data.metadata as Record<string, unknown>,
      data.customer.email,
    );
    if (!wid) return;

    await updateWorkspaceBilling(wid, {
      plan: "pro",
      polar_subscription_id: data.id,
      polar_customer_id: data.customerId,
      polar_status: "active",
      polar_renews_at: data.currentPeriodEnd?.toISOString() ?? undefined,
    });
  },

  onSubscriptionActive: async ({ data }) => {
    const wid = await resolveWorkspaceId(
      data.metadata as Record<string, unknown>,
      data.customer.email,
    );
    if (!wid) return;

    await updateWorkspaceBilling(wid, {
      plan: "pro",
      polar_status: "active",
      polar_renews_at: data.currentPeriodEnd?.toISOString() ?? undefined,
    });
  },

  onSubscriptionUpdated: async ({ data }) => {
    const wid = await resolveWorkspaceId(
      data.metadata as Record<string, unknown>,
      data.customer.email,
    );
    if (!wid) return;

    await updateWorkspaceBilling(wid, {
      polar_status: data.status,
      polar_renews_at: data.currentPeriodEnd?.toISOString() ?? undefined,
    });
  },

  onSubscriptionCanceled: async ({ data }) => {
    const wid = await resolveWorkspaceId(
      data.metadata as Record<string, unknown>,
      data.customer.email,
    );
    if (!wid) return;

    // endsAt is when access actually ends; fall back to currentPeriodEnd
    await updateWorkspaceBilling(wid, {
      polar_status: "cancelled",
      polar_ends_at:
        (data.endsAt ?? data.currentPeriodEnd)?.toISOString() ?? undefined,
    });
  },

  onSubscriptionRevoked: async ({ data }) => {
    const wid = await resolveWorkspaceId(
      data.metadata as Record<string, unknown>,
      data.customer.email,
    );
    if (!wid) return;

    await updateWorkspaceBilling(wid, {
      plan: "expired",
      polar_status: "expired",
    });
  },

  onSubscriptionUncanceled: async ({ data }) => {
    const wid = await resolveWorkspaceId(
      data.metadata as Record<string, unknown>,
      data.customer.email,
    );
    if (!wid) return;

    await updateWorkspaceBilling(wid, {
      plan: "pro",
      polar_status: "active",
    });
  },
});
