export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getEnvStatus } from "@/env";

// Ops/debug endpoint: reports which env groups are complete (names only,
// never values). Admin-only — env variable names are still infrastructure
// intel that should not be public.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    groups: getEnvStatus(),
  });
}
