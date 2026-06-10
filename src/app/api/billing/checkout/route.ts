export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { Checkout } from "@polar-sh/nextjs";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
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
  const checkoutHandler = Checkout({
    accessToken: polarEnv.POLAR_ACCESS_TOKEN,
    successUrl: polarEnv.POLAR_SUCCESS_URL,
    server: "production",
  });

  // Auth-gate: must be a signed-in user with a workspace
  let wid: string;
  try {
    wid = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.redirect(new URL("/login", base));
  }

  // Try to pre-fill the Polar checkout form with the user's email
  let email: string | undefined;
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    email = user?.email ?? undefined;
  } catch {
    // Non-fatal, proceed without email
  }

  // Inject server-side params into the request URL so the SDK handler
  // picks them up (it reads ?products=, ?metadata=, ?customerEmail=)
  const url = new URL(req.url);
  url.searchParams.set("products", polarEnv.POLAR_PRODUCT_ID);
  url.searchParams.set("metadata", JSON.stringify({ workspace_id: wid }));
  if (email) url.searchParams.set("customerEmail", email);

  const syntheticReq = new NextRequest(url, { headers: req.headers });
  return checkoutHandler(syntheticReq);
}
