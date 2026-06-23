export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminEmail } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("admins")
    .select("id, email, added_by, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ admins: data });
}

export async function POST(req: NextRequest) {
  let callerEmail: string | null;
  try {
    await requireAdmin();
    callerEmail = await getAdminEmail();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email } = await req.json().catch(() => ({})) as { email?: string };
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("admins")
    .insert({ email: email.toLowerCase().trim(), added_by: callerEmail });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already an admin" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  let callerEmail: string | null;
  try {
    await requireAdmin();
    callerEmail = await getAdminEmail();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email } = await req.json().catch(() => ({})) as { email?: string };
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  if (email.toLowerCase() === callerEmail?.toLowerCase()) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("admins")
    .delete()
    .eq("email", email.toLowerCase());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
