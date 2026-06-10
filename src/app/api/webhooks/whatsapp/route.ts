export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { parseInboundWhatsApp } from "@/lib/whatsapp";
import { getSupabaseAdmin } from "@/lib/supabase";
import twilio from "twilio";

// Twilio webhook verification (GET challenge)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get("hub.challenge");
  return new NextResponse(challenge ?? "ok", { status: 200 });
}

export async function POST(req: NextRequest) {
  // Workspace ID must be in query string, user sets it in Twilio webhook URL
  // e.g. https://observerai.app/api/webhooks/whatsapp?workspaceId=<id>
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return new NextResponse("Missing workspaceId", { status: 400 });
  }

  // Parse form-encoded Twilio webhook payload (must happen before any other await)
  const text = await req.text();
  const params = Object.fromEntries(new URLSearchParams(text));

  // Verify Twilio signature (skip in dev if token not set)
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  if (twilioAuthToken) {
    const sig = req.headers.get("x-twilio-signature") ?? "";
    const url = `${process.env.NEXTAUTH_URL}/api/webhooks/whatsapp?workspaceId=${workspaceId}`;
    const isValid = twilio.validateRequest(twilioAuthToken, sig, url, params);
    if (!isValid) {
      return new NextResponse("Invalid signature", { status: 403 });
    }
  }

  // Validate workspace exists
  const supabase = getSupabaseAdmin();
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .single();

  if (!ws) {
    return new NextResponse("Invalid workspaceId", { status: 404 });
  }

  const signal = parseInboundWhatsApp(params);

  await supabase.from("signals").insert({
    workspace_id: workspaceId,
    source: "whatsapp",
    channel: "whatsapp",
    sender: signal.sender,
    content: signal.content,
    timestamp: signal.timestamp,
    reviewed: false,
  });

  // Respond with empty TwiML (Twilio expects XML 200)
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
