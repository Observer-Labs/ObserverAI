import { NextResponse } from "next/server";
import { envErrorResponse, requireEnvGroup } from "@/env";

export async function GET() {
  let env: ReturnType<typeof requireEnvGroup<"slack">>;
  try {
    env = requireEnvGroup("slack");
  } catch (error) {
    return envErrorResponse(error) ?? NextResponse.json({ error: "Slack is not configured" }, { status: 503 });
  }

  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    redirect_uri: env.SLACK_REDIRECT_URI,
    scope: "channels:history,channels:read,groups:history,groups:read,users:read,chat:write",
    user_scope: "",
  });
  return NextResponse.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
}
