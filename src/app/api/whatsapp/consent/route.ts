export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { envErrorResponse } from "@/env";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizeWhatsAppNumber, sendWhatsAppConsentRequest } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { phone, locale } = (await req.json()) as { phone?: string; locale?: string };
  const recipient = normalizeWhatsAppNumber(phone ?? "");
  if (!recipient) {
    return NextResponse.json({ error: "Valid WhatsApp number is required" }, { status: 400 });
  }

  try {
    await sendWhatsAppConsentRequest(recipient, locale === "en" ? "en" : "tr");

    const supabase = getSupabaseAdmin();
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("whatsapp_config, distribution_config")
      .eq("id", workspaceId)
      .single();

    const whatsappConfig = (workspace?.whatsapp_config ?? {}) as Record<string, unknown>;
    const distributionConfig = (workspace?.distribution_config ?? {}) as Record<string, unknown>;
    const currentNumbers = Array.isArray(whatsappConfig.recipient_numbers)
      ? whatsappConfig.recipient_numbers.filter((value): value is string => typeof value === "string")
      : [];
    const numbers = Array.from(new Set([...currentNumbers, recipient]));

    await supabase
      .from("workspaces")
      .update({
        whatsapp_config: {
          ...whatsappConfig,
          enabled: true,
          webhook_verified: false,
          recipient_numbers: numbers,
          consent_requested_at: new Date().toISOString(),
          verified: false,
          opted_in: false,
        },
        distribution_config: {
          ...distributionConfig,
          whatsapp: {
            ...((distributionConfig.whatsapp as Record<string, unknown> | undefined) ?? {}),
            enabled: true,
            recipient_numbers: numbers,
            critical_only: false,
          },
        },
      })
      .eq("id", workspaceId);

    return NextResponse.json({ sent: true });
  } catch (error) {
    const envResponse = envErrorResponse(error);
    if (envResponse) return envResponse;

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WhatsApp consent request failed" },
      { status: 502 },
    );
  }
}
