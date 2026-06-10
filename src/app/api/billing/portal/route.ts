export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { CustomerPortal } from "@polar-sh/nextjs";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { getWorkspace } from "@/lib/supabase";
import { envErrorResponse, requireEnvGroup } from "@/env";

export async function GET(req: NextRequest) {
  let coreEnv: ReturnType<typeof requireEnvGroup<"core">>;
  let polarEnv: ReturnType<typeof requireEnvGroup<"polar">>;
  try {
    coreEnv = requireEnvGroup("core");
    polarEnv = requireEnvGroup("polar");
  } catch (error) {
    return envErrorResponse(error) ?? NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  }

  const base = coreEnv.NEXTAUTH_URL;

  // Auth-gate
  let wid: string;
  try {
    wid = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.redirect(new URL("/login", base));
  }

  const workspace = await getWorkspace(wid);

  // No subscription yet, send to checkout instead
  if (!workspace.polar_customer_id) {
    return NextResponse.redirect(new URL("/api/billing/checkout", base));
  }

  const customerId = workspace.polar_customer_id;

  // Build the portal handler with the customer ID resolved server-side
  const portalHandler = CustomerPortal({
    accessToken: polarEnv.POLAR_ACCESS_TOKEN,
    server: "production",
    getCustomerId: async () => customerId,
  });

  return portalHandler(req);
}
