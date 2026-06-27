import type { Cluster } from "./types";

export function shouldSendInitialWhatsApp(input: {
  includeDemo: boolean;
  initialAnalysisSentAt?: string;
  enabled?: boolean;
  recipientNumbers?: string[];
}) {
  return Boolean(
    !input.includeDemo &&
    !input.initialAnalysisSentAt &&
    input.enabled &&
    (input.recipientNumbers?.length ?? 0) > 0,
  );
}

export function selectTopAnalysisCluster(clusters: Cluster[]) {
  const actionClusters = clusters.filter(
    (cluster) => !cluster.candidate_key?.startsWith("general_review_summary:"),
  );
  const candidates = actionClusters.length > 0 ? actionClusters : clusters;
  return candidates.toSorted((a, b) => b.severity - a.severity)[0] ?? null;
}
