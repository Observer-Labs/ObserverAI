import { syncDeliveryPartnerSource, type DeliveryPartnerHttpClient, type DeliveryPartnerPersister } from "./delivery-partner-ingest";
import {
  loadDeliveryPartnerSyncPlan,
  DeliveryPartnerSyncNotFoundError,
  type DeliveryAuthMaterialResolver,
} from "./delivery-partner-sync";

export interface SyncDeliverySourceInput {
  workspaceId: string;
  sourceId: string;
  resolver: DeliveryAuthMaterialResolver;
  http: DeliveryPartnerHttpClient;
  persister?: DeliveryPartnerPersister;
  observedAt?: string;
  skipWhenAuthMissing?: boolean;
}

export type SyncDeliverySourceResult =
  | {
    status: "synced";
    provider: "getir" | "trendyol";
    sourceId: string;
    fetchedOrders: number;
    fetchedReviews: number;
    persistedOrders: number;
    persistedReviews: number;
  }
  | {
    status: "skipped";
    sourceId: string;
    reason: "missing_auth_ref";
  };

export async function syncDeliverySource(input: SyncDeliverySourceInput): Promise<SyncDeliverySourceResult> {
  try {
    const plan = await loadDeliveryPartnerSyncPlan({
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
    });
    const result = await syncDeliveryPartnerSource({
      plan,
      resolver: input.resolver,
      http: input.http,
      persister: input.persister,
      observedAt: input.observedAt,
    });

    return {
      status: "synced",
      ...result,
    };
  } catch (err) {
    if (input.skipWhenAuthMissing !== false && err instanceof DeliveryPartnerSyncNotFoundError) {
      return {
        status: "skipped",
        sourceId: input.sourceId,
        reason: "missing_auth_ref",
      };
    }
    throw err;
  }
}
