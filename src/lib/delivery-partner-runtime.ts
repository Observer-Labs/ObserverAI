import type {
  DeliveryAuthMaterialResolver,
} from "./delivery-partner-sync";
import type {
  DeliveryPartnerHttpClient,
  DeliveryPartnerHttpRequest,
} from "./delivery-partner-ingest";
import type { DeliveryConnectorProvider } from "./delivery-connectors";
import { resolveSourceAuthMaterialFromVault } from "./source-auth-secret-store";

export class DeliveryPartnerRuntimeError extends Error {
  status = 500;
}

const BASE_URL_ENV: Record<DeliveryConnectorProvider, string> = {
  getir: "GETIR_FOOD_API_BASE_URL",
  trendyol: "TRENDYOL_GO_API_BASE_URL",
};

export const envVaultResolver: DeliveryAuthMaterialResolver = {
  async resolve(ref) {
    const envName = parseEnvVaultRef(ref.vaultRef);
    const raw = process.env[envName];
    if (!raw) throw new DeliveryPartnerRuntimeError("Delivery auth env is not configured");

    const parsed = parseAuthMaterial(raw);
    const result: Record<string, string> = {};
    for (const field of ref.fields) {
      const value = parsed[field];
      if (typeof value === "string" && value.trim()) result[field] = value.trim();
    }
    return result;
  },
};

export const sourceAuthMaterialResolver: DeliveryAuthMaterialResolver = {
  async resolve(ref) {
    if (ref.vaultRef.startsWith("vercel://env/")) {
      return envVaultResolver.resolve(ref);
    }

    if (ref.vaultRef.startsWith("supabase-vault://source-auth/")) {
      return resolveSourceAuthMaterialFromVault(ref);
    }

    throw new DeliveryPartnerRuntimeError("Unsupported delivery auth vault reference");
  },
};

export function createDeliveryPartnerHttpClient(provider: DeliveryConnectorProvider): DeliveryPartnerHttpClient {
  const envName = BASE_URL_ENV[provider];
  const baseUrl = process.env[envName]?.trim();
  if (!baseUrl) throw new DeliveryPartnerRuntimeError("Delivery partner base URL is not configured");

  return {
    async request<T = unknown>(request: DeliveryPartnerHttpRequest): Promise<T> {
      const url = buildUrl(baseUrl, request.path, request.query);
      const response = await fetch(url, {
        method: request.method,
        headers: {
          Accept: "application/json",
          ...(request.body ? { "Content-Type": "application/json" } : {}),
          ...request.headers,
        },
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      if (!response.ok) {
        throw new DeliveryPartnerRuntimeError(`Delivery partner request failed with ${response.status}`);
      }

      if (response.status === 204) return {} as T;
      return await response.json() as T;
    },
  };
}

export function parseEnvVaultRef(vaultRef: string): string {
  const prefix = "vercel://env/";
  if (!vaultRef.startsWith(prefix)) {
    throw new DeliveryPartnerRuntimeError("Unsupported delivery auth vault reference");
  }

  const envName = vaultRef.slice(prefix.length);
  if (!/^[A-Z0-9_]+$/.test(envName)) {
    throw new DeliveryPartnerRuntimeError("Invalid delivery auth env reference");
  }
  return envName;
}

function parseAuthMaterial(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    throw new DeliveryPartnerRuntimeError("Delivery auth env must be JSON");
  }
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | string[]>) {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}
