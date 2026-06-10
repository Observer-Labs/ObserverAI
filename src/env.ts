import { z } from "zod";

export class EnvValidationError extends Error {
  constructor(
    public readonly feature: string,
    public readonly missing: string[],
  ) {
    super(`${feature} is not configured. Missing env vars: ${missing.join(", ")}`);
    this.name = "EnvValidationError";
  }
}

const envValue = z.string().trim().min(1);
const urlValue = envValue.url();

const ENV_GROUPS = {
  core: {
    label: "Core app runtime",
    required: {
      ANTHROPIC_API_KEY: envValue,
      SUPABASE_URL: urlValue,
      SUPABASE_ANON_KEY: envValue,
      SUPABASE_SERVICE_KEY: envValue,
      NEXT_PUBLIC_SUPABASE_URL: urlValue,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: envValue,
      NEXTAUTH_URL: urlValue,
      NEXTAUTH_SECRET: envValue,
    },
  },
  operations: {
    label: "Production operations",
    required: {
      CRON_SECRET: envValue,
      NEXT_PUBLIC_SITE_URL: urlValue,
    },
  },
  slack: {
    label: "Slack OAuth and webhooks",
    required: {
      SLACK_CLIENT_ID: envValue,
      SLACK_CLIENT_SECRET: envValue,
      SLACK_SIGNING_SECRET: envValue,
      SLACK_REDIRECT_URI: urlValue,
    },
  },
  email: {
    label: "Outbound email",
    required: {
      EMAIL_HOST: envValue,
      EMAIL_PORT: envValue,
      EMAIL_USER: envValue,
      EMAIL_PASS: envValue,
    },
  },
  gmail: {
    label: "Gmail ingest OAuth",
    required: {
      GMAIL_CLIENT_ID: envValue,
      GMAIL_CLIENT_SECRET: envValue,
    },
  },
  whatsapp: {
    label: "WhatsApp via Meta Cloud API",
    required: {
      META_WHATSAPP_ACCESS_TOKEN: envValue,
      META_WHATSAPP_PHONE_NUMBER_ID: envValue,
      META_WHATSAPP_BUSINESS_ACCOUNT_ID: envValue,
      META_WHATSAPP_VERIFY_TOKEN: envValue,
      META_APP_SECRET: envValue,
    },
  },
  polar: {
    label: "Polar billing",
    required: {
      POLAR_ACCESS_TOKEN: envValue,
      POLAR_PRODUCT_ID: envValue,
      POLAR_WEBHOOK_SECRET: envValue,
      POLAR_SUCCESS_URL: urlValue,
    },
  },
} as const;

type EnvGroup = keyof typeof ENV_GROUPS;
type EnvShape<G extends EnvGroup> = Record<keyof typeof ENV_GROUPS[G]["required"], string>;

function missingFor(group: EnvGroup): string[] {
  const schema = z.object(ENV_GROUPS[group].required);
  const result = schema.safeParse(process.env);
  if (result.success) return [];
  return result.error.issues.map((issue) => String(issue.path[0]));
}

export function getEnvStatus() {
  return Object.entries(ENV_GROUPS).map(([key, group]) => {
    const missing = missingFor(key as EnvGroup);
    return {
      key,
      label: group.label,
      configured: missing.length === 0,
      missing,
    };
  });
}

export function requireEnvGroup<G extends EnvGroup>(group: G): EnvShape<G> {
  const missing = missingFor(group);
  if (missing.length > 0) {
    throw new EnvValidationError(ENV_GROUPS[group].label, missing);
  }

  const values: Record<string, string> = {};
  for (const key of Object.keys(ENV_GROUPS[group].required)) {
    values[key] = process.env[key]!;
  }
  return values as EnvShape<G>;
}

export function envErrorResponse(error: unknown): Response | null {
  if (!(error instanceof EnvValidationError)) return null;

  return Response.json(
    {
      error: "Environment is not configured",
      feature: error.feature,
      missing: error.missing,
    },
    { status: 503 },
  );
}
