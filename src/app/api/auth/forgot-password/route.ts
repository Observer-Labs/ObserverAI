export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createTransport, getEmailFrom } from "@/lib/email";

/**
 * POST /api/auth/forgot-password
 * Sends a password reset email using our own SMTP (Gmail), bypasses
 * Supabase's built-in email entirely (3 emails/hour free-tier limit).
 *
 * Body: { email: string }
 * Always returns 200 to avoid user enumeration.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: true }); // silent
    }

    const supabase = getSupabaseAdmin();

    // Look up the user by email
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) return NextResponse.json({ ok: true });

    const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase().trim());
    if (!user) return NextResponse.json({ ok: true }); // don't reveal existence

    // Generate a secure random token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing unused tokens for this user
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("used_at", null);

    // Insert new token
    const { error: insertErr } = await supabase
      .from("password_reset_tokens")
      .insert({ user_id: user.id, token, expires_at: expiresAt.toISOString() });

    if (insertErr) {
      console.error("Failed to insert reset token:", insertErr);
      return NextResponse.json({ ok: true });
    }

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://observerai.app";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send via our Gmail SMTP
    const transport = createTransport();
    const info = await transport.sendMail({
      from: getEmailFrom(),
      to: email,
      subject: "Reset your Observer password",
      html: `
        <div style="background:#0b0c10;padding:40px 24px;font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
          <div style="margin-bottom:32px">
            <span style="color:#f97316;font-weight:700;font-size:18px">Observer</span>
          </div>
          <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 12px">Reset your password</h2>
          <p style="color:#9aa3b2;font-size:14px;line-height:1.6;margin:0 0 28px">
            Someone requested a password reset for your Observer account. Click the button below to set a new password. This link expires in 1 hour.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#f97316;color:#000000;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:28px">
            Reset password →
          </a>
          <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0">
            If you didn't request this, you can ignore this email. Your password won't change.<br><br>
            Or copy this link: <span style="color:#9aa3b2">${resetUrl}</span>
          </p>
        </div>
      `,
      text: `Reset your Observer password\n\nClick here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    });
    console.log("forgot-password email sent", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("forgot-password error:", err);
    // Still return ok to avoid leaking info
    return NextResponse.json({ ok: true });
  }
}
