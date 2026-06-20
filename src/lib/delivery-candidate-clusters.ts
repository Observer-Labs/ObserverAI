import { getSupabaseAdmin } from "./supabase";
import type { SignalCandidate } from "./daily-signal-rules";
import type { Cluster } from "./types";

export type CandidateClusterInsert = Omit<Cluster, "id" | "created_at" | "updated_at">;

export interface PersistDeliveryCandidateClustersInput {
  candidates: SignalCandidate[];
  metricDate: string;
}

const SOURCE_BREAKDOWN_BASE: Cluster["source_breakdown"] = {
  slack: 0,
  email: 0,
  whatsapp: 0,
  zendesk: 0,
  intercom: 0,
  jira: 0,
  appstore: 0,
  googleplay: 0,
  googleanalytics: 0,
  github: 0,
  reddit: 0,
  shopify: 0,
  trustpilot: 0,
};

export function candidateKey(candidate: SignalCandidate, metricDate: string) {
  return [
    "daily",
    metricDate,
    candidate.workspaceId,
    candidate.branchId,
    candidate.sourceId ?? "none",
    candidate.platform,
    candidate.kind,
    candidate.topic,
  ].join(":");
}

export function candidateToCluster(candidate: SignalCandidate, metricDate: string): CandidateClusterInsert {
  return {
    workspace_id: candidate.workspaceId,
    branch_id: candidate.branchId,
    title: titleForCandidate(candidate),
    severity: candidate.severity,
    severity_label: candidate.severityLabel,
    confidence: confidenceForCandidate(candidate),
    evidence_count: candidate.evidenceCount,
    source_breakdown: sourceBreakdownForCandidate(candidate),
    business_case: candidate.businessImpact,
    recommended_action: recommendedActionForCandidate(candidate),
    root_cause: rootCauseForCandidate(candidate),
    customer_quote: candidate.evidence[0] ?? undefined,
    projected_impact: candidate.businessImpact,
    correlation_id: null,
    candidate_key: candidateKey(candidate, metricDate),
    status: "active",
  };
}

export async function persistDeliveryCandidateClusters(
  input: PersistDeliveryCandidateClustersInput,
): Promise<Cluster[]> {
  const rows = input.candidates.map((candidate) => candidateToCluster(candidate, input.metricDate));
  if (rows.length === 0) return [];

  const keys = rows.map((row) => row.candidate_key).filter((key): key is string => Boolean(key));
  const workspaceIds = [...new Set(rows.map((row) => row.workspace_id))];
  const branchIds = [...new Set(rows.map((row) => row.branch_id))];

  if (keys.length > 0) {
    let deleteQuery = getSupabaseAdmin()
      .from("clusters")
      .delete()
      .in("candidate_key", keys)
      .eq("status", "active");

    if (workspaceIds.length === 1) deleteQuery = deleteQuery.eq("workspace_id", workspaceIds[0]);
    if (branchIds.length === 1) deleteQuery = deleteQuery.eq("branch_id", branchIds[0]);

    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw deleteError;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("clusters")
    .insert(rows)
    .select("*");

  if (error) throw error;
  return (data ?? []) as unknown as Cluster[];
}

function titleForCandidate(candidate: SignalCandidate) {
  if (candidate.kind === "delivery_cancel_delay") return "Delivery cancellations and delay complaints spiked";
  if (candidate.kind === "sales_drop_review") return "Sales dropped alongside negative customer feedback";
  if (candidate.kind === "payment_problem") return "Payment complaints may be hurting sales";
  if (candidate.kind === "critical_topic") return "Critical customer safety issue detected";
  return "Operational issue detected";
}

function rootCauseForCandidate(candidate: SignalCandidate) {
  if (candidate.kind === "delivery_cancel_delay") return "Delivery delay complaints and cancellation rate moved together.";
  if (candidate.kind === "sales_drop_review") return `Negative reviews around ${candidate.topic} coincided with lower net sales.`;
  if (candidate.kind === "payment_problem") return "Payment-related complaints appeared alongside business impact.";
  if (candidate.kind === "critical_topic") return `Critical topic detected: ${candidate.topic}.`;
  return candidate.topic;
}

function recommendedActionForCandidate(candidate: SignalCandidate) {
  if (candidate.kind === "delivery_cancel_delay") {
    return "Check kitchen prep and packing flow for this branch before the next delivery peak.";
  }
  if (candidate.kind === "sales_drop_review") {
    return `Review branch operations tied to ${candidate.topic} and assign an owner for today's shift.`;
  }
  if (candidate.kind === "payment_problem") {
    return "Test payment terminals and delivery app payment paths, then brief the branch team.";
  }
  if (candidate.kind === "critical_topic") {
    return "Escalate to the branch manager immediately and document the customer safety response.";
  }
  return "Review the evidence and assign an owner.";
}

function confidenceForCandidate(candidate: SignalCandidate) {
  const base = candidate.suppressReason ? 0.58 : 0.72;
  const severityBoost = Math.min(0.18, candidate.severity / 500);
  const evidenceBoost = Math.min(0.08, candidate.evidenceCount / 100);
  return Number(Math.min(0.95, base + severityBoost + evidenceBoost).toFixed(2));
}

function sourceBreakdownForCandidate(candidate: SignalCandidate): Cluster["source_breakdown"] {
  return {
    ...SOURCE_BREAKDOWN_BASE,
    [candidate.platform]: candidate.evidenceCount,
  } as Cluster["source_breakdown"];
}
